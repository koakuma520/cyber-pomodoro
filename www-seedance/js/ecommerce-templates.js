// Seedance Studio Pro — 电商模板系统 (25+ 模板)
var ECOM_TPL = [
  // ===== 通用 (6) =====
  { id: 'tpl-product-show', name: '商品展示', icon: '📦', industry: '通用', promptTemplate: '专业商品展示视频，{{product_name}}在纯色背景下优雅展示，柔和摄影棚灯光，产品细节清晰可见，微距镜头缓慢推进，4K画质。{{selling_points}}', tips: '适合：服装、配饰、3C数码' },
  { id: 'tpl-unboxing', name: '开箱测评', icon: '📦', industry: '通用', promptTemplate: '第一人称视角开箱视频，{{product_name}}从包装盒中取出，展示包装细节和产品外观，自然室内光线，真实开箱体验感。{{selling_points}}', tips: '适合：3C数码、潮玩' },
  { id: 'tpl-comparison', name: '对比测评', icon: '⚖️', industry: '通用', promptTemplate: '左右分屏对比视频，{{product_name}}与竞品的关键差异对比展示，清晰标签标注，专业测评风格。{{selling_points}}', tips: '适合：家电、日用品' },
  { id: 'tpl-tutorial', name: '使用教程', icon: '📖', industry: '通用', promptTemplate: '教学演示视频，逐步展示{{product_name}}的使用方法，每步配有文字说明，简洁明了，白色背景。{{selling_points}}', tips: '适合：工具、厨具' },
  { id: 'tpl-flash-sale', name: '限时抢购', icon: '⚡', industry: '通用', promptTemplate: '快节奏促销视频，{{product_name}}在聚光灯下展示，倒计时元素，价格标签动画，红金色调，紧迫感氛围。{{selling_points}}', tips: '适合：促销活动' },
  { id: 'tpl-social-proof', name: '买家秀合集', icon: '💬', industry: '通用', promptTemplate: '用户好评和实拍合集视频，多张{{product_name}}的真实使用照片轮播展示，五星好评动画，真实温暖的场景。{{selling_points}}', tips: '适合：服装、美妆' },
  // ===== 服装 (3) =====
  { id: 'tpl-ootd', name: '穿搭展示', icon: '👗', industry: '服装', promptTemplate: '时尚穿搭展示视频，模特身穿{{product_name}}在都市街头漫步，多角度展示搭配效果，慢动作特写，电影感色调，自然光线。{{selling_points}}', tips: '适合：服装、鞋帽、配饰' },
  { id: 'tpl-fabric', name: '面料特写', icon: '🧵', industry: '服装', promptTemplate: '面料细节特写视频，{{product_name}}的面料纹理、质地和光泽在微距镜头下展现，触感可视化，高端质感，慢速旋转展示。{{selling_points}}', tips: '适合：高端服装、家居纺织品' },
  { id: 'tpl-tryon', name: '试穿体验', icon: '🪞', industry: '服装', promptTemplate: '真实试穿体验视频，模特穿上{{product_name}}展示合身效果，日常活动中的动态表现，不同角度的真实呈现，无滤镜真实感。{{selling_points}}', tips: '适合：服装、内衣、运动服' },
  // ===== 美妆 (3) =====
  { id: 'tpl-before-after', name: '前后对比', icon: '✨', industry: '美妆', promptTemplate: '使用前后对比展示，左侧为使用前，右侧为使用{{product_name}}后的惊艳效果，慢动作过渡。{{selling_points}}', tips: '适合：护肤品、清洁剂' },
  { id: 'tpl-makeup-tutorial', name: '化妆教程', icon: '💄', industry: '美妆', promptTemplate: '化妆教程视频，使用{{product_name}}进行完整化妆过程演示，步骤标注清晰，顶光均匀照明，近距离特写，ASMR质感的化妆刷声音。{{selling_points}}', tips: '适合：彩妆、化妆工具' },
  { id: 'tpl-swatch', name: '色号试色', icon: '🎨', industry: '美妆', promptTemplate: '色号试色对比视频，{{product_name}}所有色号在手臂上逐一展示，自然光线和室内光线双场景，真实显色无滤镜，标签清晰标注。{{selling_points}}', tips: '适合：口红、粉底、眼影' },
  // ===== 食品 (3) =====
  { id: 'tpl-ingredient', name: '成分解析', icon: '🔬', industry: '食品', promptTemplate: '产品成分特写视频，{{product_name}}的核心成分逐一展示，微观镜头效果，成分名称标注动画，科技蓝白色调。{{selling_points}}', tips: '适合：食品、保健品、护肤品' },
  { id: 'tpl-cooking', name: '烹饪展示', icon: '🍳', industry: '食品', promptTemplate: '美食烹饪展示视频，{{product_name}}从准备到成品的完整烹饪过程，蒸汽升腾特效，色泽诱人的特写镜头，温馨家庭厨房氛围。{{selling_points}}', tips: '适合：食材、调味品、预制菜' },
  { id: 'tpl-food-asmr', name: '美食ASMR', icon: '🍜', industry: '食品', promptTemplate: 'ASMR风格美食视频，{{product_name}}的近距离食用/制作声音，清脆咀嚼声，热气腾腾的视觉效果，高饱和度色彩，诱人流心/拉丝特写。{{selling_points}}', tips: '适合：零食、方便食品、饮料' },
  // ===== 3C数码 (3) =====
  { id: 'tpl-tech-demo', name: '功能演示', icon: '📱', industry: '3C数码', promptTemplate: '产品功能演示视频，{{product_name}}的核心功能逐一操作展示，屏幕录制叠加，手指操作特写，科技感UI动画，深色背景+蓝色光效。{{selling_points}}', tips: '适合：手机、平板、智能设备' },
  { id: 'tpl-specs', name: '参数解读', icon: '📊', industry: '3C数码', promptTemplate: '产品参数可视化视频，{{product_name}}的关键规格以动态图表展示，数字滚动动画，对比行业平均水平，专业科技风格，暗色背景+霓虹蓝光。{{selling_points}}', tips: '适合：电脑、显示器、显卡' },
  { id: 'tpl-accessory', name: '配件搭配', icon: '🎧', industry: '3C数码', promptTemplate: '数码配件场景搭配视频，{{product_name}}在不同使用场景下展示，办公桌/咖啡厅/通勤途中，多设备联动展示，简洁现代风格。{{selling_points}}', tips: '适合：耳机、充电器、保护壳' },
  // ===== 家居 (3) =====
  { id: 'tpl-lifestyle', name: '场景种草', icon: '🌿', industry: '家居', promptTemplate: '生活方式场景视频，{{product_name}}融入日常使用场景中，温暖色调，自然光线，舒适放松的电影感画面。{{selling_points}}', tips: '适合：服装、家居' },
  { id: 'tpl-room-makeover', name: '空间改造', icon: '🏠', industry: '家居', promptTemplate: '空间改造前后对比视频，{{product_name}}如何改变空间氛围，快速切换效果，温馨家居灯光，收纳/装饰/功能提升的可视化展示。{{selling_points}}', tips: '适合：家具、收纳、灯具、装饰' },
  { id: 'tpl-assembly', name: '安装演示', icon: '🔧', industry: '家居', promptTemplate: '产品安装演示视频，{{product_name}}从开箱到安装完成的全过程，简化步骤展示，关键操作特写，时间压缩动画，清爽白色背景。{{selling_points}}', tips: '适合：家具、置物架、窗帘' },
  // ===== 母婴 (3) =====
  { id: 'tpl-baby-product', name: '婴儿用品', icon: '🍼', industry: '母婴', promptTemplate: '婴儿用品展示视频，{{product_name}}在温馨婴儿房中使用，柔和的自然光，婴儿舒适互动的温馨场景，安全的材质特写，温暖色调。{{selling_points}}', tips: '适合：婴儿用品、玩具' },
  { id: 'tpl-baby-food', name: '辅食制作', icon: '🥣', industry: '母婴', promptTemplate: '宝宝辅食制作视频，{{product_name}}的手工制作过程，新鲜食材逐步添加，细腻质地特写，营养标签动画，温暖明亮的厨房场景。{{selling_points}}', tips: '适合：辅食、奶粉、婴儿零食' },
  { id: 'tpl-toys', name: '玩具展示', icon: '🧸', industry: '母婴', promptTemplate: '儿童玩具展示视频，小朋友开心玩{{product_name}}的真实场景，玩具的趣味功能和互动展示，明亮色彩，欢快氛围，自然抓拍感。{{selling_points}}', tips: '适合：玩具、早教产品' },
  // ===== 工厂/溯源 (2) =====
  { id: 'tpl-factory', name: '工厂溯源', icon: '🏭', industry: '食品/制造', promptTemplate: '工厂生产过程展示，{{product_name}}从原料到成品的完整制作过程，现代化洁净工厂，自动化产线，专业品质感。{{selling_points}}', tips: '适合：食品、手工艺品' },
  { id: 'tpl-craft', name: '手工制作', icon: '🖐️', industry: '食品/制造', promptTemplate: '手工艺品制作过程，匠人精心制作{{product_name}}的每一步细节，温暖的工坊光线，工具和手艺的特写镜头，慢速展示，传统工艺质感。{{selling_points}}', tips: '适合：手工艺品、定制产品、文创' }
];

async function loadTemplates() {
  try {
    if (AUTH.token) {
      var tpls = await apiGet('/api/templates');
      if (tpls && tpls.length) {
        // 合并服务端模板（含自定义），去重保留内置最新
        var builtinIds = {};
        for (var i = 0; i < ECOM_TPL.length; i++) { builtinIds[ECOM_TPL[i].id] = true; }
        for (var j = 0; j < tpls.length; j++) {
          if (!builtinIds[tpls[j].id]) ECOM_TPL.push(tpls[j]);
        }
      }
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
  // 确保在生成页面显示表单
  if (_currentTab !== 'generate') {
    switchTab('generate');
    // 等待 DOM 切换完成后再显示表单
    setTimeout(function() { showTemplateForm(tpl); }, 100);
  } else {
    showTemplateForm(tpl);
  }
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

// ==================== 模板编辑器 ====================
function showTemplateEditor(tplOrNull) {
  var exist = document.getElementById('tplEditorModal');
  if (exist) exist.remove();
  var isEdit = !!tplOrNull;
  var modal = document.createElement('div');
  modal.id = 'tplEditorModal';
  modal.className = 'modal-overlay open';
  modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
  modal.innerHTML = '<div class="modal-content" style="max-width:520px;">'
    + '<div class="modal-header"><h2>' + (isEdit ? '✏️ 编辑模板' : '➕ 新建模板') + '</h2><button class="modal-close" onclick="document.getElementById(\'tplEditorModal\').remove()">✕</button></div>'
    + '<div class="modal-body">'
    + '<div class="param-group"><label class="param-label">模板名称</label><input type="text" id="tplEditName" value="' + escHtml(tplOrNull?.name || '') + '" placeholder="例如：夏日促销"></div>'
    + '<div class="param-group"><label class="param-label">分类</label><input type="text" id="tplEditCategory" value="' + escHtml(tplOrNull?.category || '') + '" placeholder="例如：product_show"></div>'
    + '<div class="param-group"><label class="param-label">适用行业</label><input type="text" id="tplEditIndustry" value="' + escHtml(tplOrNull?.industry || '通用') + '" placeholder="通用"></div>'
    + '<div class="param-group"><label class="param-label">图标 Emoji</label><input type="text" id="tplEditIcon" value="' + escHtml(tplOrNull?.icon || '📦') + '" placeholder="📦"></div>'
    + '<div class="param-group"><label class="param-label">提示词模板 <span class="label-hint">使用 {{product_name}} 和 {{selling_points}} 作为占位符</span></label><textarea id="tplEditPrompt" rows="4" style="width:100%;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-xs);color:var(--text-primary);padding:10px;font-family:var(--font);font-size:12px;resize:vertical;">' + escHtml(tplOrNull?.promptTemplate || '') + '</textarea></div>'
    + '<div class="param-group"><label class="param-label">使用提示</label><input type="text" id="tplEditTips" value="' + escHtml(tplOrNull?.tips || '') + '" placeholder="适合：xxx"></div>'
    + '<div class="payment-actions" style="margin-top:16px;">'
    + '<button class="btn btn-secondary" onclick="document.getElementById(\'tplEditorModal\').remove()">取消</button>'
    + '<button class="btn btn-primary" onclick="saveTemplate(\'' + (tplOrNull?.id || '') + '\')">💾 保存</button></div>'
    + '</div></div>';
  document.body.appendChild(modal);
  document.getElementById('tplEditName').focus();
}

async function saveTemplate(tplId) {
  var name = document.getElementById('tplEditName')?.value?.trim();
  var prompt = document.getElementById('tplEditPrompt')?.value?.trim();
  if (!name || !prompt) { toast('名称和提示词模板不能为空', 'error'); return; }
  var data = {
    name: name,
    category: document.getElementById('tplEditCategory')?.value?.trim() || 'custom',
    industry: document.getElementById('tplEditIndustry')?.value?.trim() || '通用',
    icon: document.getElementById('tplEditIcon')?.value?.trim() || '📦',
    promptTemplate: prompt,
    tips: document.getElementById('tplEditTips')?.value?.trim() || ''
  };
  try {
    if (tplId) {
      await apiPost('/api/templates/' + tplId, data);  // 实际上用 PUT，这里简化为 POST
      // 用 fetch 直接发 PUT
      await fetch('/api/templates/' + tplId, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + AUTH.token }, body: JSON.stringify(data) });
    } else {
      await apiPost('/api/templates', data);
    }
    document.getElementById('tplEditorModal')?.remove();
    toast(tplId ? '模板已更新' : '模板已创建', 'success');
    await loadTemplates();
    renderTemplateFullGrid();
    renderTemplateQuickBar();
    setupTemplateDelegation();
  } catch (e) { toast('保存失败: ' + e.message, 'error'); }
}

async function deleteTemplate(tplId) {
  if (!confirm('确定删除该模板？此操作不可恢复。')) return;
  try {
    await fetch('/api/templates/' + tplId, { method: 'DELETE', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + AUTH.token } });
    toast('模板已删除', 'success');
    await loadTemplates();
    renderTemplateFullGrid();
    renderTemplateQuickBar();
    setupTemplateDelegation();
  } catch (e) { toast('删除失败: ' + e.message, 'error'); }
}

// 更新模板全页渲染，加入编辑/删除按钮
var _origRenderTemplateFullGrid = renderTemplateFullGrid;
renderTemplateFullGrid = function() {
  var grid = document.getElementById('templateFullGrid');
  if (!grid) return;
  var tpls = ECOM_TPL;
  var html = '';
  // 新建按钮
  html += '<div class="template-card template-add-card" onclick="showTemplateEditor(null)">'
    + '<span class="tpl-icon">➕</span>'
    + '<div class="tpl-name">新建模板</div>'
    + '<div class="tpl-tip">创建自定义电商模板</div></div>';
  for (var i = 0; i < tpls.length; i++) {
    var t = tpls[i];
    var isOwner = AUTH.token && (t.userId === AUTH.user?.id || isAdmin());
    html += '<div class="template-card" data-tpl-id="' + t.id + '" title="' + escHtml(t.tips || '') + '" onclick="useTemplate(\'' + t.id + '\')">'
      + '<span class="tpl-icon">' + (t.icon || '📦') + '</span>'
      + '<div class="tpl-name">' + escHtml(t.name) + '</div>'
      + '<div class="tpl-tip">' + escHtml(t.tips || t.industry || '') + '</div>'
      + '<div class="tpl-card-actions">'
      + '<button class="btn btn-xs" onclick="event.stopPropagation();useTemplate(\'' + t.id + '\')">📋 使用</button>'
      + (isOwner ? '<button class="btn btn-xs" onclick="event.stopPropagation();showTemplateEditor(ECOM_TPL.find(function(x){return x.id===\'' + t.id + '\'}))">✏️</button>' : '')
      + (isOwner && !t.isSystem ? '<button class="btn btn-xs" onclick="event.stopPropagation();deleteTemplate(\'' + t.id + '\')" style="color:var(--error);">🗑</button>' : '')
      + '</div></div>';
  }
  grid.innerHTML = html;
  // 为模板全页设置事件委托
  setupFullGridDelegation();
};

// 页面加载后初始化事件委托
document.addEventListener('DOMContentLoaded', function() { setTimeout(setupTemplateDelegation, 600); });

// 模板全页的事件委托（处理动态渲染的卡片）
function setupFullGridDelegation() {
  var grid = document.getElementById('templateFullGrid');
  if (!grid || grid._fulldelegated) return;
  grid._fulldelegated = true;
  grid.addEventListener('click', function(e) {
    var card = e.target.closest('.template-card');
    if (!card) return;
    var tplId = card.getAttribute('data-tpl-id');
    // 如果卡片有 onclick 属性则让它处理，这里仅作后备
    if (tplId && !card.hasAttribute('onclick')) {
      useTemplate(tplId);
    }
  });
}
