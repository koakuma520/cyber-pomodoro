// Seedance Studio Pro — 素材库
var _assetsFilter = 'all';
var _assetsPage = 1;

async function initAssets() {
  renderAssetsSkeleton();
  if (!AUTH.token) {
    renderAssetsGuest();
    return;
  }
  await loadAssets();
}

function renderAssetsSkeleton() {
  var panel = document.getElementById('tab-assets');
  if (!panel) return;
  panel.innerHTML =
    '<div class="assets-header">'
    + '<h1>🗂️ 素材库</h1>'
    + '<p class="assets-subtitle">管理已上传的图片和生成的视频素材</p>'
    + '<div class="assets-filter-bar">'
    + '<button class="assets-filter-tab active" data-type="all" onclick="filterAssets(\'all\',this)">全部</button>'
    + '<button class="assets-filter-tab" data-type="image" onclick="filterAssets(\'image\',this)">🖼️ 图片</button>'
    + '<button class="assets-filter-tab" data-type="video" onclick="filterAssets(\'video\',this)">🎬 视频</button>'
    + '</div></div>'
    + '<div id="assetsContent"><div class="analytics-loading">加载中...</div></div>';
}

function renderAssetsGuest() {
  var container = document.getElementById('assetsContent');
  if (container) {
    container.innerHTML = '<div class="dash-guest-banner"><div class="dash-guest-icon">🗂️</div><h2>素材库</h2><p>登录后管理您的图片和视频素材</p></div>';
  }
}

async function loadAssets(page) {
  _assetsPage = page || 1;
  var container = document.getElementById('assetsContent');
  if (!container) return;
  try {
    var data = await apiGet('/api/assets?type=' + _assetsFilter + '&page=' + _assetsPage + '&limit=20');
    if (!data.items || data.items.length === 0) {
      container.innerHTML = '<div class="dash-empty"><div class="empty-icon">📭</div><p>素材库为空，生成的视频和上传的图片将显示在这里</p></div>';
      return;
    }
    var html = '<div class="assets-grid">';
    for (var i = 0; i < data.items.length; i++) {
      var a = data.items[i];
      var isVideo = a.type === 'video';
      var dateStr = a.createdAt ? new Date(a.createdAt).toLocaleString('zh-CN') : '';
      html += '<div class="asset-card">'
        + (isVideo
          ? '<video src="' + escHtml(a.url) + '" muted preload="metadata" playsinline></video>'
          : '<img src="' + escHtml(a.url) + '" loading="lazy" alt="">')
        + '<div class="asset-card-overlay">'
        + '<span class="asset-type-badge ' + a.type + '">' + (isVideo ? '🎬 视频' : '🖼️ 图片') + '</span>'
        + '<div class="asset-card-actions">'
        + '<button class="btn btn-xs btn-primary" onclick="reuseAsset(\'' + escHtml(a.url) + '\', \'' + a.type + '\')">复 用</button>'
        + (isVideo ? '<button class="btn btn-xs btn-secondary" onclick="downloadAssetVideo(\'' + escHtml(a.url) + '\')">⬇ 下载</button>' : '')
        + '<button class="btn btn-xs btn-danger" onclick="deleteAsset(\'' + a.id + '\')">🗑</button>'
        + '</div></div>'
        + '<div class="asset-card-info">'
        + '<div class="asset-date">' + dateStr + '</div>'
        + '<div class="asset-size">' + formatSize(a.size) + '</div>'
        + '</div></div>';
    }
    html += '</div>';
    // Pagination
    if (data.totalPages > 1) {
      html += '<div class="assets-pagination">';
      if (_assetsPage > 1) html += '<button class="btn btn-xs" onclick="loadAssets(' + (_assetsPage - 1) + ')">← 上一页</button>';
      html += '<span class="page-info">' + _assetsPage + '/' + data.totalPages + '</span>';
      if (_assetsPage < data.totalPages) html += '<button class="btn btn-xs" onclick="loadAssets(' + (_assetsPage + 1) + ')">下一页 →</button>';
      html += '</div>';
    }
    container.innerHTML = html;
  } catch (e) {
    container.innerHTML = '<div class="dash-empty"><div class="empty-icon">⚠️</div><p>加载素材失败</p></div>';
  }
}

function filterAssets(type, el) {
  _assetsFilter = type;
  document.querySelectorAll('.assets-filter-tab').forEach(function(t) { t.classList.remove('active'); });
  if (el) el.classList.add('active');
  loadAssets(1);
}

async function deleteAsset(id) {
  if (!confirm('确定删除该素材？此操作不可恢复。')) return;
  try {
    await apiDelete('/api/assets/' + id);
    toast('素材已删除', 'success');
    loadAssets(_assetsPage);
  } catch (e) { toast('删除失败: ' + e.message, 'error'); }
}

function reuseAsset(url, type) {
  if (type === 'image') {
    document.getElementById('imgUrl1').value = url;
    // Switch to image mode if not already
    var imgTab = document.querySelector('.mode-tab[data-mode="image"]');
    if (imgTab) imgTab.click();
    switchTab('generate');
    handleUrl({ target: { value: url } }, 1);
  } else if (type === 'video') {
    switchTab('generate');
    setTimeout(function() {
      var v = document.getElementById('resultVideo');
      if (v) { v.src = url; v.play(); }
    }, 300);
  }
}

function downloadAssetVideo(url) {
  var a = document.createElement('a');
  a.href = url; a.download = 'seedance_video.mp4'; a.target = '_blank';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

function formatSize(bytes) {
  if (!bytes || bytes === 0) return '';
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + 'KB';
  return (bytes / 1048576).toFixed(1) + 'MB';
}
