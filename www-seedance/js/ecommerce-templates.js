// Seedance Studio Pro — 电商模板系统
var ECOM_TPL = [
  { id: 'tpl-product-show', name: '商品展示', icon: '📦', industry: '通用', promptTemplate: '专业商品展示视频，{{product_name}}在纯色背景下优雅展示，柔和摄影棚灯光，产品细节清晰可见，微距镜头缓慢推进，4K画质。{{selling_points}}', tips: '适合：服装、配饰、3C数码' },
  { id: 'tpl-unboxing', name: '开箱测评', icon: '📦', industry: '通用', promptTemplate: '第一人称视角开箱视频，{{product_name}}从包装盒中取出，展示包装细节和产品外观，自然室内光线，真实开箱体验感。{{selling_points}}', tips: '适合：3C数码、潮玩' },
  { id: 'tpl-comparison', name: '对比测评', icon: '⚖️', industry: '通用', promptTemplate: '左右分屏对比视频，{{product_name}}与竞品的关键差异对比展示，清晰标签标注，专业测评风格。{{selling_points}}', tips: '适合：家电、日用品' },
  { id: 'tpl-tutorial', name: '使用教程', icon: '📖', industry: '通用', promptTemplate: '教学演示视频，逐步展示{{product_name}}的使用方法，每步配有文字说明，简洁明了，白色背景。{{selling_points}}', tips: '适合：工具、厨具' },
  { id: 'tpl-flash-sale', name: '限时抢购', icon: '⚡', industry: '通用', promptTemplate: '快节奏促销视频，{{product_name}}在聚光灯下展示，倒计时元素，价格标签动画，红金色调，紧迫感氛围。{{selling_points}}', tips: '适合：促销活动' },
  { id: 'tpl-before-after', name: '前后对比', icon: '✨', industry: '美妆/清洁', promptTemplate: '使用前后对比展示，左侧为使用前，右侧为使用{{product_name}}后的惊艳效果，慢动作过渡。{{selling_points}}', tips: '适合：护肤品、清洁剂' },
  { id: 'tpl-lifestyle', name: '场景种草', icon: '🌿', industry: '服装/家居', promptTemplate: '生活方式场景视频，{{product_name}}融入日常使用场景中，温暖色调，自然光线，舒适放松的电影感画面。{{selling_points}}', tips: '适合：服装、家居' },
  { id: 'tpl-ingredient', name: '成分解析', icon: '🔬', industry: '食品/护肤', promptTemplate: '产品成分特写视频，{{product_name}}的核心成分逐一展示，微观镜头效果，成分名称标注动画，科技蓝白色调。{{selling_points}}', tips: '适合：食品、护肤品' },
  { id: 'tpl-factory', name: '工厂溯源', icon: '🏭', industry: '食品/制造', promptTemplate: '工厂生产过程展示，{{product_name}}从原料到成品的完整制作过程，现代化洁净工厂，自动化产线，专业品质感。{{selling_points}}', tips: '适合：食品、手工艺品' },
  { id: 'tpl-social-proof', name: '买家秀合集', icon: '💬', industry: '通用', promptTemplate: '用户好评和实拍合集视频，多张{{product_name}}的真实使用照片轮播展示，五星好评动画，真实温暖的场景。{{selling_points}}', tips: '适合：服装、美妆' }
];

async function loadTemplates() {
  try {
    if (AUTH.token) {
      var tpls = await apiGet('/api/templates');
      if (tpls && tpls.length) ECOM_TPL = tpls;
    }
  } catch (e) { /* 使用内置模板 */ }
  renderTemplateQuickBar();
}

function renderTemplateQuickBar() {
  var grid = document.getElementById('templateQuickGrid');
  if (!grid) return;
  var html = '';
  for (var i = 0; i < ECOM_TPL.length; i++) {
    var t = ECOM_TPL[i];
    html += '<div class="template-card" data-tpl-id="' + t.id + '" title="' + escHtml(t.tips || '') + '">'
      + '<span class="tpl-icon">' + (t.icon || '📦') + '</span>'
      + '<div class="tpl-name">' + escHtml(t.name) + '</div>'
      + (t.tips ? '<div class="tpl-tip">' + escHtml(t.tips) + '</div>' : '') + '</div>';
  }
  grid.innerHTML = html;
}

// 事件委托 — 在 templateQuickGrid 上统一捕获点击
function setupTemplateDelegation() {
  var grid = document.getElementById('templateQuickGrid');
  if (!grid || grid._delegated) return;
  grid._delegated = true;
  grid.addEventListener('click', function(e) {
    var card = e.target.closest('.template-card');
    if (!card) return;
    var tplId = card.getAttribute('data-tpl-id');
    if (tplId) useTemplate(tplId);
  });
}

function useTemplate(tplId) {
  var tpl = ECOM_TPL.find(function(t) { return t.id === tplId; });
  if (!tpl) { toast('模板未找到', 'error'); return; }
  showTemplateForm(tpl);
}

function showTemplateForm(tpl) {
  var exist = document.getElementById('tplFormPanel');
  if (exist) exist.remove();

  var panel = document.createElement('div');
  panel.id = 'tplFormPanel';
  panel.className = 'tpl-form-panel';
  panel.setAttribute('data-tpl-id', tpl.id);
  panel.innerHTML = '<div class="tpl-form-header">'
    + '<span>' + (tpl.icon || '📦') + ' ' + escHtml(tpl.name) + '</span>'
    + '<button class="tpl-form-close" onclick="closeTemplateForm()">✕</button></div>'
    + '<div class="tpl-form-body">'
    + '<label>产品名称</label><input type="text" id="tplProductName" placeholder="例如：夏季新款连衣裙" oninput="previewTemplatePrompt()">'
    + '<label>产品卖点 <span class="label-hint">可选</span></label><input type="text" id="tplSellingPoints" placeholder="例如：限时特价、买二送一" oninput="previewTemplatePrompt()">'
    + '<label>生成预览</label><div class="tpl-preview" id="tplPreviewText"></div>'
    + '<div class="tpl-form-actions"><button class="btn btn-secondary btn-small" onclick="closeTemplateForm()">取消</button>'
    + '<button class="btn btn-primary btn-small" onclick="confirmTemplate(\'' + tpl.id + '\')">📋 填入生成器</button></div></div>';

  var grid = document.getElementById('templateQuickGrid');
  if (grid && grid.parentNode) {
    grid.parentNode.insertBefore(panel, grid.nextSibling);
  }
  document.getElementById('tplProductName').focus();
  previewTemplatePrompt();

  // 确保在文生视频模式
  if (S.mode !== 'text') {
    var btn = document.querySelector('.mode-tab[data-mode="text"]');
    if (btn) btn.click();
  }
}

function previewTemplatePrompt() {
  var tplId = document.getElementById('tplFormPanel')?.getAttribute('data-tpl-id') || '';
  var tpl = ECOM_TPL.find(function(t) { return t.id === tplId; });
  if (!tpl) return;
  var name = document.getElementById('tplProductName')?.value || '{{product_name}}';
  var sp = document.getElementById('tplSellingPoints')?.value || '品质保证，值得信赖';
  var text = (tpl.promptTemplate || '')
    .replace(/\{\{product_name\}\}/g, name || '{{product_name}}')
    .replace(/\{\{selling_points\}\}/g, sp || '');
  var preview = document.getElementById('tplPreviewText');
  if (preview) preview.textContent = text;
}

function confirmTemplate(tplId) {
  var tpl = ECOM_TPL.find(function(t) { return t.id === tplId; });
  if (!tpl) return;
  var name = document.getElementById('tplProductName')?.value?.trim();
  if (!name) { toast('请输入产品名称', 'error'); return; }
  var sp = document.getElementById('tplSellingPoints')?.value?.trim() || '品质保证，值得信赖';
  var text = (tpl.promptTemplate || '')
    .replace(/\{\{product_name\}\}/g, name)
    .replace(/\{\{selling_points\}\}/g, sp);

  var inp = document.getElementById('promptInput');
  if (inp) {
    inp.value = text;
    document.getElementById('charCount').textContent = text.length;
    inp.focus();
    inp.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  closeTemplateForm();
  toast('已填入「' + tpl.name + '」模板', 'success');
}

function closeTemplateForm() {
  var el = document.getElementById('tplFormPanel');
  if (el) el.remove();
}

// 页面加载后初始化事件委托
document.addEventListener('DOMContentLoaded', function() { setTimeout(setupTemplateDelegation, 600); });
