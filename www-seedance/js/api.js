// Seedance Studio Pro — REST API 封装
async function apiPost(endpoint, data) {
  var h = { 'Content-Type': 'application/json' };
  if (AUTH.token) h['Authorization'] = 'Bearer ' + AUTH.token;
  try {
    var r = await fetchWithTimeout(endpoint, { method: 'POST', headers: h, body: JSON.stringify(data) }, 30000);
    var d = await r.json().catch(function() { return null; });
    if (!r.ok) throw new Error(d?.error || d?.message || '请求失败 (' + r.status + ')');
    return d;
  } catch(e) { if (e.name === 'AbortError') throw new Error('请求超时'); throw e; }
}
async function apiGet(endpoint) {
  var h = {};
  if (AUTH.token) h['Authorization'] = 'Bearer ' + AUTH.token;
  try {
    var r = await fetchWithTimeout(endpoint, { headers: h }, 15000);
    var d = await r.json().catch(function() { return null; });
    if (!r.ok) throw new Error(d?.error || d?.message || '请求失败 (' + r.status + ')');
    return d;
  } catch(e) { if (e.name === 'AbortError') throw new Error('请求超时'); throw e; }
}
async function apiDelete(endpoint) {
  var h = {};
  if (AUTH.token) h['Authorization'] = 'Bearer ' + AUTH.token;
  try {
    var r = await fetchWithTimeout(endpoint, { method: 'DELETE', headers: h }, 15000);
    var d = await r.json().catch(function() { return null; });
    if (!r.ok) throw new Error(d?.error || d?.message || '请求失败 (' + r.status + ')');
    return d;
  } catch(e) { if (e.name === 'AbortError') throw new Error('请求超时'); throw e; }
}
function fetchWithTimeout(url, opts, ms) {
  var ctrl = new AbortController();
  opts.signal = ctrl.signal;
  var timer = setTimeout(function() { ctrl.abort(); }, ms);
  return fetch(url, opts).finally(function() { clearTimeout(timer); });
}
async function callApi(path, method, body) {
  var headers = { 'Content-Type': 'application/json' };
  if (S.key) headers['Authorization'] = 'Bearer ' + S.key;
  var r = await fetchWithTimeout(C.API + path, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined }, 30000);
  var d; try { d = await r.json(); } catch (_) { d = null; }
  if (!r.ok) throw new Error(d?.error?.message || d?.error || d?.message || 'API 错误 (' + r.status + ')');
  return d;
}
function escHtml(s) { if (!s) return ''; return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function friendlyErr(msg) { if (!msg) return '未知错误'; var m = msg.toLowerCase(); for (var key in ERR_MSGS) { if (m.includes(key)) return ERR_MSGS[key]; } return msg; }
