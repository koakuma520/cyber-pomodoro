// REST API 封装层

async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };

  if (AUTH.token) {
    opts.headers['Authorization'] = 'Bearer ' + AUTH.token;
  }

  if (body) {
    opts.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(C.BASE + path, opts);
  } catch (e) {
    toast('网络连接失败，请检查网络', 'error');
    throw e;
  }

  // 401 表示 token 过期或无效
  if (res.status === 401) {
    clearAuth();
    toast('登录已过期，请重新登录', 'warn');
    showAuthOverlay();
    throw new Error('Unauthorized');
  }

  const data = await res.json();

  if (!res.ok) {
    toast(data.error || '请求失败', 'error');
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

function apiGet(path, params) {
  let url = path;
  if (params) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') {
        qs.append(k, v);
      }
    }
    const qsStr = qs.toString();
    if (qsStr) url += '?' + qsStr;
  }
  return request('GET', url);
}

function apiPost(path, body) {
  return request('POST', path, body);
}

function apiPut(path, body) {
  return request('PUT', path, body);
}

function apiDelete(path) {
  return request('DELETE', path);
}
