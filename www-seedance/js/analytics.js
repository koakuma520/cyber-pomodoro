// Seedance Studio Pro — 数据中心分析看板
var _analyticsPeriod = 30;
var _analyticsData = null;

async function initAnalytics() {
  renderAnalyticsSkeleton();
  if (!AUTH.token) {
    renderAnalyticsGuest();
    return;
  }
  await fetchAnalytics();
}

async function fetchAnalytics() {
  try {
    _analyticsData = await apiGet('/api/analytics/dashboard?period=' + _analyticsPeriod);
    renderAllCharts();
  } catch (e) {
    var container = document.getElementById('analyticsContent');
    if (container) container.innerHTML = '<div class="dash-empty"><div class="empty-icon">⚠️</div><p>加载数据失败</p></div>';
  }
}

function switchAnalyticsPeriod(period, el) {
  _analyticsPeriod = period;
  document.querySelectorAll('.analytics-period-tab').forEach(function(t) { t.classList.remove('active'); });
  if (el) el.classList.add('active');
  fetchAnalytics();
}

function renderAnalyticsSkeleton() {
  var panel = document.getElementById('tab-datacenter');
  if (!panel) return;
  panel.innerHTML =
    '<div class="analytics-header">'
    + '<h1>📊 数据中心</h1>'
    + '<div class="analytics-period-tabs">'
    + '<button class="analytics-period-tab" data-period="7" onclick="switchAnalyticsPeriod(7,this)">7天</button>'
    + '<button class="analytics-period-tab" data-period="30" onclick="switchAnalyticsPeriod(30,this)">30天</button>'
    + '<button class="analytics-period-tab active" data-period="90" onclick="switchAnalyticsPeriod(90,this)">90天</button>'
    + '</div></div>'
    + '<div id="analyticsContent"><div class="analytics-loading">加载中...</div></div>';
}

function renderAnalyticsGuest() {
  var container = document.getElementById('analyticsContent');
  if (container) {
    container.innerHTML = '<div class="dash-guest-banner"><div class="dash-guest-icon">📊</div><h2>数据中心</h2><p>登录后查看您的视频生成统计和分析</p>'
      + '<div style="margin-top:16px;"><button class="btn btn-primary" onclick="showAuthModal(\'login\')">登录</button></div></div>';
  }
}

function renderAllCharts() {
  var d = _analyticsData;
  if (!d) return;
  var container = document.getElementById('analyticsContent');
  if (!container) return;

  var html = '';

  // Summary row
  var totalGen = d.generationTrend.reduce(function(s, x) { return s + x.count; }, 0);
  html += '<div class="analytics-summary">'
    + '<div class="analytics-summary-card"><span class="asc-val">' + totalGen + '</span><span class="asc-label">总生成数</span></div>'
    + '<div class="analytics-summary-card"><span class="asc-val">' + (d.modelDistribution.length || 0) + '</span><span class="asc-label">使用模型</span></div>'
    + '<div class="analytics-summary-card"><span class="asc-val">' + d.successRate.rate + '<span class="stat-unit">%</span></span><span class="asc-label">成功率</span></div>'
    + '<div class="analytics-summary-card"><span class="asc-val">' + d.creditConsumption.reduce(function(s, x) { return s + x.credits; }, 0) + '</span><span class="asc-label">总消耗积分</span></div>'
    + '</div>';

  // Charts row 1: Trend + Model distribution
  html += '<div class="analytics-charts-row">'
    + '<div class="analytics-chart-card">'
    + '<div class="acc-header">📈 生成趋势</div>'
    + renderTrendChart(d.generationTrend)
    + '</div>'
    + '<div class="analytics-chart-card">'
    + '<div class="acc-header">🤖 模型分布</div>'
    + renderBarChart(d.modelDistribution)
    + '</div>'
    + '</div>';

  // Charts row 2: Success rate ring + Credit consumption
  html += '<div class="analytics-charts-row">'
    + '<div class="analytics-chart-card">'
    + '<div class="acc-header">✅ 成功率</div>'
    + '<div class="success-ring-wrap">' + renderSuccessRing(d.successRate.rate) + '</div>'
    + '</div>'
    + '<div class="analytics-chart-card">'
    + '<div class="acc-header">💎 积分消耗趋势</div>'
    + renderTrendChart(d.creditConsumption, 'credits')
    + '</div>'
    + '</div>';

  // Top prompts
  html += '<div class="analytics-chart-card" style="margin-bottom:20px;">'
    + '<div class="acc-header">🔥 高频提示词</div>'
    + renderTopPrompts(d.topPrompts)
    + '</div>';

  container.innerHTML = html;
}

// ── SVG Trend Chart ─────────────────────────────────────────
function renderTrendChart(data, valueKey) {
  valueKey = valueKey || 'count';
  if (!data || data.length === 0) return '<div class="chart-empty">暂无数据</div>';
  var W = 500, H = 200, pad = { top: 20, right: 20, bottom: 30, left: 50 };
  var iw = W - pad.left - pad.right, ih = H - pad.top - pad.bottom;
  var maxVal = Math.max.apply(null, data.map(function(d) { return d[valueKey]; })) || 1;
  maxVal = Math.ceil(maxVal * 1.2);

  var points = '';
  var xStep = iw / Math.max(data.length - 1, 1);
  for (var i = 0; i < data.length; i++) {
    var x = pad.left + i * xStep;
    var y = pad.top + ih - (data[i][valueKey] / maxVal * ih);
    points += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1) + ' ';
  }

  var html = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="trend-svg">'
    + '<defs><linearGradient id="grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--accent)" stop-opacity="0.3"/><stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>';

  // Grid lines
  for (var g = 0; g <= 4; g++) {
    var gy = pad.top + (ih * g / 4);
    html += '<line x1="' + pad.left + '" y1="' + gy + '" x2="' + (pad.left + iw) + '" y2="' + gy + '" stroke="var(--border)" stroke-width="0.5"/>';
    html += '<text x="' + (pad.left - 6) + '" y="' + (gy + 4) + '" fill="var(--text-muted)" font-size="10" text-anchor="end">' + Math.round(maxVal * (4 - g) / 4) + '</text>';
  }

  // Area fill
  var areaPath = points + 'L' + (pad.left + iw).toFixed(1) + ',' + (pad.top + ih).toFixed(1) + ' L' + pad.left.toFixed(1) + ',' + (pad.top + ih).toFixed(1) + ' Z';
  html += '<path d="' + areaPath + '" fill="url(#grad)"/>';
  // Line
  html += '<path d="' + points + '" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
  // Dots
  for (var j = 0; j < data.length; j++) {
    var dx = pad.left + j * xStep;
    var dy = pad.top + ih - (data[j][valueKey] / maxVal * ih);
    html += '<circle cx="' + dx.toFixed(1) + '" cy="' + dy.toFixed(1) + '" r="3" fill="var(--accent)"/>';
  }

  // X labels (show first and last date)
  if (data.length >= 2) {
    html += '<text x="' + pad.left + '" y="' + (H - 6) + '" fill="var(--text-muted)" font-size="10" text-anchor="start">' + (data[0].date || '').slice(5) + '</text>';
    html += '<text x="' + (pad.left + iw) + '" y="' + (H - 6) + '" fill="var(--text-muted)" font-size="10" text-anchor="end">' + (data[data.length - 1].date || '').slice(5) + '</text>';
  }
  html += '</svg>';
  return html;
}

// ── Bar Chart ────────────────────────────────────────────────
function renderBarChart(data) {
  if (!data || data.length === 0) return '<div class="chart-empty">暂无数据</div>';
  var maxVal = Math.max.apply(null, data.map(function(d) { return d.count; })) || 1;
  var colors = ['#7c6ff8', '#34d399', '#f59e0b', '#60a5fa', '#f87171'];
  var html = '<div class="bar-chart">';
  for (var i = 0; i < data.length; i++) {
    var pct = Math.round(data[i].count / maxVal * 100);
    var name = data[i].provider || data[i].prompt || '';
    html += '<div class="bar-row">'
      + '<span class="bar-label">' + escHtml(name) + '</span>'
      + '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%;background:' + (colors[i % colors.length]) + ';"></div></div>'
      + '<span class="bar-val">' + data[i].count + '</span></div>';
  }
  html += '</div>';
  return html;
}

// ── Success Ring (SVG) ──────────────────────────────────────
function renderSuccessRing(rate) {
  var size = 140, strokeW = 10, r = (size - strokeW) / 2;
  var circ = 2 * Math.PI * r;
  var offset = circ - (rate / 100 * circ);
  return '<svg viewBox="0 0 ' + size + ' ' + size + '" class="success-ring-svg" width="' + size + '" height="' + size + '">'
    + '<circle cx="' + (size / 2) + '" cy="' + (size / 2) + '" r="' + r + '" fill="none" stroke="var(--border)" stroke-width="' + strokeW + '"/>'
    + '<circle cx="' + (size / 2) + '" cy="' + (size / 2) + '" r="' + r + '" fill="none" stroke="var(--success)" stroke-width="' + strokeW + '" stroke-dasharray="' + circ.toFixed(1) + '" stroke-dashoffset="' + offset.toFixed(1) + '" stroke-linecap="round" transform="rotate(-90 ' + (size / 2) + ' ' + (size / 2) + ')"/>'
    + '<text x="' + (size / 2) + '" y="' + (size / 2 + 6) + '" text-anchor="middle" fill="var(--text-primary)" font-size="26" font-weight="700">' + rate + '%</text>'
    + '</svg>';
}

// ── Top Prompts List ────────────────────────────────────────
function renderTopPrompts(data) {
  if (!data || data.length === 0) return '<div class="chart-empty">暂无数据，生成视频后将显示高频提示词</div>';
  var html = '<div class="top-prompts-list">';
  for (var i = 0; i < data.length; i++) {
    html += '<div class="tp-row">'
      + '<span class="tp-rank">#' + (i + 1) + '</span>'
      + '<span class="tp-text">' + escHtml(data[i].prompt) + '</span>'
      + '<span class="tp-count">' + data[i].count + '次</span></div>';
  }
  html += '</div>';
  return html;
}
