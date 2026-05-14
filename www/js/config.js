// 配置常量
const C = {
  BASE: '',           // API 基础路径（同源部署时为空）
  PAGE_SIZE: 20,

  // 商品分类
  CATEGORIES: {
    candy:  { name: '糖果', icon: '🍬', color: '#e8789a' },
    wedding:{ name: '婚庆', icon: '💒', color: '#d4a853' },
    gift:   { name: '伴手礼', icon: '🎁', color: '#81d8d0' }
  },

  // 订单状态
  ORDER_STATUS: {
    pending:   { name: '待付款', color: '#e8b44f', bg: '#fef8e8' },
    paid:      { name: '已付款', color: '#81d8d0', bg: '#e8f8f6' },
    shipped:   { name: '已发货', color: '#d4786e', bg: '#fef0ed' },
    completed: { name: '已完成', color: '#6db893', bg: '#e8f5ed' },
    cancelled: { name: '已取消', color: '#999',    bg: '#f0f0f0' }
  },

  // 订单状态流转步骤
  ORDER_STEPS: ['pending', 'paid', 'shipped', 'completed'],

  // 模拟支付方式
  PAY_METHODS: [
    { id: 'mock', name: '模拟支付（测试用）', icon: '💳' }
  ]
};
