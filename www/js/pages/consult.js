// 档期咨询页
var consultPage = {
  async render() {
    P.currentPage = 'consult';
    updateHeader();
    renderBottomNav();

    var content = document.getElementById('content');

    var html = '';

    // Banner
    html += '<div class="banner" style="background:var(--tiffany-gradient);">';
    html += '<div style="text-align:center;">';
    html += '<div style="font-size:2rem;margin-bottom:4px;">💒</div>';
    html += '<div style="font-size:1rem;">婚庆档期咨询</div>';
    html += '<div style="font-size:0.7rem;font-weight:400;opacity:0.85;">专业婚庆顾问 1v1 免费规划</div>';
    html += '</div>';
    html += '</div>';

    // 服务报价卡片
    html += '<div class="card"><div class="card-body">';
    html += '<h3 style="font-size:1rem;font-weight:600;margin-bottom:12px;">📋 服务范围与报价</h3>';

    var services = [
      { name: '婚礼喜糖定制', price: '¥15.8起/份', desc: '含设计+糖果+包装，50份起订', icon: '🍬' },
      { name: '婚礼伴手礼', price: '¥45起/份', desc: '含定制礼盒+糖果+香薰+感谢卡', icon: '🎁' },
      { name: '婚礼场地布置', price: '¥2,999起/场', desc: '含背景装饰+桌花+迎宾区+甜品台', icon: '💐' },
      { name: '婚礼甜品台', price: '¥1,288起', desc: '含三层甜品架+定制糖果+摆件装饰', icon: '🧁' }
    ];

    services.forEach(function (s) {
      html += '<div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border-light);">';
      html += '<div style="font-size:2rem;flex-shrink:0;">' + s.icon + '</div>';
      html += '<div style="flex:1;">';
      html += '<div style="font-size:0.9rem;font-weight:500;">' + escHtml(s.name) + '</div>';
      html += '<div style="font-size:0.75rem;color:var(--text-muted);">' + escHtml(s.desc) + '</div>';
      html += '</div>';
      html += '<div style="font-weight:700;color:var(--accent);font-size:0.95rem;flex-shrink:0;">' + escHtml(s.price) + '</div>';
      html += '</div>';
    });

    html += '</div></div>';

    // 免费咨询入口
    html += '<div class="consult-card">';
    html += '<div class="consult-icon">💒</div>';
    html += '<h3 class="consult-title">免费获取初案规划</h3>';
    html += '<p class="consult-desc">告诉我们您的婚礼日期、风格偏好和预算，<br>专业顾问为您量身定制方案</p>';

    html += '<div class="consult-qr">📱</div>';
    html += '<p class="consult-qr-label">长按识别二维码添加顾问微信</p>';
    html += '<p class="consult-qr-label" style="margin-top:4px;">或直接回复"咨询"获取联系方式</p>';
    html += '</div>';

    // 快速咨询表单
    html += '<div class="card"><div class="card-header"><span class="card-title">✏️ 快速咨询表单</span></div><div class="card-body">';

    html += '<div class="form-group"><label class="form-label">您的称呼</label><input class="form-input" id="consultName" placeholder="请输入您的称呼"></div>';
    html += '<div class="form-group"><label class="form-label">联系电话</label><input class="form-input" id="consultPhone" placeholder="请输入手机号（选填）"></div>';
    html += '<div class="form-group"><label class="form-label">婚礼日期</label><input class="form-input" type="date" id="consultDate"></div>';
    html += '<div class="form-group"><label class="form-label">预算范围</label><select class="form-select" id="consultBudget">';
    html += '<option value="">请选择预算范围</option>';
    html += '<option>1万以下</option>';
    html += '<option>1-3万</option>';
    html += '<option>3-5万</option>';
    html += '<option>5-10万</option>';
    html += '<option>10万以上</option>';
    html += '</select></div>';
    html += '<div class="form-group"><label class="form-label">需求描述（选填）</label><textarea class="form-textarea" id="consultDesc" rows="3" placeholder="如：需要喜糖定制+场地布置，风格偏向中式..."></textarea></div>';

    html += '<button class="btn btn-primary btn-block" id="btnConsultSubmit">💒 提交咨询 · 免费获取方案</button>';
    html += '<p style="text-align:center;margin-top:8px;font-size:0.75rem;color:var(--text-muted);">提交后24小时内会有专属顾问与您联系</p>';

    html += '</div></div>';

    // 关于我们
    html += '<div class="card"><div class="card-header"><span class="card-title">🏠 关于金鼎囍铺</span></div><div class="card-body">';
    html += '<p style="font-size:0.85rem;color:var(--text-secondary);line-height:1.8;">';
    html += '金鼎囍铺 — 会泽新人的囍事专家。从一颗糖到一场婚礼，我们全包了。提供婚礼喜糖定制、主题婚庆布置、伴手礼设计等全流程方案。<br><br>';
    html += '我们相信，每一场婚礼都值得被温柔以待。从一颗糖到一场梦，我们用心打造属于你们的专属甜蜜记忆。<br><br>';
    html += '📍 地址：深圳市南山区科技园路1号<br>';
    html += '📞 电话：138-0000-0000<br>';
    html += '🕐 营业时间：周一至周日 10:00-20:00';
    html += '</p>';
    html += '</div></div>';

    content.innerHTML = html;

    this.bindEvents();
  },

  bindEvents() {
    var btnSubmit = document.getElementById('btnConsultSubmit');
    if (btnSubmit) {
      btnSubmit.addEventListener('click', function () {
        var name = document.getElementById('consultName').value.trim();
        if (!name) {
          toast('请填写您的称呼', 'warn');
          return;
        }

        // 保存咨询记录
        var consult = {
          name: name,
          phone: document.getElementById('consultPhone').value.trim(),
          date: document.getElementById('consultDate').value,
          budget: document.getElementById('consultBudget').value,
          desc: document.getElementById('consultDesc').value.trim(),
          createdAt: new Date().toISOString()
        };

        // 存储到 localStorage
        var consults = dbGet('seedance_consults') || [];
        consults.push(consult);
        dbSet('seedance_consults', consults);

        toast('咨询已提交！顾问将在24小时内联系您', 'success');

        // 清空表单
        document.getElementById('consultName').value = '';
        document.getElementById('consultPhone').value = '';
        document.getElementById('consultDate').value = '';
        document.getElementById('consultBudget').value = '';
        document.getElementById('consultDesc').value = '';
      });
    }
  }
};
