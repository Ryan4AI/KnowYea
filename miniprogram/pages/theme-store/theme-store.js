// pages/theme-store/theme-store.js
const app = getApp()

Page({
  data: {
    themes: [],
    filteredThemes: [],
    searchKeyword: '',
    selectedCategory: 'all',
    isLoading: false,
    userInterests: [],
    userThemeIds: [],
    categories: [{ id: 'all', name: '全部' }],
    newTheme: null, // AI 生成成功后暂存
    aiKeyword: '',
  },

  onShow() {
    this.loadStoreThemes()
  },

  // 加载主题库 + 用户数据
  loadStoreThemes() {
    if (!app.globalData.openid) {
      const checkId = setInterval(() => {
        if (app.globalData.openid) {
          clearInterval(checkId)
          this.loadStoreThemes()
        }
      }, 300)
      return
    }

    this.setData({ isLoading: true })

    // 并行加载预置课程 + 用户兴趣 + 已有课程
    Promise.all([
      new Promise(resolve => {
        wx.cloud.callFunction({ name: 'getStoreThemes', data: {} })
          .then(res => resolve(res.result?.themes || []))
          .catch(() => resolve(this.getSimulatedThemes()))
      }),
      new Promise(resolve => {
        wx.cloud.callFunction({ name: 'getUserProfile', data: { openid: app.globalData.openid } })
          .then(res => resolve(res.result?.user?.profile?.interests || []))
          .catch(() => resolve([]))
      }),
      new Promise(resolve => {
        wx.cloud.callFunction({ name: 'getThemes', data: { openid: app.globalData.openid } })
          .then(res => resolve((res.result?.themes || []).map(t => t._id)))
          .catch(() => resolve([]))
      }),
    ]).then(([themes, interests, userThemeIds]) => {
      // 构建分类：用户兴趣标签 + 全部
      const allCategories = [{ id: 'all', name: '全部' }]
      const added = new Set()
      for (const id of userThemeIds) added.add(id)

      // 标记已添加
      for (const t of themes) {
        t.added = added.has(t._id)
      }

      // 根据主题的 tags 提取分类
      const tagSet = new Set()
      for (const t of themes) {
        if (t.tags) for (const tag of t.tags) tagSet.add(tag)
      }
      // 优先展示用户感兴趣的 tag
      for (const interest of interests) {
        if (tagSet.has(interest.toLowerCase().replace(/\s/g, ''))) {
          allCategories.push({ id: interest, name: interest, recommended: true })
        }
      }
      // 补充其他 tag
      for (const tag of tagSet) {
        if (!allCategories.find(c => c.id === tag)) {
          allCategories.push({ id: tag, name: tag })
        }
      }

      this.setData({
        themes,
        userInterests: interests,
        userThemeIds,
        categories: allCategories,
        isLoading: false,
      })
      this.filterThemes()
    })
  },

  // 搜索（防抖不要了，小程序 bindinput 够快）
  onSearch(e) {
    this.setData({ searchKeyword: e.detail.value || '' })
    this.filterThemes()
  },

  // 筛选主题
  filterThemes() {
    const { themes, searchKeyword, selectedCategory } = this.data
    let filtered = themes

    if (selectedCategory !== 'all') {
      const kw = selectedCategory.toLowerCase()
      filtered = filtered.filter(t =>
        (t.tags || []).some(tag => tag.toLowerCase() === kw)
      )
    }

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
          // 本地标记已添加，刷新列表
          const userThemeIds = [...this.data.userThemeIds, themeId]
          this.setData({ userThemeIds })
          const themes = this.data.themes.map(t => {
            if (t._id === themeId) t.added = true
            return t
          })
          this.setData({ themes })
          this.filterThemes()
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

  onAIInput(e) {
    this.setData({ aiKeyword: e.detail.value || '' })
  },

  // AI 推荐主题
  onAIRecommend() {
    const keyword = this.data.aiKeyword.trim()
    if (!keyword) {
      wx.showToast({ title: '请输入想学的主题', icon: 'none' })
      return
    }
    this.doGenerate(keyword)
  },

  doGenerate(keyword) {
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
          // 不跳转，留在页面显示结果
          this.setData({
            newTheme: {
              id: res.result.themeId,
              name: keyword,
              description: `已生成「${keyword}」专属课程`,
            }
          })
          wx.showToast({ title: '生成成功', icon: 'success' })
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

  // 前往学习生成的课程
  onGoLearn() {
    const { newTheme } = this.data
    if (!newTheme) return
    app.setLearnContext({ themeId: newTheme.id, mode: 'new' })
    wx.reLaunch({ url: '/pages/learn/learn' })
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