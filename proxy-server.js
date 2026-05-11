/**
 * Seedance Studio - 本地代理服务器
 *
 * 解决浏览器跨域（CORS）问题，并支持图片上传托管。
 *
 * 使用方法：
 *   node proxy-server.js
 *   然后打开 http://localhost:3456
 *
 * 环境变量：
 *   PORT          - 端口号 (默认 3456)
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

const PORT = process.env.PORT || 3456;
const ATLAS_API_BASE = 'api.atlascloud.ai';
const HTML_FILE = path.join(__dirname, 'seedance-studio.html');

// 内存中存储上传的图片 { id -> { data: Buffer, mime: string } }
const uploadedImages = new Map();

// =====================================================
// 代理请求到 Atlas Cloud API
// =====================================================
function proxyToAtlas(method, apiPath, queryString, body, headers, callback) {
  const fullPath = '/api/v1' + apiPath + (queryString || '');

  const opts = {
    hostname: ATLAS_API_BASE,
    port: 443,
    path: fullPath,
    method: method,
    headers: {
      'Authorization': headers['authorization'] || headers['Authorization'] || '',
      'Content-Type': 'application/json',
    }
  };

  if (body) {
    opts.headers['Content-Length'] = Buffer.byteLength(body);
  }

  const req = https.request(opts, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      callback(res.statusCode, data, res.headers);
    });
  });

  req.on('error', (err) => {
    callback(500, JSON.stringify({ error: { message: err.message } }), {});
  });

  if (body) req.write(body);
  req.end();
}

// =====================================================
// 处理图片上传 — 存到本地内存，返回本地 URL
// =====================================================
function handleImageUpload(imageBuffer, callback) {
  const id = crypto.randomBytes(16).toString('hex');
  // 检测 MIME
  let mime = 'image/png';
  if (imageBuffer[0] === 0xFF && imageBuffer[1] === 0xD8) mime = 'image/jpeg';
  else if (imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50) mime = 'image/png';
  else if (imageBuffer[0] === 0x52 && imageBuffer[1] === 0x49) mime = 'image/webp';
  else if (imageBuffer[0] === 0x47 && imageBuffer[1] === 0x49) mime = 'image/gif';

  uploadedImages.set(id, { data: imageBuffer, mime: mime });

  // 5分钟后自动清理
  setTimeout(() => uploadedImages.delete(id), 300000);

  const ext = mime.split('/')[1];
  callback(null, { id: id, ext: ext, url: `http://localhost:${PORT}/api/image/${id}` });
}

// =====================================================
// 请求正文解析 helper
// =====================================================
function collectBody(req, callback) {
  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', () => callback(Buffer.concat(chunks)));
}

// =====================================================
// Server
// =====================================================
const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;
  const method = req.method;

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // ===========================
  // 提供上传的图片
  // ===========================
  if (pathname.startsWith('/api/image/')) {
    const id = pathname.replace('/api/image/', '');
    const img = uploadedImages.get(id);
    if (!img) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Image not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': img.mime,
      'Content-Length': img.data.length,
      'Cache-Control': 'public, max-age=300'
    });
    res.end(img.data);
    return;
  }

  // ===========================
  // 上传图片接口
  // ===========================
  if (pathname === '/api/upload-image' && method === 'POST') {
    collectBody(req, (buffer) => {
      const contentType = req.headers['content-type'] || '';

      if (contentType.includes('application/json')) {
        // JSON 格式: { image: "base64string" }
        try {
          const json = JSON.parse(buffer.toString('utf-8'));
          if (json.image) {
            const imgBuffer = Buffer.from(json.image, 'base64');
            handleImageUpload(imgBuffer, (err, result) => {
              if (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
              } else {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ url: result.url }));
              }
            });
            return;
          }
          if (json.url) {
            // 已经是 URL，直接返回
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ url: json.url }));
            return;
          }
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON: ' + e.message }));
          return;
        }
      }

      // 否则当作原始图片二进制
      handleImageUpload(buffer, (err, result) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ url: result.url }));
        }
      });
    });
    return;
  }

  // ===========================
  // API 代理 (Atlas Cloud)
  // ===========================
  if (pathname.startsWith('/api/v1/')) {
    const apiPath = pathname.replace('/api/v1', '');
    collectBody(req, (buffer) => {
      const bodyStr = buffer.length > 0 ? buffer.toString('utf-8') : null;
      proxyToAtlas(method, apiPath, parsed.search || '', bodyStr, req.headers, (status, data, headers) => {
        res.setHeader('Content-Type', headers['content-type'] || 'application/json');
        res.writeHead(status);
        res.end(data);
      });
    });
    return;
  }

  // ===========================
  // 健康检查
  // ===========================
  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      mode: 'proxy',
      uploadedImages: uploadedImages.size,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // ===========================
  // 提供 HTML 页面
  // ===========================
  if (pathname === '/' || pathname === '/index.html') {
    fs.readFile(HTML_FILE, 'utf-8', (err, content) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('错误: 无法读取 seedance-studio.html\n请确保它在同一目录下。\n' + err.message);
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(content);
    });
    return;
  }

  // ===========================
  // 404
  // ===========================
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║              Seedance Studio 本地服务器                    ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  打开浏览器访问:                                         ║
║  →  http://localhost:${PORT}                              ║
║                                                          ║
║  功能:                                                   ║
║  • API 代理 → 自动转发请求，解决 CORS 跨域                ║
║  • 图片托管 → 上传的图片自动生成本地可访问 URL            ║
║  • 无需任何浏览器插件                                    ║
║                                                          ║
║  按 Ctrl+C 停止                                          ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
  `);
});
