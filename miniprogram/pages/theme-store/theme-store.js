// pages/theme-store/theme-store.js
const app = getApp()

Page({
  data: {
    themes: [],
    filteredThemes: [],
    searchKeyword: '',
    selectedCategory: 'all',
    isLoading: false,
    categories: [
      { id: 'all', name: '全部' },
      { id: 'economics', name: '经济学' },
      { id: 'psychology', name: '心理学' },
      { id: 'business', name: '商业' },
      { id: 'thinking', name: '思维' },
    ],
  },

  onLoad() {
    this.loadStoreThemes()
  },

  // 加载主题库
  loadStoreThemes() {
    this.setData({ isLoading: true })

    // 从云端获取预置主题库
    wx.cloud.callFunction({
      name: 'getStoreThemes',
      data: {},
      success: res => {
        this.setData({ isLoading: false })

        if (res.result && res.result.success) {
          this.setData({
            themes: res.result.themes || [],
            filteredThemes: res.result.themes || [],
          })
        }
      },
      fail: err => {
        this.setData({ isLoading: false })
        console.error('加载主题库失败', err)
        // 使用模拟数据
        this.setData({
          themes: this.getSimulatedThemes(),
          filteredThemes: this.getSimulatedThemes(),
        })
      }
    })
  },

  // 搜索
  onSearch(e) {
    const keyword = e.detail.value
    this.setData({ searchKeyword: keyword })
    this.filterThemes()
  },

  // 筛选主题
  filterThemes() {
    const { themes, searchKeyword, selectedCategory } = this.data

    let filtered = themes

    // 按分类筛选
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.tags?.includes(selectedCategory))
    }

    // 按关键词搜索
    if (searchKeyword) {
      const kw = searchKeyword.toLowerCase()
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(kw) ||
        t.description.toLowerCase().includes(kw)
      )
    }

    this.setData({ filteredThemes: filtered })
  },

  // 选择分类
  onSelectCategory(e) {
    const category = e.currentTarget.dataset.category
    this.setData({ selectedCategory: category }, () => {
      this.filterThemes()
    })
  },

  // 添加主题
  onAddTheme(e) {
    const themeId = e.currentTarget.dataset.themeId

    wx.showLoading({ title: '添加中...' })

    wx.cloud.callFunction({
      name: 'addTheme',
      data: {
        openid: app.globalData.openid,
        themeId,
      },
      success: res => {
        wx.hideLoading()

        if (res.result && res.result.success) {
          wx.showToast({ title: '添加成功', icon: 'success' })
          // 跳转到主题页面
          setTimeout(() => {
            wx.navigateBack()
          }, 1500)
        } else {
          wx.showToast({ title: res.result?.error || '添加失败', icon: 'none' })
        }
      },
      fail: err => {
        wx.hideLoading()
        console.error('添加主题失败', err)
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },

  // AI 推荐主题
  onAIRecommend(e) {
    const keyword = e.detail.value?.trim()
    if (!keyword) {
      wx.showToast({ title: '请输入想学的主题', icon: 'none' })
      return
    }

    wx.showLoading({ title: 'AI 生成中...' })

    wx.cloud.callFunction({
      name: 'generateTheme',
      data: {
        openid: app.globalData.openid,
        themeName: keyword,
      },
      success: res => {
        wx.hideLoading()

        if (res.result && res.result.success) {
          wx.showToast({ title: '主题创建成功', icon: 'success' })
          setTimeout(() => {
            wx.navigateBack()
          }, 1500)
        } else {
          wx.showToast({ title: res.result?.error || '创建失败', icon: 'none' })
        }
      },
      fail: err => {
        wx.hideLoading()
        console.error('AI 推荐失败', err)
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },

  // 获取模拟主题数据
  getSimulatedThemes() {
    return [
      {
        _id: 'theme_economics',
        name: '经济学入门',
        description: '从零开始理解经济学思维',
        cover: '',
        totalNodes: 10,
        tags: ['经济学', '思维模型'],
        emoji: '📊',
        nodeCount: 10,
      },
      {
        _id: 'theme_psychology',
        name: '心理学基础',
        description: '理解人类行为背后的心理机制',
        cover: '',
        totalNodes: 10,
        tags: ['心理学', '自我认知'],
        emoji: '🧠',
        nodeCount: 10,
      },
      {
        _id: 'theme_thinking',
        name: '思维模型大全',
        description: '掌握高效思考的工具箱',
        cover: '',
        totalNodes: 12,
        tags: ['思维', '效率'],
        emoji: '💡',
        nodeCount: 12,
      },
      {
        _id: 'theme_business',
        name: '商业分析基础',
        description: '理解商业世界的基本逻辑',
        cover: '',
        totalNodes: 8,
        tags: ['商业', '分析'],
        emoji: '💼',
        nodeCount: 8,
      },
      {
        _id: 'theme_self',
        name: '自我提升指南',
        description: '成为更好的自己',
        cover: '',
        totalNodes: 10,
        tags: ['自我提升', '成长'],
        emoji: '🌱',
        nodeCount: 10,
      },
      {
        _id: 'theme_communication',
        name: '沟通技巧',
        description: '提升人际交往能力',
        cover: '',
        totalNodes: 8,
        tags: ['沟通', '人际'],
        emoji: '💬',
        nodeCount: 8,
      },
    ]
  },
})