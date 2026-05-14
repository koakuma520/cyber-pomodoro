/**
 * 微信服务模块 — OAuth / JS-SDK / 支付
 *
 * 环境变量：
 *   WX_APPID      — 公众号 AppID
 *   WX_SECRET     — 公众号 AppSecret
 *   WX_MCHID      — 商户号
 *   WX_MCH_KEY    — 商户 APIv2 密钥
 *   WX_NOTIFY_URL — 支付回调地址
 */

const crypto = require('crypto');
const https  = require('https');
const url    = require('url');

// ---- 配置 ----
const APPID      = process.env.WX_APPID  || '';
const SECRET     = process.env.WX_SECRET || '';
const MCHID      = process.env.WX_MCHID  || '';
const MCH_KEY    = process.env.WX_MCH_KEY || '';
const NOTIFY_URL = process.env.WX_NOTIFY_URL || '';
const TOKEN      = process.env.WX_TOKEN || 'jindingxipu'; // 服务器配置 Token

// ---- 缓存 ----
let accessTokenCache = { token: '', expiresAt: 0 };
let jsapiTicketCache = { ticket: '', expiresAt: 0 };

// ==================== 工具 ====================

function httpGet(urlStr) {
  return new Promise((resolve, reject) => {
    https.get(urlStr, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data',  c => data += c);
      res.on('end',   () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('JSON 解析失败: ' + data.slice(0, 200))); }
      });
    }).on('error', reject);
  });
}

function httpPost(urlStr, body) {
  const u = new URL(urlStr);
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: u.hostname, path: u.pathname + (u.search || ''),
      method: 'POST', timeout: 15000,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, (res) => {
      let data = '';
      res.on('data',  c => data += c);
      res.on('end',   () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('JSON 解析失败')); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function sha1(str) {
  return crypto.createHash('sha1').update(str, 'utf8').digest('hex');
}

function md5(str) {
  return crypto.createHash('md5').update(str, 'utf8').digest('hex').toUpperCase();
}

function randStr(len) {
  return crypto.randomBytes(Math.ceil(len / 2)).toString('hex').slice(0, len);
}

function isWeChat(ua) {
  return /MicroMessenger/i.test(ua);
}

// ==================== Access Token ====================

async function getAccessToken() {
  const now = Date.now();
  if (accessTokenCache.token && now < accessTokenCache.expiresAt) {
    return accessTokenCache.token;
  }

  const res = await httpGet(
    `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APPID}&secret=${SECRET}`
  );

  if (res.errcode) {
    console.error('[WX] 获取 access_token 失败:', res);
    throw new Error('获取 access_token 失败: ' + res.errmsg);
  }

  accessTokenCache = {
    token: res.access_token,
    expiresAt: now + (res.expires_in - 300) * 1000 // 提前 5 分钟刷新
  };
  console.log('[WX] access_token 已刷新');
  return accessTokenCache.token;
}

// ==================== JSAPI Ticket ====================

async function getJsapiTicket() {
  const now = Date.now();
  if (jsapiTicketCache.ticket && now < jsapiTicketCache.expiresAt) {
    return jsapiTicketCache.ticket;
  }

  const token = await getAccessToken();
  const res = await httpGet(
    `https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=${token}&type=jsapi`
  );

  if (res.errcode !== 0) {
    console.error('[WX] 获取 jsapi_ticket 失败:', res);
    throw new Error('获取 jsapi_ticket 失败: ' + res.errmsg);
  }

  jsapiTicketCache = {
    ticket: res.ticket,
    expiresAt: now + (res.expires_in - 300) * 1000
  };
  console.log('[WX] jsapi_ticket 已刷新');
  return jsapiTicketCache.ticket;
}

// ==================== OAuth 网页授权 ====================

/**
 * 生成 OAuth 授权 URL
 * @param {string} redirectUri — 回调地址
 * @param {string} scope        — snsapi_base (静默) | snsapi_userinfo (弹窗)
 * @param {string} state        — 透传参数
 */
function getOAuthUrl(redirectUri, scope, state) {
  scope = scope || 'snsapi_base';
  state = state || 'login';
  const params = new URLSearchParams({
    appid: APPID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scope,
    state: state
  });
  return `https://open.weixin.qq.com/connect/oauth2/authorize?${params.toString()}#wechat_redirect`;
}

/**
 * 用 code 换取 access_token 和 openid
 */
async function exchangeCode(code) {
  const res = await httpGet(
    `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${APPID}&secret=${SECRET}&code=${code}&grant_type=authorization_code`
  );

  if (res.errcode) {
    console.error('[WX] OAuth code 换 token 失败:', res);
    throw new Error('OAuth 失败: ' + res.errmsg);
  }

  return {
    openid: res.openid,
    accessToken: res.access_token,
    refreshToken: res.refresh_token,
    scope: res.scope,
    unionid: res.unionid || ''
  };
}

/**
 * 获取用户信息 (snsapi_userinfo 时可用)
 */
async function getUserInfo(oauthAccessToken, openid) {
  const res = await httpGet(
    `https://api.weixin.qq.com/sns/userinfo?access_token=${oauthAccessToken}&openid=${openid}&lang=zh_CN`
  );

  if (res.errcode) {
    console.error('[WX] 获取用户信息失败:', res);
    throw new Error('获取用户信息失败: ' + res.errmsg);
  }

  return {
    openid: res.openid,
    nickname: res.nickname,
    sex: res.sex,         // 1=男 2=女
    headimgurl: res.headimgurl,
    unionid: res.unionid || ''
  };
}

// ==================== JS-SDK 签名 ====================

/**
 * 生成 JS-SDK 签名
 * @param {string} pageUrl — 当前页面完整 URL
 */
async function generateJsSign(pageUrl) {
  const ticket = await getJsapiTicket();
  const noncestr = randStr(16);
  const timestamp = Math.floor(Date.now() / 1000);

  // 签名参数（字典排序）
  const params = `jsapi_ticket=${ticket}&noncestr=${noncestr}&timestamp=${timestamp}&url=${pageUrl}`;
  const signature = sha1(params);

  return {
    appId: APPID,
    timestamp: timestamp,
    nonceStr: noncestr,
    signature: signature
  };
}

// ==================== 微信支付 (JSAPI v2) ====================

/**
 * 统一下单
 * @param {object} order — { orderId, totalAmount, body, openid, ip }
 */
async function createUnifiedOrder(order) {
  const nonceStr = randStr(32);
  const params = {
    appid: APPID,
    mch_id: MCHID,
    nonce_str: nonceStr,
    body: order.body || '金鼎囍铺-婚礼订单',
    out_trade_no: order.orderId,
    total_fee: Math.round(order.totalAmount * 100), // 分
    spbill_create_ip: order.ip || '127.0.0.1',
    notify_url: NOTIFY_URL,
    trade_type: 'JSAPI',
    openid: order.openid
  };

  // 生成签名
  const signStr = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&') + `&key=${MCH_KEY}`;
  params.sign = md5(signStr);

  // 构建 XML
  const xml = `<xml>${Object.entries(params).map(([k,v]) => `<${k}>${v}</${k}>`).join('')}</xml>`;

  const u = new URL('https://api.mch.weixin.qq.com/pay/unifiedorder');
  const result = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: u.hostname, path: u.pathname, method: 'POST', timeout: 15000,
      headers: { 'Content-Type': 'text/xml', 'Content-Length': Buffer.byteLength(xml) }
    }, (res) => {
      let data = '';
      res.on('data',  c => data += c);
      res.on('end',   () => resolve(parseXml(data)));
    });
    req.on('error', reject);
    req.write(xml);
    req.end();
  });

  if (result.return_code !== 'SUCCESS' || result.result_code !== 'SUCCESS') {
    console.error('[WX] 统一下单失败:', result);
    throw new Error(result.err_code_des || result.return_msg || '下单失败');
  }

  // 构造前端调起支付需要的参数
  const payParams = {
    appId: APPID,
    timeStamp: String(Math.floor(Date.now() / 1000)),
    nonceStr: randStr(32),
    package: `prepay_id=${result.prepay_id}`,
    signType: 'MD5'
  };

  const paySignStr = `appId=${payParams.appId}&nonceStr=${payParams.nonceStr}&package=${payParams.package}&signType=MD5&timeStamp=${payParams.timeStamp}&key=${MCH_KEY}`;
  payParams.paySign = md5(paySignStr);

  return payParams;
}

/**
 * 验证支付回调签名
 */
function verifyNotifySign(xmlObj) {
  const sign = xmlObj.sign;
  const signParams = {};
  for (const k of Object.keys(xmlObj).sort()) {
    if (k !== 'sign' && xmlObj[k] !== undefined && xmlObj[k] !== '') {
      signParams[k] = xmlObj[k];
    }
  }
  const signStr = Object.entries(signParams).map(([k, v]) => `${k}=${v}`).join('&') + `&key=${MCH_KEY}`;
  const expected = md5(signStr);
  return sign === expected;
}

// ---- XML 解析（简单实现） ----
function parseXml(xml) {
  const obj = {};
  const regex = /<(\w+)><!\[CDATA\[(.*?)\]\]><\/\1>|<(\w+)>(.*?)<\/\3>/gs;
  let m;
  while ((m = regex.exec(xml)) !== null) {
    const key = m[1] || m[3];
    const val = m[2] !== undefined ? m[2] : m[4];
    obj[key] = val;
  }
  return obj;
}

function buildXml(obj) {
  let xml = '<xml>';
  for (const [k, v] of Object.entries(obj)) {
    xml += `<${k}><![CDATA[${v}]]></${k}>`;
  }
  xml += '</xml>';
  return xml;
}

// ==================== 服务器配置验证 ====================

/**
 * 验证微信服务器配置（用于首次接入）
 */
function verifyServerConfig(timestamp, nonce, echostr, signature) {
  const arr = [TOKEN, timestamp, nonce].sort();
  const sign = sha1(arr.join(''));
  return sign === signature ? echostr : '';
}

// ==================== 导出 ====================

module.exports = {
  // 配置
  APPID, SECRET, MCHID, MCH_KEY, NOTIFY_URL, TOKEN,
  // 工具
  isWeChat,
  // Access Token
  getAccessToken,
  // OAuth
  getOAuthUrl,
  exchangeCode,
  getUserInfo,
  // JS-SDK
  getJsapiTicket,
  generateJsSign,
  // 支付
  createUnifiedOrder,
  verifyNotifySign,
  parseXml,
  buildXml,
  // 服务器验证
  verifyServerConfig
};
