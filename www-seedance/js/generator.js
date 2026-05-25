// Seedance Studio Pro — 视频生成引擎
var ALL_HISTORY = [];

function calcGenCost(model, duration, resolution) {
  return C.VIDEO_COST(model, duration, resolution);
}

async function generate() {
  // 1. 检查登录
  if (!AUTH.token) {
    toast('请先注册/登录后再生成视频', 'error');
    showAuthModal('login');
    return;
  }
  // 2. 检查 API Key（仅 Atlas）
  if (!S.key && S.provider === 'atlas') { toast('请先在设置中配置 API Key', 'error'); toggleSettings(); return; }
  // 3. 检查提示词
  document.getElementById('errorBox').classList.remove('show');
  var prompt = document.getElementById('promptInput').value.trim();
  if (!prompt) { toast('请输入提示词', 'error'); return; }

  // 4. 计算费用并检查积分
  try { quotaData = await apiGet('/api/user/quota'); updateBalanceUI(); } catch (e) {}
  var duration = parseInt(document.getElementById('duration').value) || 5;
  var resolution = document.getElementById('resolution').value || '720p';
  var cost = calcGenCost(S.model, duration, resolution);
  var isCompare = S.compare && document.getElementById('compareToggle').checked;

  if (AUTH.balance < cost) {
    toast('积分不足！当前 ' + AUTH.balance + ' 分，本次需要 ' + cost + ' 分（' + S.model + ' ' + duration + 's ' + resolution + '）', 'error');
    setTimeout(function() { rechargeModal(); }, 500);
    return;
  }
  if (isCompare && AUTH.balance < cost * 2) { toast('对比模式需 ' + (cost * 2) + ' 积分，当前 ' + AUTH.balance + ' 分', 'error'); rechargeModal(); return; }
  S._lastCost = isCompare ? cost * 2 : cost;

  // UI 准备
  document.getElementById('progSection').classList.add('active');
  document.getElementById('resultSection').classList.remove('active');
  document.getElementById('progBar').style.width = '0%';
  document.getElementById('progPct').textContent = '0%';
  document.getElementById('progText').textContent = '准备中...';
  document.getElementById('progSpinner').style.display = 'inline-block';
  updateGenBtn('submit');
  setStat('generating');
  S.prompt = prompt;

  try {
    var modelId = C.MODELS[S.mode][S.model];
    var ratio = document.getElementById('ratio').value;
    var audio = document.getElementById('audioToggle').checked;
    var wm = document.getElementById('watermarkToggle').checked;
    var neg = document.getElementById('negativePrompt').value.trim() || undefined;
    var seed1 = document.getElementById('seedInput').value.trim();
    var motion = document.getElementById('motionIntensity').value || undefined;
    var provider = S.provider || 'atlas';


    var firstImg = null;
    if (S.mode === 'image') {
      var raw1 = document.getElementById('imgUrl1')?.value?.trim();
      if (!raw1) throw new Error('图生视频请提供首帧图片');
      firstImg = await uploadImgIfNeeded(raw1);
    }

    function buildReq(seed, dur) {
      var b = { model: modelId, prompt: prompt, duration: dur || duration, resolution: resolution, ratio: ratio, generate_audio: audio, watermark: wm, provider: provider };
      if (firstImg) b.image = firstImg;
      if (neg) b.negative_prompt = neg;
      if (seed) b.seed = parseInt(seed);
      if (motion) b.camera_motion = motion;
      return b;
    }

    if (isCompare) {
      var seed2 = document.getElementById('seedInput2').value.trim();
      var dur2 = document.getElementById('duration2').value;
      if (!seed2) seed2 = Math.floor(Math.random() * 2147483647).toString();
      var body1 = buildReq(seed1, null);
      var body2 = buildReq(seed2, dur2 || null);
      body1.compare = body2.compare = true;

      // 通过后端代理生成（积分扣减在后端完成）
      var res1 = await apiPost('/api/generate', body1);
      var id1 = res1.data?.id || res1.id;
      var res2 = await apiPost('/api/generate', body2);
      var id2 = res2.data?.id || res2.id;

      if (!id1 || !id2) throw new Error('未返回任务ID');
      S.tasks[0].id = id1; S.tasks[0].done = false;
      S.tasks[1].id = id2; S.tasks[1].done = false;
      document.getElementById('dualTask1Id').textContent = id1.slice(0, 16) + '...';
      document.getElementById('dualTask2Id').textContent = id2.slice(0, 16) + '...';
      document.getElementById('progSingle').style.display = 'none';
      document.getElementById('progDual').style.display = 'block';
      updateGenBtn('queued');
      startDualPoll(0); startDualPoll(1);
    } else {
      document.getElementById('progSingle').style.display = 'block';
      document.getElementById('progDual').style.display = 'none';

      var body = buildReq(seed1, null);
      var res = await apiPost('/api/generate', body);
      var genData = res.data || res;
      var taskId = genData.id;
      var taskProvider = genData._provider || provider;
      if (!taskId) throw new Error('API 未返回任务ID');
      S.taskId = taskId;
      S._taskProvider = taskProvider;
      document.getElementById('taskIdDisplay').textContent = '任务 ID: ' + taskId + ' (' + taskProvider + ')';
      toast('任务已提交 [' + taskProvider + ']', 'info');
      updateGenBtn('queued');
      startPoll(taskId, taskProvider);

      // 刷新积分和配额
      if (AUTH.token) {
        try { var u = await apiGet('/api/user/profile'); AUTH.balance = u.balance; updateBalanceUI(); } catch (e) {}
        loadQuota();
      }
    }
  } catch (err) {
    updateGenBtn('ready');
    document.getElementById('progSection').classList.remove('active');
    document.getElementById('progDual').style.display = 'none';
    document.getElementById('progSingle').style.display = 'block';
    setStat('ready');
    showErr(err.message);
    toast('提交失败: ' + err.message, 'error');
  }
}

function cancelGeneration() {
  if (!S.polling) return;
  S.polling = false;
  clearTimeout(S.pollTimer);
  S.tasks[0].done = true; S.tasks[1].done = true;
  clearTimeout(S.tasks[0].pollTimer); clearTimeout(S.tasks[1].pollTimer);
  document.getElementById('progSection').classList.remove('active');
  document.getElementById('progDual').style.display = 'none';
  document.getElementById('progSingle').style.display = 'block';
  updateGenBtn('ready'); setStat('ready');
  var sp = document.getElementById('progSpinner'); if (sp) sp.style.display = 'none';
  toast('已取消生成', 'info');
}

// Single Poll
function startPoll(id, provider) {
  if (S.polling) return;
  S.polling = true; S.pollStart = Date.now();
  var actualProvider = provider || 'atlas';
  var bar = document.getElementById('progBar'), st = document.getElementById('progText'),
      pct = document.getElementById('progPct'), sp = document.getElementById('progSpinner');
  (function poll() {
    if (!S.polling) return;
    // 根据 provider 选择轮询端点
    var pollPromise;
    if (actualProvider === 'atlas') {
      pollPromise = callApi(C.POLL + id, 'GET');
    } else {
      pollPromise = apiGet('/api/poll/' + actualProvider + '/' + id);
    }
    pollPromise.then(async function(data) {
      var t = data.data || data;
      var stat = t.status;
      var el = Date.now() - S.pollStart;
      var es = Math.floor(el / 1000);
      var estr = (es >= 60 ? Math.floor(es / 60) + '分' : '') + (es % 60) + '秒';
      var p = 0, txt = '';
      switch (stat) {
        case 'queued': case 'pending': p = 5; txt = '排队中'; updateGenBtn('queued'); break;
        case 'processing': case 'running': case 'in_progress': p = Math.min(15 + Math.floor(el / 2000), 90); txt = '生成中 (' + estr + ')'; updateGenBtn('processing'); break;
        case 'completed': case 'succeeded': case 'done': p = 100; txt = '✅ 完成！'; break;
        case 'failed': case 'error': p = 0; txt = '失败'; break;
        default: p = 10; txt = stat + ' (' + estr + ')';
      }
      bar.style.width = p + '%'; pct.textContent = p + '%';
      if (txt) st.textContent = txt;
      if (['completed', 'succeeded', 'done'].includes(stat)) {
        S.polling = false; sp.style.display = 'none';
        var outs = t.outputs || t.video_urls || [];
        var url = outs[0] || t.video_url || t.url || t.result?.video_url;
        if (url) { showResult(url); S.videoUrl = url; }
        updateGenBtn('done');
        setStat('ready');
        // 保存历史
        if (AUTH.token && url) {
          try { await apiPost('/api/history', { mode: S.mode, prompt: S.prompt, videoUrl: url, status: 'done', cost: S._lastCost || 36 }); } catch (e) {}
          loadHist();
        }
      } else if (['failed', 'error'].includes(stat)) {
        S.polling = false; sp.style.display = 'none';
        updateGenBtn('ready'); setStat('ready');
        var em = t.error || t.message || '生成失败';
        showErr(em); toast('生成失败: ' + friendlyErr(em), 'error');
        if (AUTH.token) {
          try { await apiPost('/api/history', { mode: S.mode, prompt: S.prompt, videoUrl: '', status: 'fail', cost: S._lastCost || 36 }); } catch (e) {}
          loadHist();
        }
      }
      if (el > C.MAX_POLL) { S.polling = false; sp.style.display = 'none'; updateGenBtn('ready'); toast('轮询超时，任务可能仍在处理中', 'error'); }
      if (S.polling) S.pollTimer = setTimeout(poll, C.POLL_INTERVAL);
    }).catch(function(err) { S.polling = false; updateGenBtn('ready'); toast('轮询失败', 'error'); });
  })();
}

// Dual Poll
function startDualPoll(idx) {
  var t = S.tasks[idx];
  var actualProvider = S._taskProvider || 'atlas';
  (function poll() {
    if (t.done) return;
    var pollPromise = actualProvider === 'atlas'
      ? callApi(C.POLL + t.id, 'GET')
      : apiGet('/api/poll/' + actualProvider + '/' + t.id);
    pollPromise.then(function(data) {
      var stat = (data.data || data).status;
      var p = 0;
      switch (stat) { case 'queued': case 'pending': p = 5; break; case 'processing': case 'running': p = 60; break; case 'completed': case 'succeeded': p = 100; break; case 'failed': p = 0; break; default: p = 10; }
      document.getElementById('progBar' + (idx + 1)).style.width = p + '%';
      document.getElementById('dualPct' + (idx + 1)).textContent = p + '%';
      document.getElementById('dualStatus' + (idx + 1)).textContent = stat || '';
      if (['completed', 'succeeded', 'done'].includes(stat)) {
        t.done = true; t.url = (data.data || data).outputs?.[0] || (data.data || data).video_url || '';
        checkDualDone();
      } else if (['failed', 'error'].includes(stat)) { t.done = true; checkDualDone(); }
      if (!t.done) t.pollTimer = setTimeout(poll, C.POLL_INTERVAL);
    });
  })();
}

function checkDualDone() {
  if (S.tasks[0].done && S.tasks[1].done) {
    setStat('ready'); updateGenBtn('done');
    showDualResult(S.tasks[0].url, S.tasks[1].url);
    if (AUTH.token) {
      apiPost('/api/history', { mode: S.mode, prompt: S.prompt, videoUrl: S.tasks[0].url + '|' + S.tasks[1].url, status: 'done', cost: S._lastCost || 72 }).catch(function() {});
      loadHist();
    }
  }
}

// Results
function showResult(url) {
  var vs = document.getElementById('resultSection');
  vs.classList.add('active');
  document.getElementById('resultVideo').src = url;
  document.getElementById('compareResult').style.display = 'none';
  var vp = document.querySelector('.video-player');
  if (vp) vp.style.display = '';
}

function showDualResult(url1, url2) {
  var vs = document.getElementById('resultSection');
  vs.classList.add('active');
  var vp = document.querySelector('.video-player');
  if (vp) vp.style.display = 'none';
  var cr = document.getElementById('compareResult');
  cr.style.display = 'grid';
  cr.innerHTML = '<div><div class="compare-label">版本 1</div><div class="video-wrapper"><video controls playsinline src="' + url1 + '"></video></div></div>'
    + '<div><div class="compare-label">版本 2</div><div class="video-wrapper"><video controls playsinline src="' + url2 + '"></video></div></div>';
}

function showResultOverlay() {
  var url = S.videoUrl || (S.tasks[0].url) || document.getElementById('resultVideo').src;
  if (!url) return;
  document.getElementById('roVideo').src = url;
  document.getElementById('roPrompt').textContent = S.prompt;
  document.getElementById('resultOverlay').classList.add('open');
}

function closeResultOverlay() {
  document.getElementById('resultOverlay').classList.remove('open');
  document.getElementById('roVideo').src = '';
}

// History
async function loadHist() {
  if (!AUTH.token) return;
  _histPage = 10;
  try {
    var hist = await apiGet('/api/history');
    ALL_HISTORY = hist;
    renderHistoryList(hist);
  } catch (e) { /* ignore */ }
}

var _histPage = 10;

function renderHistoryList(hist) {
  var list = document.getElementById('historyList');
  if (!list) return;
  var items = hist.slice(0, _histPage);
  if (items.length === 0) {
    list.innerHTML = '<div class="history-empty"><div class="empty-icon">📭</div><p>暂无生成记录</p></div>';
    return;
  }
  var html = '';
  for (var i = 0; i < items.length; i++) {
    var h = items[i];
    var thumbHtml = h.videoUrl ? '<video src="' + h.videoUrl + '" muted preload="metadata" playsinline></video>' : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:16px;">🎬</div>';
    html += '<div class="history-item"><div class="h-thumb" onclick="playHistVideo(\'' + escHtml(h.videoUrl || '') + '\')">' + thumbHtml + '<div class="h-play">▶</div></div>'
      + '<div class="h-info" onclick="playHistVideo(\'' + escHtml(h.videoUrl || '') + '\')"><div class="h-prompt">' + escHtml(h.prompt || '(无提示词)') + '</div>'
      + '<div class="h-meta"><span>' + (h.mode || 'text') + '</span><span>' + (h.cost || 36) + '分</span>'
      + (h.createdAt ? '<span>' + new Date(h.createdAt).toLocaleDateString('zh-CN') + '</span>' : '') + '</div></div>'
      + '<span class="h-badge ' + (h.status === 'done' ? 'done' : 'fail') + '">' + (h.status === 'done' ? '完成' : '失败') + '</span>'
      + '<button class="h-copy-btn" title="复制提示词" onclick="event.stopPropagation();copyHistPrompt(\'' + escHtml(h.prompt || '') + '\')">📋</button></div>';
  }
  if (hist.length > _histPage) {
    html += '<div style="text-align:center;padding:8px;"><button class="btn btn-xs btn-link" onclick="_histPage+=10;renderHistoryList(ALL_HISTORY);">显示更多 (' + (hist.length - _histPage) + ' 条剩余)</button></div>';
  }
  list.innerHTML = html;
}

function copyHistPrompt(prompt) {
  if (!prompt) return;
  navigator.clipboard.writeText(prompt).then(function() { toast('提示词已复制', 'success'); }).catch(function() { toast('复制失败', 'error'); });
}

function playHistVideo(url) {
  if (!url) return;
  document.getElementById('resultVideo').src = url;
  document.getElementById('resultSection').classList.add('active');
  var vp = document.querySelector('.video-player');
  if (vp) vp.style.display = '';
  document.getElementById('compareResult').style.display = 'none';
  document.getElementById('resultSection').scrollIntoView({ behavior: 'smooth' });
}

// Modal
function showWorksModal() {
  var grid = document.getElementById('worksGrid');
  if (!grid) return;
  var html = '';
  for (var i = 0; i < ALL_HISTORY.length; i++) {
    var h = ALL_HISTORY[i];
    html += '<div class="work-card"><video src="' + (h.videoUrl || '') + '" muted preload="metadata" playsinline></video>'
      + '<div class="work-info"><div class="w-prompt">' + escHtml(h.prompt || '') + '</div><div class="w-meta">' + (h.createdAt ? new Date(h.createdAt).toLocaleString('zh-CN') : '') + '</div></div>'
      + '<div class="work-actions"><button class="btn btn-xs" onclick="playHistVideo(\'' + escHtml(h.videoUrl || '') + '\');closeWorksModal();">▶ 播放</button></div></div>';
  }
  if (!html) html = '<div style="text-align:center;padding:24px;color:var(--text-secondary);">暂无作品</div>';
  grid.innerHTML = html;
  document.getElementById('worksModal').classList.add('open');
}

function closeWorksModal() { document.getElementById('worksModal').classList.remove('open'); }

function filterWorks() {
  var q = (document.getElementById('worksSearch')?.value || '').toLowerCase();
  var grid = document.getElementById('worksGrid');
  if (!grid) return;
  var cards = grid.querySelectorAll('.work-card');
  for (var i = 0; i < cards.length; i++) {
    var prompt = (cards[i].querySelector('.w-prompt')?.textContent || '').toLowerCase();
    cards[i].style.display = !q || prompt.includes(q) ? '' : 'none';
  }
}

async function downloadVideo() {
  var url = document.getElementById('resultVideo').src || S.videoUrl;
  if (!url) return;
  try {
    toast('正在下载...', 'info');
    var r = await fetch(url);
    if (!r.ok) throw new Error('fetch failed');
    var blob = await r.blob();
    var blobUrl = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = blobUrl; a.download = 'seedance-video.mp4';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(blobUrl);
    toast('下载完成', 'success');
  } catch (e) {
    window.open(url, '_blank');
    toast('已在新窗口打开，右键视频选择"另存为"', 'info');
  }
}

function copyVideoLink() {
  var url = document.getElementById('resultVideo').src || S.videoUrl;
  if (url) { navigator.clipboard.writeText(url).then(function() { toast('链接已复制', 'success'); }).catch(function() { prompt('复制以下链接:', url); }); }
}

// Image upload
async function uploadImgIfNeeded(dataUrl) {
  if (!dataUrl) return null;
  if (dataUrl.startsWith('http://') || dataUrl.startsWith('https://')) return dataUrl;
  if (dataUrl.startsWith('data:image')) {
    if (!C.UPLOAD) throw new Error('本地图片需通过本地服务器上传');
    toast('正在上传图片...', 'info');
    var r = await fetch(C.UPLOAD, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: dataUrl.split(',')[1] }) });
    if (!r.ok) throw new Error('图片上传失败');
    var d = await r.json();
    return d.url;
  }
  return dataUrl;
}

function handleFile(e, idx) {
  var f = e.target.files[0]; if (!f) return;
  var reader = new FileReader();
  reader.onload = function(ev) { document.getElementById('imgUrl' + idx).value = ev.target.result; renderImgCard(idx, ev.target.result); };
  reader.readAsDataURL(f);
}

function handleUrl(e, idx) {
  var v = e.target.value.trim();
  if (v) renderImgCard(idx, v); else clearImg(idx);
}

function renderImgCard(idx, src) {
  var container = document.getElementById('imgCards');
  if (!container) return;
  var dropzone = document.getElementById('imgDropzone1');
  if (dropzone) dropzone.style.display = 'none';
  var existing = container.querySelector('.image-card[data-idx="' + idx + '"]');
  if (existing) existing.remove();
  var card = document.createElement('div');
  card.className = 'image-card'; card.setAttribute('data-idx', idx);
  card.innerHTML = '<img src="' + src + '" alt="preview"><button class="img-del" onclick="clearImg(' + idx + ')">✕</button><span class="img-label">' + (idx === 1 ? '首帧' : '结束帧') + '</span>';
  container.appendChild(card);
  S['img' + idx] = src;
}

function clearImg(idx) {
  S['img' + idx] = null;
  document.getElementById('imgUrl' + idx).value = '';
  document.getElementById('imgFile' + idx).value = '';
  var container = document.getElementById('imgCards');
  if (container) { var card = container.querySelector('.image-card[data-idx="' + idx + '"]'); if (card) card.remove(); }
  var dropzone = document.getElementById('imgDropzone1');
  if (dropzone) dropzone.style.display = 'flex';
}

// Mode / Model / Compare
function switchMode(el, m) {
  document.querySelectorAll('.mode-tab').forEach(function(p) { p.classList.remove('active'); });
  el.classList.add('active'); S.mode = m;
  document.getElementById('imageGroup').style.display = m === 'image' ? 'block' : 'none';
  document.getElementById('templateQuickBar').style.display = m === 'image' ? '' : '';
  document.getElementById('genBtn').style.display = '';
}

function pickModel(el, m) {
  document.querySelectorAll('#qualitySegments .segment').forEach(function(p) { p.classList.remove('active'); });
  el.classList.add('active'); S.model = m; updateCost();
}

function toggleCompare() {
  S.compare = document.getElementById('compareToggle').checked;
  document.getElementById('comparePanel').style.display = S.compare ? 'block' : 'none';
  updateCost();
}

function randSeed() { document.getElementById('seedInput').value = Math.floor(Math.random() * 2147483647); }

function fillPrompt(text) {
  document.getElementById('promptInput').value = text;
  document.getElementById('charCount').textContent = text.length;
  document.getElementById('promptInput').focus();
  window.scrollTo({ top: document.getElementById('promptInput').getBoundingClientRect().top + window.scrollY - 140, behavior: 'smooth' });
  toast('已填入提示词', 'info');
}

function updateCost() {
  var duration = parseInt(document.getElementById('duration')?.value) || 5;
  var resolution = document.getElementById('resolution')?.value || '720p';
  var credits = calcGenCost(S.model, duration, resolution);
  var isCompare = S.compare && document.getElementById('compareToggle')?.checked;
  var total = isCompare ? credits * 2 : credits;

  // 生成按钮
  var cn = document.getElementById('costNum');
  if (cn) cn.textContent = total + ' 积分';

  // 单价
  var priceEl = document.getElementById('qualityPrice');
  if (priceEl) {
    var rate = resolution === '1080p' ? 12 : 6;
    priceEl.innerHTML = '<span class="price-num">' + credits + '</span> 积分/次'
      + ' <span class="price-tier ' + (resolution==='720p'?'tier-standard':'tier-premium') + '">' + rate + '分/秒</span>';
  }

  // 明细
  var detailEl = document.getElementById('costDetail');
  if (detailEl) {
    detailEl.textContent = duration + '秒 · ' + resolution + ' · ' + (S.model==='standard'?'Pro':'Fast');
    if (isCompare) detailEl.textContent += ' · 对比×2';
  }

  // 余额预估
  var countEl = document.getElementById('remainCount');
  if (countEl && AUTH.balance >= 0 && total > 0) {
    var n = Math.floor(AUTH.balance / total);
    countEl.textContent = '余额还可生成 ' + n + ' 次（此配置）';
  }
}

function updateGenBtn(state) {
  var btn = document.getElementById('genBtn');
  if (!btn) return;
  btn.onclick = null; btn.disabled = false;
  btn.className = 'generate-btn';
  if (state === 'ready' && !S.key && S.provider === 'atlas') {
    btn.innerHTML = '<span class="gen-btn-icon">🔒</span><span class="gen-btn-text">请先配置 API 密钥</span>';
    btn.className += ' nokey';
    btn.onclick = function() { toggleSettings(); };
    return;
  }
  switch (state) {
    case 'submit': btn.innerHTML = '<span class="spinner-btn"></span> 正在提交...'; btn.className += ' processing'; btn.disabled = true; break;
    case 'queued': btn.innerHTML = '<span class="spinner-btn"></span> 排队中...'; btn.className += ' queued'; btn.disabled = true; break;
    case 'processing': btn.innerHTML = '<span class="spinner-btn"></span> 生成中...'; btn.className += ' processing'; btn.disabled = true; break;
    case 'done': btn.innerHTML = '<span class="gen-btn-icon">✅</span><span class="gen-btn-text">完成！查看结果</span>'; btn.className += ' done'; btn.onclick = function() { document.getElementById('resultSection').scrollIntoView({ behavior: 'smooth' }); }; break;
    default: btn.innerHTML = '<span class="gen-btn-icon">🚀</span><span class="gen-btn-text">开始生成视频</span><span class="gen-btn-cost">消耗 <span id="costNum">30 积分</span></span>'; btn.onclick = generate;
  }
}

function saveKey() {
  var k = document.getElementById('apiKeyInput')?.value?.trim();
  if (k) {
    S.key = k;
    try { localStorage.setItem(SK.API_KEY, JSON.stringify({ key: k, updatedAt: Date.now() })); } catch(e) {}
    setKeyStat(true);
    updateGenBtn('ready');
    toast('API Key 已保存', 'success');
    setTimeout(function() { closeSettings(); }, 800);
  } else { S.key = ''; setKeyStat(false); toast('请输入有效的 API Key', 'error'); }
}

// Provider 选择
function pickProvider(el, provider) {
  document.querySelectorAll('.model-option').forEach(function(p) { p.classList.remove('active'); });
  el.classList.add('active');
  S.provider = provider;
  updateProviderBadge(provider);
  // 更新侧边栏徽章
  var badge = document.getElementById('sidebarProviderBadge');
  if (badge) { var names = { atlas: 'Atlas', kling: '可灵', wanxiang: '万相', auto: '自动' }; badge.textContent = names[provider] || 'Atlas'; }
  // Atlas 需要用户填 Key，提示去设置页面
  if (provider === 'atlas' && !S.key) {
    var inp = document.getElementById('apiKeyInput');
    if (inp) inp.placeholder = '粘贴你的 Atlas Cloud API Key';
  }
  updateGenBtn('ready');
}

// 商品抓取
async function scrapeProduct() {
  var url = document.getElementById('productUrl')?.value?.trim();
  if (!url) { toast('请输入商品链接', 'error'); return; }
  var resultDiv = document.getElementById('scrapeResult');
  if (resultDiv) { resultDiv.style.display = 'block'; resultDiv.innerHTML = '<span style="color:var(--text-secondary);">⏳ 正在抓取商品信息...</span>'; }
  try {
    var info = await apiPost('/api/scrape-product', { url: url });
    if (resultDiv) {
      var autoTag = info.autoFilled ? ' ✅ 自动提取' : ' ⚠️ 需手动补充';
      resultDiv.innerHTML = '<div style="display:flex;gap:10px;align-items:flex-start;">'
        + (info.image ? '<img src="' + info.image + '" style="width:80px;height:80px;object-fit:cover;border-radius:8px;" onerror="this.style.display=\'none\'">' : '')
        + '<div style="flex:1;"><strong>' + escHtml(info.title || '未知商品') + '</strong>'
        + '<div style="color:var(--text-secondary);margin-top:4px;">📌 ' + escHtml(info.platform) + autoTag + '</div>'
        + (info.description ? '<div style="color:var(--text-secondary);margin-top:2px;font-size:11px;">' + escHtml(info.description.slice(0, 200)) + '</div>' : '')
        + (info.price ? '<div style="color:var(--success);margin-top:2px;">💰 ' + escHtml(info.price) + '</div>' : '')
        + '<button class="btn btn-xs btn-primary" style="margin-top:6px;" onclick="useScrapedData()">📋 填入模板</button></div></div>';
      window._scrapedData = { title: info.title, platform: info.platform, autoFilled: info.autoFilled };
      if (info.autoFilled) { toast('商品信息提取成功', 'success'); }
      else { toast('需要手动补充商品信息', 'info'); }
    }
  } catch (e) {
    if (resultDiv) { resultDiv.style.display = 'block'; resultDiv.innerHTML = '<span style="color:var(--error);">抓取失败: ' + e.message + '</span>'; }
  }
}

function useScrapedData() {
  var d = window._scrapedData;
  if (!d) return;
  var resultDiv = document.getElementById('scrapeResult');
  if (!resultDiv) return;
  var name = d.title || '';
  var html = '<div style="margin-top:10px;border-top:1px solid var(--border-light);padding-top:10px;">'
    + '<label style="font-size:12px;color:var(--text-secondary);">产品名称</label>'
    + '<input type="text" id="scrapeProductName" value="' + escHtml(name) + '" style="margin:4px 0 8px;font-size:13px;" oninput="updateScrapeScripts()">'
    + '<label style="font-size:12px;color:var(--text-secondary);">产品卖点 <span class="label-hint">可选</span></label>'
    + '<input type="text" id="scrapeSellingPoints" placeholder="例如：限时特价、买二送一" style="margin:4px 0 8px;font-size:13px;" oninput="updateScrapeScripts()">'
    + '<label style="font-size:12px;color:var(--text-secondary);margin-top:4px;">选择脚本风格</label>'
    + '<div class="script-style-grid" id="scriptStyleGrid"></div>'
    + '<div style="display:flex;gap:8px;margin-top:10px;">'
    + '<button class="btn btn-secondary btn-small" onclick="document.getElementById(\'scrapeResult\').style.display=\'none\'">取消</button>'
    + '<button class="btn btn-primary btn-small" onclick="confirmScrapedData()">📋 填入生成器</button></div></div>';
  resultDiv.innerHTML += html;
  updateScrapeScripts();
}

function updateScrapeScripts() {
  var name = document.getElementById('scrapeProductName')?.value?.trim() || '产品';
  var sp = document.getElementById('scrapeSellingPoints')?.value?.trim() || '品质保证，值得信赖';
  var grid = document.getElementById('scriptStyleGrid');
  if (!grid) return;
  var styles = [
    { id: 'grass', icon: '🌿', name: '种草型', desc: '生活方式场景，温暖色调，自然光线，舒适放松的电影感', prompt: '生活方式场景视频，' + name + '融入日常使用场景中，温暖色调，自然光线透过窗户，舒适放松的氛围，电影感画面。' + sp },
    { id: 'hard', icon: '📢', name: '硬广型', desc: '专业展示，柔和灯光，微距推进，4K画质，细节清晰', prompt: '专业商品展示视频，' + name + '在纯色背景下优雅展示，柔和摄影棚灯光，产品细节清晰可见，微距镜头缓慢推进，4K画质。' + sp },
    { id: 'story', icon: '🎭', name: '剧情型', desc: '问题→解决方案叙事，真实场景对比，情感共鸣，品牌故事', prompt: '短视频剧情广告，主角遇到' + name + '之前的问题场景，使用后问题完美解决，前后对比效果惊人，真实情感共鸣，品牌故事叙述。' + sp }
  ];
  var html = '';
  for (var i = 0; i < styles.length; i++) {
    var s = styles[i];
    var isActive = window._scrapeActiveStyle === s.id || (!window._scrapeActiveStyle && i === 0);
    html += '<div class="script-style-card' + (isActive ? ' active' : '') + '" data-style="' + s.id + '" onclick="pickScrapeStyle(\'' + s.id + '\')">'
      + '<span class="ssc-icon">' + s.icon + '</span>'
      + '<div class="ssc-name">' + s.name + '</div>'
      + '<div class="ssc-desc">' + s.desc + '</div>'
      + '<div class="ssc-preview">' + escHtml(s.prompt.slice(0, 60)) + '...</div>'
      + '</div>';
  }
  grid.innerHTML = html;
  if (!window._scrapeActiveStyle) window._scrapeActiveStyle = 'grass';
}

function pickScrapeStyle(styleId) {
  window._scrapeActiveStyle = styleId;
  document.querySelectorAll('.script-style-card').forEach(function(c) { c.classList.toggle('active', c.getAttribute('data-style') === styleId); });
}

function confirmScrapedData() {
  var name = document.getElementById('scrapeProductName')?.value?.trim();
  if (!name) { toast('请输入产品名称', 'error'); return; }
  var sp = document.getElementById('scrapeSellingPoints')?.value?.trim() || '品质保证，值得信赖';
  var style = window._scrapeActiveStyle || 'grass';
  var prompts = {
    grass: '生活方式场景视频，' + name + '融入日常使用场景中，温暖色调，自然光线透过窗户，舒适放松的氛围，电影感画面。' + sp,
    hard: '专业商品展示视频，' + name + '在纯色背景下优雅展示，柔和摄影棚灯光，产品细节清晰可见，微距镜头缓慢推进，4K画质。' + sp,
    story: '短视频剧情广告，主角遇到' + name + '之前的问题场景，使用后问题完美解决，前后对比效果惊人，真实情感共鸣，品牌故事叙述。' + sp
  };
  fillPrompt(prompts[style]);
  document.getElementById('scrapeResult').style.display = 'none';
  window._scrapeActiveStyle = null;
  toast('已填入「' + ({ grass: '种草型', hard: '硬广型', story: '剧情型' })[style] + '」脚本', 'success');
}

function setupDragDrop() {
  var dz = document.getElementById('imgDropzone1');
  if (!dz) return;
  dz.addEventListener('dragover', function(e) { e.preventDefault(); dz.style.borderColor = 'var(--accent)'; });
  dz.addEventListener('dragleave', function(e) { dz.style.borderColor = ''; });
  dz.addEventListener('drop', function(e) {
    e.preventDefault(); dz.style.borderColor = '';
    var f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) { document.getElementById('imgFile1').files = e.dataTransfer.files; handleFile({ target: { files: [f] } }, 1); }
  });
}

// ==================== 视频后处理 ====================
var _ppRatio = '';
var _ppProcessing = false;

function showPostProcessPanel() {
  var v = document.getElementById('resultVideo');
  if (!v || !v.src) { toast('请先生成视频', 'error'); return; }
  S._ppVideoUrl = v.src;
  document.getElementById('postProcessModal').classList.add('open');
  document.getElementById('ppTrimStart').value = 0;
  document.getElementById('ppTrimDur').value = 0;
  document.getElementById('ppBgm').value = 'none';
  document.getElementById('ppWatermark').checked = false;
  document.getElementById('ppProgress').style.display = 'none';
  document.getElementById('ppSubmitBtn').disabled = false;
  _ppRatio = '';
  document.querySelectorAll('.pp-size-btn').forEach(function(b) { b.classList.toggle('active', b.getAttribute('data-ratio') === ''); });
}

function closePostProcessModal() {
  if (_ppProcessing) return;
  document.getElementById('postProcessModal').classList.remove('open');
}

function pickPPSize(el, ratio) {
  _ppRatio = ratio;
  document.querySelectorAll('.pp-size-btn').forEach(function(b) { b.classList.remove('active'); });
  el.classList.add('active');
}

function previewBgm() {
  // BGM preview is server-side; just show the selection
}

async function applyPostProcess() {
  if (_ppProcessing) return;
  var ops = [];
  var trimStart = parseFloat(document.getElementById('ppTrimStart').value) || 0;
  var trimDur = parseFloat(document.getElementById('ppTrimDur').value) || 0;
  if (trimDur > 0) ops.push({ type: 'trim', params: { start: trimStart, duration: trimDur } });
  if (_ppRatio) ops.push({ type: 'resize', params: { ratio: _ppRatio } });
  if (document.getElementById('ppWatermark').checked) ops.push({ type: 'watermark', params: {} });
  if (ops.length === 0) { toast('请选择至少一个处理操作', 'error'); return; }

  _ppProcessing = true;
  document.getElementById('ppProgress').style.display = 'block';
  document.getElementById('ppSubmitBtn').disabled = true;
  document.getElementById('ppSubmitBtn').textContent = '⏳ 处理中...';

  try {
    var res = await apiPost('/api/video/post-process', { videoUrl: S._ppVideoUrl, operations: ops });
    await pollPostProcess(res.taskId);
  } catch (e) {
    toast('后处理失败: ' + e.message, 'error');
    _ppProcessing = false;
    document.getElementById('ppSubmitBtn').disabled = false;
    document.getElementById('ppSubmitBtn').textContent = '⚡ 开始处理';
    document.getElementById('ppProgress').style.display = 'none';
  }
}

async function pollPostProcess(taskId) {
  for (var i = 0; i < 60; i++) {
    await new Promise(function(r) { setTimeout(r, 2000); });
    try {
      var data = await apiGet('/api/video/post-process/' + taskId);
      document.getElementById('ppProgBar').style.width = (data.progress || 50) + '%';
      document.getElementById('ppProgText').textContent = data.status === 'completed' ? '处理完成' : '处理中...';
      if (data.status === 'completed') {
        var v = document.getElementById('resultVideo');
        if (v && data.videoUrl) { v.src = data.videoUrl; v.load(); }
        closePostProcessModal();
        toast('视频后处理完成', 'success');
        _ppProcessing = false;
        document.getElementById('ppSubmitBtn').disabled = false;
        document.getElementById('ppSubmitBtn').textContent = '⚡ 开始处理';
        document.getElementById('ppProgress').style.display = 'none';
        return;
      }
      if (data.status === 'failed') { throw new Error(data.error || '处理失败'); }
    } catch (e) { throw e; }
  }
  throw new Error('处理超时');
}
