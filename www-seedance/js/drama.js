// Seedance Studio Pro — 短剧工作台 (Drama Workbench)
function dramaInit() {
  DR.scenes = [{ id: 1, desc: '', chars: [], tpl: '' }];
  DR.results = [];
  DR.generating = false;
  if (!DR.chars.length) {
    DR.chars = [
      { id: 1, name: '主角A', avatar: '🧑', desc: '勇敢果断' },
      { id: 2, name: '主角B', avatar: '👩', desc: '聪明机智' }
    ];
    DR.charIdCounter = 3;
  }
  if (!DR.tpls.length) {
    DR.tpls = [
      { id: 'romance', name: '浪漫相遇', icon: '💕' },
      { id: 'conflict', name: '意外冲突', icon: '⚡' },
      { id: 'mystery', name: '悬疑解密', icon: '🔍' },
      { id: 'comedy', name: '喜剧日常', icon: '😄' }
    ];
  }
  dramaRenderAll();
}

function dramaAddScene() {
  DR.scenes.push({ id: ++DR.charIdCounter, desc: '', chars: [], tpl: '' });
  dramaRenderAll();
}

function dramaRemoveScene(id) {
  if (DR.scenes.length <= 1) { toast('至少保留一个场景', 'info'); return; }
  DR.scenes = DR.scenes.filter(function(s) { return s.id !== id; });
  dramaRenderAll();
}

function dramaMoveScene(id, dir) {
  var idx = DR.scenes.findIndex(function(s) { return s.id === id; });
  if (idx < 0 || (dir === -1 && idx === 0) || (dir === 1 && idx === DR.scenes.length - 1)) return;
  var tmp = DR.scenes[idx]; DR.scenes[idx] = DR.scenes[idx + dir]; DR.scenes[idx + dir] = tmp;
  dramaRenderAll();
}

function dramaUpdateScene(id, field, value) {
  var s = DR.scenes.find(function(s) { return s.id === id; });
  if (s) s[field] = value;
}

function dramaToggleChar(sceneId, charId, checked) {
  var s = DR.scenes.find(function(s) { return s.id === sceneId; });
  if (!s) return;
  if (checked) { if (!s.chars.includes(charId)) s.chars.push(charId); }
  else { s.chars = s.chars.filter(function(c) { return c !== charId; }); }
}

function dramaApplyTpl(sceneId, tplId) {
  var s = DR.scenes.find(function(s) { return s.id === sceneId; });
  if (!s) return;
  var tpl = DR.tpls.find(function(t) { return t.id === tplId; });
  if (tpl) s.tpl = tplId;
}

function dramaAddChar() {
  var name = prompt('角色名称:', '新角色');
  if (!name) return;
  var avatar = prompt('头像/emoji:', '👤');
  DR.chars.push({ id: DR.charIdCounter++, name: name, avatar: avatar || '👤', desc: '' });
  dramaRenderAll();
}

function dramaDelChar(id) {
  DR.chars = DR.chars.filter(function(c) { return c.id !== id; });
  DR.scenes.forEach(function(s) { s.chars = s.chars.filter(function(c) { return c !== id; }); });
  dramaRenderAll();
}

async function dramaBatchGen() {
  if (DR.generating) return;
  if (!AUTH.token) { toast('请先注册/登录后再生成视频', 'error'); showAuthModal('login'); return; }
  if (!S.key && S.provider === 'atlas') { toast('请先在设置中配置 API Key', 'error'); toggleSettings(); return; }
  var invalid = DR.scenes.filter(function(s) { return !s.desc.trim(); });
  if (invalid.length) { toast('请填写所有场景描述', 'error'); return; }
  var duration = parseInt(document.getElementById('duration')?.value) || 5;
  var resolution = document.getElementById('resolution')?.value || '720p';
  var perSceneCost = typeof calcGenCost === 'function' ? calcGenCost(S.model, duration, resolution) : 1;
  var totalCost = DR.scenes.length * perSceneCost;
  if (AUTH.balance < 1) { toast('积分不足，请先充值', 'error'); rechargeModal(); return; }
  if (AUTH.balance < totalCost) { toast('积分不足！' + DR.scenes.length + '个场景共计需要 ' + totalCost + ' 分（' + perSceneCost + '分/场景）', 'error'); return; }

  DR.generating = true; DR.results = [];
  dramaRenderAll();
  toast('开始批量生成 ' + DR.scenes.length + ' 个场景（' + perSceneCost + '分/场景，共' + totalCost + '分）...', 'info');

  for (var i = 0; i < DR.scenes.length; i++) {
    var scene = DR.scenes[i];
    try {
      var provider = S.provider || 'atlas';
      var body = { model: C.MODELS.text[S.model], prompt: scene.desc, duration: duration, resolution: resolution, ratio: '9:16', generate_audio: true, watermark: false, provider: provider };
      var res = await apiPost('/api/generate', body);
      var genData = res.data || res;
      var taskId = genData.id;
      var taskProvider = genData._provider || provider;
      if (taskId) {
        var videoUrl = await pollDramaTask(taskId, taskProvider);
        DR.results.push({ sceneId: scene.id, url: videoUrl, label: '场景 ' + (i + 1) });
      }
    } catch (e) {
      toast('场景 ' + (i + 1) + ' 生成失败: ' + e.message, 'error');
      DR.results.push({ sceneId: scene.id, url: '', label: '场景 ' + (i + 1) + ' (失败)' });
    }
    dramaRenderAll();
    // 刷新积分
    if (AUTH.token) { try { var u = await apiGet('/api/user/profile'); AUTH.balance = u.balance; updateBalanceUI(); } catch (e) {} }
  }
  DR.generating = false;
  dramaRenderAll();
  toast('批量生成完成！', 'success');
}

function pollDramaTask(taskId, provider) {
  var actualProvider = provider || 'atlas';
  return new Promise(function(resolve, reject) {
    var start = Date.now();
    (function poll() {
      var pollPromise = actualProvider === 'atlas'
        ? callApi(C.POLL + taskId, 'GET')
        : apiGet('/api/poll/' + actualProvider + '/' + taskId);
      pollPromise.then(function(data) {
        var t = data.data || data;
        var stat = t.status;
        if (['completed', 'succeeded', 'done'].includes(stat)) {
          var url = t.outputs?.[0] || t.video_url || t.url || '';
          resolve(url);
        } else if (['failed', 'error'].includes(stat)) {
          reject(new Error(t.error || t.message || '生成失败'));
        } else if (Date.now() - start > C.MAX_POLL) {
          reject(new Error('超时'));
        } else {
          setTimeout(poll, C.POLL_INTERVAL);
        }
      }).catch(reject);
    })();
  });
}

function dramaRenderAll() {
  // 简化渲染 - 显示场景列表和角色库
  var section = document.getElementById('dramaSection');
  if (!section || S.mode !== 'drama') return;

  var html = '<div class="drama-toolbar"><span style="font-size:13px;font-weight:600;">📋 场景列表 (' + DR.scenes.length + ')</span>';
  html += '<button class="btn btn-xs btn-secondary" onclick="dramaAddScene()">+ 添加场景</button>';
  if (!DR.generating) html += '<button class="btn btn-primary btn-small" onclick="dramaBatchGen()" style="margin-left:auto;">🎬 批量生成 (' + DR.scenes.length * 36 + '分)</button>';
  else html += '<span style="margin-left:auto;color:var(--warning);">⏳ 生成中...</span>';
  html += '</div>';

  // 角色库
  html += '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;">👥 角色库</div>';
  html += '<div class="drama-char-grid">';
  for (var i = 0; i < DR.chars.length; i++) {
    var c = DR.chars[i];
    html += '<div class="drama-char-card"><span class="avatar">' + c.avatar + '</span><div class="name">' + escHtml(c.name) + '</div><div class="desc">' + escHtml(c.desc || '') + '</div><button class="del-char" onclick="event.stopPropagation();dramaDelChar(' + c.id + ')" style="display:flex;">✕</button></div>';
  }
  html += '<div class="drama-char-add" onclick="dramaAddChar()">+ 添加角色</div></div>';

  // 场景列表
  html += '<div class="drama-scene-list">';
  for (var j = 0; j < DR.scenes.length; j++) {
    var s = DR.scenes[j];
    html += '<div class="drama-scene-card"><div class="drama-scene-header"><span class="num">场景 ' + (j + 1) + '</span><div class="drama-scene-actions">';
    html += '<button onclick="dramaMoveScene(' + s.id + ',-1)" title="上移">▲</button><button onclick="dramaMoveScene(' + s.id + ',1)" title="下移">▼</button><button class="del" onclick="dramaRemoveScene(' + s.id + ')" title="删除">✕</button></div></div>';
    html += '<div class="drama-scene-body"><textarea placeholder="描述这个场景的内容..." oninput="dramaUpdateScene(' + s.id + ',\'desc\',this.value)">' + escHtml(s.desc || '') + '</textarea></div>';
    html += '<div class="drama-scene-footer">';
    // 角色勾选
    for (var k = 0; k < DR.chars.length; k++) {
      html += '<label class="char-check"><input type="checkbox" ' + (s.chars.includes(DR.chars[k].id) ? 'checked' : '') + ' onchange="dramaToggleChar(' + s.id + ',' + DR.chars[k].id + ',this.checked)">' + DR.chars[k].avatar + ' ' + DR.chars[k].name + '</label>';
    }
    // 模板选择
    html += '<select class="tpl-select" onchange="dramaApplyTpl(' + s.id + ',this.value)"><option value="">选择模板...</option>';
    for (var m = 0; m < DR.tpls.length; m++) {
      html += '<option value="' + DR.tpls[m].id + '"' + (s.tpl === DR.tpls[m].id ? ' selected' : '') + '>' + DR.tpls[m].icon + ' ' + DR.tpls[m].name + '</option>';
    }
    html += '</select></div></div>';
  }
  html += '</div>';

  // 生成结果
  if (DR.results.length > 0) {
    html += '<div style="margin-top:10px;font-size:13px;font-weight:600;margin-bottom:6px;">📹 生成结果</div>';
    html += '<div class="drama-results-grid">';
    for (var n = 0; n < DR.results.length; n++) {
      var r = DR.results[n];
      html += '<div class="drama-result-item"><span class="ri-label">' + escHtml(r.label) + '</span>';
      if (r.url) html += '<video src="' + r.url + '" controls></video>';
      else html += '<div style="height:80px;display:flex;align-items:center;justify-content:center;font-size:13px;color:var(--text-secondary);">生成失败</div>';
      html += '</div>';
    }
    html += '</div>';
  }

  section.innerHTML = html;
}
