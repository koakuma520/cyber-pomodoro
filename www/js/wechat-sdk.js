/**
 * 微信 JS-SDK / OAuth / 支付 前端集成
 */

const WX_SDK = {
  ready: false,
  configed: false,

  // 检测是否在微信内
  isWeChat() {
    return /MicroMessenger/i.test(navigator.userAgent);
  },

  // ==================== OAuth 登录 ====================

  // 发起微信 OAuth（服务端重定向）
  async oauthLogin(scope) {
    scope = scope || 'snsapi_base'; // 静默授权，不弹窗
    var redirect = encodeURIComponent(window.location.origin + '/api/wechat/oauth/callback');
    var url = '/api/wechat/oauth/url?redirect=' + redirect + '&scope=' + scope;
    try {
      var res = await fetch(url);
      var data = await res.json();
      window.location.href = data.url;
    } catch (e) {
      console.error('[WX] 获取 OAuth URL 失败:', e);
    }
  },

  // 从 URL 参数中提取微信登录 token
  extractToken() {
    var params = new URLSearchParams(window.location.search);
    var token = params.get('wx_token');
    if (token) {
      // 清理 URL 参数
      var url = new URL(window.location);
      url.searchParams.delete('wx_token');
      window.history.replaceState({}, '', url.toString());
    }
    return token;
  },

  // ==================== JS-SDK ====================

  // 初始化 JS-SDK
  async init() {
    if (!this.isWeChat()) {
      console.log('[WX] 非微信环境，跳过 JS-SDK');
      return;
    }

    if (this.configed) return;

    try {
      // 获取签名
      var res = await fetch('/api/wechat/jsapi/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: window.location.href.split('#')[0] })
      });
      var signData = await res.json();

      if (!signData.appId) {
        console.warn('[WX] 未配置 AppID，跳过 wx.config');
        return;
      }

      // 配置 SDK
      var self = this;
      window.wx.config({
        debug: false,
        appId: signData.appId,
        timestamp: signData.timestamp,
        nonceStr: signData.nonceStr,
        signature: signData.signature,
        jsApiList: [
          'onMenuShareTimeline',    // 分享到朋友圈
          'onMenuShareAppMessage',  // 分享给朋友
          'updateAppMessageShareData',
          'updateTimelineShareData',
          'chooseWXPay',            // 微信支付
          'hideOptionMenu',         // 隐藏右上角菜单
          'showOptionMenu',
          'hideMenuItems',          // 隐藏菜单项
          'showMenuItems',
          'chooseImage',            // 选图片
          'previewImage',           // 预览图片
          'getLocation'             // 获取位置
        ]
      });

      window.wx.ready(function () {
        self.ready = true;
        self.configed = true;
        console.log('[WX] JS-SDK 就绪');
        self.setShareInfo();
      });

      window.wx.error(function (err) {
        console.error('[WX] JS-SDK 配置失败:', err);
        self.configed = false;
      });
    } catch (e) {
      console.error('[WX] JS-SDK 初始化失败:', e);
    }
  },

  // ==================== 分享设置 ====================

  setShareInfo(title, desc, imgUrl) {
    title  = title  || '金鼎囍铺 — 会泽新人的囍事专家';
    desc   = desc   || '从一颗糖到一场婚礼，金鼎囍铺全包了。喜糖定制·婚庆布置·伴手礼，一站式甜蜜方案。';
    imgUrl = imgUrl || window.location.origin + '/images/share-icon.png';

    if (!this.ready || !window.wx) return;

    var shareData = {
      title: title,
      desc: desc,
      link: window.location.href.split('?')[0],
      imgUrl: imgUrl,
      success: function () {
        console.log('[WX] 分享成功');
      }
    };

    window.wx.onMenuShareTimeline(shareData);
    window.wx.onMenuShareAppMessage(shareData);

    // 新版本 API
    try {
      window.wx.updateAppMessageShareData(shareData);
      window.wx.updateTimelineShareData(shareData);
    } catch (e) {}
  },

  // 隐藏菜单项
  hideMenuItems(items) {
    items = items || ['menuItem:share:qq', 'menuItem:share:weiboApp', 'menuItem:share:QZone'];
    if (this.ready) window.wx.hideMenuItems({ menuList: items });
  },

  // ==================== 微信支付 ====================

  // 调起微信支付
  async requestPayment(orderId, totalAmount) {
    if (!this.isWeChat()) {
      throw new Error('请在微信中打开页面进行支付');
    }

    // 1. 获取支付参数
    var res = await fetch('/api/wechat/pay/order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + AUTH.token
      },
      body: JSON.stringify({ orderId, totalAmount })
    });

    var payParams = await res.json();
    if (!res.ok) throw new Error(payParams.error || '获取支付参数失败');

    // 2. 调起支付
    return new Promise(function (resolve, reject) {
      window.wx.chooseWXPay({
        appId: payParams.appId,
        timestamp: payParams.timeStamp,
        nonceStr: payParams.nonceStr,
        package: payParams.package,
        signType: payParams.signType || 'MD5',
        paySign: payParams.paySign,
        success: function (r) {
          console.log('[WX] 支付成功:', r);
          resolve(r);
        },
        cancel: function () {
          reject(new Error('用户取消支付'));
        },
        fail: function (err) {
          console.error('[WX] 支付失败:', err);
          reject(new Error('支付失败'));
        }
      });
    });
  }
};
