// Seedance Studio Pro — 分发生态（半自动 MVP）
var PLATFORMS = [
  { id: 'douyin', name: '抖音', icon: '🎵', ratio: '9:16', maxDuration: 60, tips: '打开抖音APP → 点击底部 + 号 → 选择视频上传 → 添加标题和话题 → 发布', color: '#111' },
  { id: 'kuaishou', name: '快手', icon: '📹', ratio: '9:16', maxDuration: 60, tips: '打开快手APP → 点击右上角摄像机 → 选择视频 → 添加描述 → 发布', color: '#ff4906' },
  { id: 'tiktok', name: 'TikTok', icon: '🎶', ratio: '9:16', maxDuration: 180, tips: 'Open TikTok → Tap + → Upload video → Add caption & hashtags → Post', color: '#00f2ea' },
  { id: 'xiaohongshu', name: '小红书', icon: '📕', ratio: '3:4', maxDuration: 300, tips: '打开小红书 → 点击底部 + → 选择视频 → 编辑封面和标题 → 发布笔记', color: '#ff2442' },
  { id: 'taobao', name: '淘宝', icon: '🛒', ratio: '1:1', maxDuration: 60, tips: '千牛卖家中心 → 商品管理 → 选择商品 → 主图视频 → 上传视频', color: '#ff5000' }
];

function showDistributePanel() {
  var v = document.getElementById('resultVideo');
  if (!v || !v.src) { toast('请先生成视频', 'error'); return; }
  var videoUrl = v.src;
  var exist = document.getElementById('distributeModal');
  if (exist) exist.remove();

  var modal = document.createElement('div');
  modal.id = 'distributeModal';
  modal.className = 'modal-overlay open';
  modal.onclick = function(e) { if (e.target === modal) modal.remove(); };

  var html = '<div class="modal-content" style="max-width:640px;">'
    + '<div class="modal-header"><h2>📤 分发到平台</h2><button class="modal-close" onclick="document.getElementById(\'distributeModal\').remove()">✕</button></div>'
    + '<div class="modal-body">'
    + '<p style="font-size:12px;color:var(--text-secondary);margin-bottom:14px;">选择目标平台下载适配尺寸的视频，然后按照指引手动上传发布</p>'
    + '<div class="platform-grid">';

  for (var i = 0; i < PLATFORMS.length; i++) {
    var p = PLATFORMS[i];
    html += '<div class="platform-card">'
      + '<div class="platform-header">'
      + '<span class="platform-icon">' + p.icon + '</span>'
      + '<span class="platform-name">' + p.name + '</span>'
      + '</div>'
      + '<div class="platform-specs">'
      + '<span class="ps-spec">' + p.ratio + '</span>'
      + '<span class="ps-spec">≤' + p.maxDuration + '秒</span>'
      + '</div>'
      + '<div class="platform-tips">' + p.tips + '</div>'
      + '<div class="platform-actions">'
      + '<button class="btn btn-primary btn-small" onclick="downloadForPlatform(\'' + escHtml(videoUrl) + '\', \'' + p.ratio + '\')">⬇ 下载适配版</button>'
      + '</div></div>';
  }

  html += '</div>'
    + '<div class="distro-batch-bar">'
    + '<button class="btn btn-primary btn-small" onclick="batchDownloadAllFormats()">📦 一键生成所有尺寸</button>'
    + '<span style="font-size:11px;color:var(--text-muted);">自动生成 9:16、16:9、1:1、3:4 四个版本</span>'
    + '</div>'
    + '<div id="batchProgress" style="margin-top:10px;display:none;"></div>'
    + '<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);">'
    + '<button class="btn btn-secondary btn-small" onclick="downloadVideo()">⬇ 下载原片</button>'
    + '<span style="font-size:11px;color:var(--text-muted);margin-left:8px;">直接下载原始视频，不进行尺寸适配</span>'
    + '</div></div></div>';

  modal.innerHTML = html;
  document.body.appendChild(modal);
}

function downloadForPlatform(videoUrl, ratio) {
  if (ratio === '9:16') {
    // 大多数平台都是 9:16，直接下载原片
    downloadVideo();
    return;
  }
  // 对于非 9:16 的比例，尝试使用后处理 resize
  if (typeof showPostProcessPanel === 'function') {
    S._ppVideoUrl = videoUrl;
    S._ppTargetRatio = ratio;
    // 直接触发后处理
    var ops = [{ type: 'resize', params: { ratio: ratio } }];
    apiPost('/api/video/post-process', { videoUrl: videoUrl, operations: ops }).then(function(res) {
      toast('正在适配 ' + ratio + ' 格式...', 'info');
      pollDistributeProcess(res.taskId, ratio);
    }).catch(function(e) {
      // FFmpeg 不可用时直接下载原片
      toast('后处理暂不可用，下载原片（可能需要手动裁剪）', 'info');
      downloadVideo();
    });
  } else {
    downloadVideo();
  }
}

async function pollDistributeProcess(taskId, ratio) {
  for (var i = 0; i < 30; i++) {
    await new Promise(function(r) { setTimeout(r, 2000); });
    try {
      var data = await apiGet('/api/video/post-process/' + taskId);
      if (data.status === 'completed') {
        var a = document.createElement('a');
        a.href = data.videoUrl || '';
        a.download = 'seedance_' + ratio.replace(':', 'x') + '.mp4';
        a.target = '_blank'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
        toast('适配版下载已开始', 'success');
        return;
      }
      if (data.status === 'failed') { throw new Error(data.error); }
    } catch (e) {
      toast('适配失败，请下载原片', 'error');
      return;
    }
  }
  toast('处理超时', 'error');
}

async function batchDownloadAllFormats() {
  var v = document.getElementById('resultVideo');
  if (!v || !v.src) return;
  var videoUrl = v.src;
  var ratios = ['9:16', '16:9', '1:1', '3:4'];
  var names = { '9:16': '抖音/快手', '16:9': 'YouTube', '1:1': '淘宝主图', '3:4': '小红书' };
  var progressEl = document.getElementById('batchProgress');
  if (progressEl) { progressEl.style.display = 'block'; progressEl.innerHTML = '<span style="font-size:12px;color:var(--text-secondary);">⏳ 正在批量生成多尺寸版本...</span>'; }

  for (var i = 0; i < ratios.length; i++) {
    var ratio = ratios[i];
    if (ratio === '9:16') {
      if (progressEl) progressEl.innerHTML += '<div style="font-size:11px;color:var(--success);margin-top:2px;">✅ ' + names[ratio] + ' (' + ratio + ') — 下载原片</div>';
      continue;
    }
    try {
      var res = await apiPost('/api/video/post-process', { videoUrl: videoUrl, operations: [{ type: 'resize', params: { ratio: ratio } }] });
      var data = await pollBatchProcess(res.taskId);
      if (data && data.videoUrl) {
        var a = document.createElement('a');
        a.href = data.videoUrl;
        a.download = 'seedance_' + ratio.replace(':', 'x') + '.mp4';
        a.target = '_blank'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
        if (progressEl) progressEl.innerHTML += '<div style="font-size:11px;color:var(--success);margin-top:2px;">✅ ' + names[ratio] + ' (' + ratio + ') — 下载已开始</div>';
      }
    } catch (e) {
      if (progressEl) progressEl.innerHTML += '<div style="font-size:11px;color:var(--error);margin-top:2px;">❌ ' + names[ratio] + ' (' + ratio + ') — ' + e.message + '</div>';
    }
  }
  if (progressEl) progressEl.innerHTML += '<div style="font-size:11px;color:var(--text-secondary);margin-top:6px;">✅ 9:16版本直接下载原片即可</div>';
}

function pollBatchProcess(taskId) {
  return new Promise(function(resolve, reject) {
    var attempts = 0;
    function check() {
      attempts++;
      if (attempts > 30) return reject(new Error('超时'));
      apiGet('/api/video/post-process/' + taskId).then(function(data) {
        if (data.status === 'completed') resolve(data);
        else if (data.status === 'failed') reject(new Error(data.error || '失败'));
        else setTimeout(check, 2000);
      }).catch(reject);
    }
    setTimeout(check, 2000);
  });
}
