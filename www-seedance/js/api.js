// Seedance Studio Pro — REST API 封装
async function apiPost(endpoint, data) {
  var h = { 'Content-Type': 'application/json' };
  if (AUTH.token) h['Authorization'] = 'Bearer ' + AUTH.token;
  var r = await fetch(endpoint, { method: 'POST', headers: h, body: JSON.stringify(data) });
  var d = await r.json().catch(function() { return null; });
  if (!r.ok) throw new Error(d?.error || 'HTTP ' + r.status);
  return d;
}
async function apiGet(endpoint) {
  var h = {};
  if (AUTH.token) h['Authorization'] = 'Bearer ' + AUTH.token;
  var r = await fetch(endpoint, { headers: h });
  var d = await r.json().catch(function() { return null; });
  if (!r.ok) throw new Error(d?.error || 'HTTP ' + r.status);
  return d;
}
async function callApi(path, method, body) {
  var r = await fetch(C.API + path, { method: method, headers: { 'Authorization': 'Bearer ' + S.key, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  var d; try { d = await r.json(); } catch (_) { d = null; }
  if (!r.ok) throw new Error(d?.error?.message || d?.error || d?.message || 'HTTP ' + r.status);
  return d;
}
function escHtml(s) { if (!s) return ''; return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function friendlyErr(msg) { if (!msg) return '未知错误'; var m = msg.toLowerCase(); for (var key in ERR_MSGS) { if (m.includes(key)) return ERR_MSGS[key]; } return msg; }
