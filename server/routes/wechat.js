const express = require('express');
const wx = require('../wechat');

module.exports = function (deps) {
  const { loadDB, saveDB, crypto, jwt, JWT_SECRET } = deps;
  const router = express.Router();

  // ==================== 服务器配置验证 (GET) ====================
  router.get('/callback', (req, res) => {
    const { signature, timestamp, nonce, echostr } = req.query;
    const result = wx.verifyServerConfig(timestamp, nonce, echostr, signature);
    res.send(result || '');
  });

  // ==================== OAuth 入口 ====================

  // 获取 OAuth 跳转 URL
  router.get('/oauth/url', (req, res) => {
    const redirectUri = req.query.redirect || (req.protocol + '://' + req.get('host') + '/api/wechat/oauth/callback');
    const scope = req.query.scope || 'snsapi_base';
    const state = req.query.state || 'login';
    const oauthUrl = wx.getOAuthUrl(redirectUri, scope, state);
    res.json({ url: oauthUrl });
  });

  // OAuth 回调 —— code 换 openid，自动登录/注册
  router.get('/oauth/callback', async (req, res) => {
    const { code, state } = req.query;

    if (!code) {
      // 用户拒绝授权，重定向回首页
      return res.redirect('/');
    }

    try {
      const tokenData = await wx.exchangeCode(code);
      const openid = tokenData.openid;

      // 查找或创建用户
      const users = loadDB('users.json');
      let user = users.find(u => u.wxOpenid === openid);

      if (!user) {
        // 新用户静默注册
        const now = new Date().toISOString();
        user = {
          id: crypto.randomUUID(),
          username: 'wx_' + openid.slice(-8),
          passwordHash: '', // 微信用户无密码
          wxOpenid: openid,
          phone: '',
          address: null,
          isAdmin: false,
          createdAt: now
        };
        users.push(user);
        saveDB('users.json', users);
        console.log('[WX] 新用户自动注册:', user.username);
      }

      // 签发 JWT
      const jwtToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      const { passwordHash: _, ...safeUser } = user;

      // 把 JWT 通过 URL 参数传回前端
      const frontendUrl = req.query.state === 'login'
        ? '/'
        : '/' + (state || '');

      // 前端用 hash 存储 token
      const redirectUrl = `${frontendUrl}?wx_token=${jwtToken}`;
      res.redirect(redirectUrl);
    } catch (e) {
      console.error('[WX] OAuth 回调失败:', e.message);
      res.redirect('/?wx_error=oauth_failed');
    }
  });

  // ==================== JS-SDK 签名 ====================
  router.post('/jsapi/sign', async (req, res) => {
    const pageUrl = req.body.url;
    if (!pageUrl) {
      return res.status(400).json({ error: '请提供页面 URL' });
    }

    try {
      const signData = await wx.generateJsSign(pageUrl);
      res.json(signData);
    } catch (e) {
      console.error('[WX] JS-SDK 签名失败:', e.message);
      res.status(500).json({ error: '签名失败' });
    }
  });

  // ==================== 微信支付 ====================

  // 统一下单（前端调用）
  router.post('/pay/order', async (req, res) => {
    // req.user 由外部 authMiddleware 设置
    const orderId = req.body.orderId;
    const totalAmount = req.body.totalAmount;
    const openid = req.user ? req.user.wxOpenid : '';

    if (!orderId || !totalAmount) {
      return res.status(400).json({ error: '缺少订单参数' });
    }

    if (!openid) {
      return res.status(400).json({ error: '请通过微信打开页面进行支付' });
    }

    try {
      const payParams = await wx.createUnifiedOrder({
        orderId,
        totalAmount,
        body: 'Seedance Studio Pro-视频生成',
        openid,
        ip: req.ip || req.connection.remoteAddress
      });

      res.json(payParams);
    } catch (e) {
      console.error('[WX] 支付下单失败:', e.message);
      res.status(500).json({ error: '支付下单失败: ' + e.message });
    }
  });

  // 支付回调通知
  router.post('/pay/notify', (req, res) => {
    let xml = '';
    req.setEncoding('utf8');
    req.on('data', chunk => { xml += chunk; });
    req.on('end', () => {
      try {
        const notifyData = wx.parseXml(xml);

        // 验签
        if (!wx.verifyNotifySign(notifyData)) {
          console.error('[WX] 支付回调验签失败');
          return res.send(wx.buildXml({ return_code: 'FAIL', return_msg: '签名失败' }));
        }

        if (notifyData.result_code === 'SUCCESS') {
          const orderId = notifyData.out_trade_no;
          console.log('[WX] 支付成功:', orderId, notifyData.total_fee / 100, '元');

          // 更新订单状态 → 自动审批
          const orders = loadDB('orders.json');
          const idx = orders.findIndex(o => o.id === orderId);
          if (idx >= 0) {
            const order = orders[idx];
            order.status = 'approved';
            order.paidAt = new Date().toISOString();
            order.approvedAt = new Date().toISOString();
            order.updatedAt = new Date().toISOString();
            order.wxTransactionId = notifyData.transaction_id;
            saveDB('orders.json', orders);
            // 自动执行套餐激活/积分充值
            const users = loadDB('users.json');
            const uidx = users.findIndex(u => u.id === order.userId);
            if (uidx >= 0) {
              if (order.type === 'recharge') {
                users[uidx].balance += (order.credits || 0);
                saveDB('users.json', users);
                const txns = loadDB('transactions.json');
                txns.push({ id: crypto.randomUUID(), userId: users[uidx].id, type: 'recharge', amount: order.credits, desc: '微信支付到账 ¥' + order.amount, balance: users[uidx].balance, createdAt: new Date().toISOString() });
                saveDB('transactions.json', txns);
              } else {
                users[uidx].plan = order.plan;
                saveDB('users.json', users);
              }
            }
          }
        }

        // 必须返回成功
        res.send(wx.buildXml({ return_code: 'SUCCESS', return_msg: 'OK' }));
      } catch (e) {
        console.error('[WX] 回调处理异常:', e);
        res.send(wx.buildXml({ return_code: 'SUCCESS', return_msg: 'OK' })); // 微信要求必须返回 SUCCESS
      }
    });
  });

  return router;
};
