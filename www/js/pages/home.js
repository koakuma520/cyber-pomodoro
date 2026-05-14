// 首页 — 商品目录
var homePage = {
  products: [],
  category: 'all',
  search: '',
  page: 1,
  totalPages: 1,

  async render() {
    P.currentPage = 'home';
    updateHeader();
    renderBottomNav();

    var content = document.getElementById('content');
    content.innerHTML = '';

    // Banner
    var banner = document.createElement('div');
    banner.className = 'banner';
    banner.style.background = 'linear-gradient(135deg, #f5b8bb, #e8878a, #7ec8c0)';
    banner.innerHTML = '<div style="text-align:center;"><div style="font-size:1rem;">🈴 从一颗糖到一场婚礼</div><div style="font-size:0.65rem;font-weight:400;opacity:0.85;margin-top:4px;">会泽新人的囍事专家 — 金鼎囍铺全包了</div></div>';
    content.appendChild(banner);

    // 搜索栏
    var searchDiv = document.createElement('div');
    searchDiv.innerHTML = renderSearchBar(this.search);
    content.appendChild(searchDiv);

    // 分类标签
    var catDiv = document.createElement('div');
    catDiv.innerHTML = renderCategoryTabs(this.category);
    content.appendChild(catDiv);

    // 试吃包推荐卡片
    var trialDiv = document.createElement('div');
    trialDiv.innerHTML = '<div class="trial-card" onclick="window.location.hash=\'#/product/trial001\'">' +
      '<div class="trial-card-icon">🎁</div>' +
      '<div class="trial-card-info">' +
        '<span class="trial-card-badge">🔥 新人首选</span>' +
        '<div class="trial-card-name">9.9元喜糖试吃包（包邮）</div>' +
        '<div class="trial-card-desc">3-5款自选糖+风格盒样，先试吃再下单</div>' +
      '</div>' +
      '<div class="trial-card-price">¥9.9</div>' +
    '</div>';
    content.appendChild(trialDiv);

    // 商品网格容器
    var gridDiv = document.createElement('div');
    gridDiv.id = 'productGrid';
    gridDiv.className = 'product-grid';
    content.appendChild(gridDiv);

    // 加载更多
    var moreDiv = document.createElement('div');
    moreDiv.id = 'loadMore';
    moreDiv.style.cssText = 'text-align:center;padding:16px;';
    content.appendChild(moreDiv);

    // 绑定事件
    this.bindEvents();

    // 加载数据
    await this.loadProducts();
  },

  bindEvents() {
    var self = this;

    // 分类点击
    document.querySelectorAll('.cat-tab').forEach(function (el) {
      el.addEventListener('click', function () {
        self.category = el.getAttribute('data-cat');
        self.search = '';
        self.page = 1;
        document.getElementById('searchInput').value = '';
        document.getElementById('searchClear').classList.remove('show');
        self.loadProducts();
        // 更新分类标签样式
        document.querySelectorAll('.cat-tab').forEach(function (t) { t.classList.remove('active'); });
        el.classList.add('active');
      });
    });

    // 搜索
    var searchInput = document.getElementById('searchInput');
    var searchClear = document.getElementById('searchClear');
    if (searchInput) {
      var debounceTimer;
      searchInput.addEventListener('input', function () {
        clearTimeout(debounceTimer);
        var val = searchInput.value;
        searchClear.classList.toggle('show', val.length > 0);
        debounceTimer = setTimeout(function () {
          self.search = val;
          self.page = 1;
          self.loadProducts();
        }, 300);
      });
    }
    if (searchClear) {
      searchClear.addEventListener('click', function () {
        searchInput.value = '';
        searchClear.classList.remove('show');
        self.search = '';
        self.page = 1;
        self.loadProducts();
      });
    }
  },

  async loadProducts() {
    var gridDiv = document.getElementById('productGrid');
    var moreDiv = document.getElementById('loadMore');

    try {
      gridDiv.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted);">加载中...</div>';

      var params = { page: this.page, limit: 20 };
      if (this.category && this.category !== 'all') params.category = this.category;
      if (this.search) params.search = this.search;

      var data = await apiGet('/api/products', params);
      this.products = this.page === 1 ? data.items : this.products.concat(data.items);
      this.totalPages = data.totalPages;

      // 渲染商品
      if (this.products.length === 0) {
        gridDiv.innerHTML = '<div style="grid-column:1/-1;"><div class="empty-state"><div class="empty-icon">🔍</div><p>没有找到相关商品</p></div></div>';
        moreDiv.innerHTML = '';
      } else {
        gridDiv.innerHTML = this.products.map(function (p) {
          return renderProductCard(p);
        }).join('');

        // 商品点击事件
        gridDiv.querySelectorAll('.product-card').forEach(function (card) {
          card.addEventListener('click', function () {
            var id = card.getAttribute('data-id');
            window.location.hash = '#/product/' + id;
          });
        });
      }

      // 加载更多
      if (this.page < this.totalPages) {
        moreDiv.innerHTML = '<button class="btn btn-secondary btn-sm" id="loadMoreBtn">加载更多</button>';
        var self = this;
        document.getElementById('loadMoreBtn').addEventListener('click', function () {
          self.page++;
          self.loadProducts();
        });
      } else {
        moreDiv.innerHTML = this.products.length > 0 ? '<p style="color:var(--text-muted);font-size:0.8rem;">已加载全部商品</p>' : '';
      }
    } catch (e) {
      gridDiv.innerHTML = '<div style="grid-column:1/-1;"><div class="empty-state"><div class="empty-icon">😢</div><p>加载失败，请刷新重试</p></div></div>';
    }
  }
};
