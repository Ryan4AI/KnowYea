// pages/garden/garden.js — 知识花园（入口+课程列表+个人中心合一）
const app = getApp()

Page({
  data: {
    isLoading: true,
    // 花园
    plantLevel: 0,
    plantPoints: 0,
    plantEmoji: '🌱',
    // 用户
    user: null,
    stats: {
      completedNodes: 0,
      completedThemes: 0,
      totalPoints: 0,
      streak: 0,
    },
    achievements: [],
    // 课程
    themes: [],
  },

  onLoad() {
    this.loadAll()
  },

  onShow() {
    this.loadAll()
  },

  loadAll() {
    if (!app.globalData.openid) {
      // 等 openid 就绪
      const checkId = setInterval(() => {
        if (app.globalData.openid) {
          clearInterval(checkId)
          this.loadAll()
        }
      }, 300)
      return
    }

    this.setData({ isLoading: true })

    // 并行加载花园、课程、个人数据
    wx.cloud.callFunction({ name: 'getGarden', data: { openid: app.globalData.openid } })
    .then(res => {
      if (res.result?.success && res.result.gardens?.length > 0) {
        const g = res.result.gardens[0]
        this.setData({
          plantLevel: g.plantLevel || 0,
          plantPoints: g.points || 0,
        })
      }
    })
    .catch(() => {})

    wx.cloud.callFunction({ name: 'getThemes', data: { openid: app.globalData.openid } })
    .then(res => {
      if (res.result?.success) {
        let themes = res.result.themes || []
        themes.forEach(t => {
          const completed = t.completedCount || 0
          if (completed >= 10) t.plantEmoji = '🍎'
          else if (completed >= 7) t.plantEmoji = '🌸'
          else if (completed >= 4) t.plantEmoji = '🌾'
          else if (completed >= 1) t.plantEmoji = '🌿'
          else t.plantEmoji = '🌱'
        })
        this.setData({ themes })
      }
    })
    .catch(() => {})

    wx.cloud.callFunction({ name: 'getUserProfile', data: { openid: app.globalData.openid } })
    .then(res => {
      if (res.result?.success) {
        this.setData({
          user: res.result.user,
          stats: res.result.stats,
          achievements: res.result.achievements || [],
        })
      }
    })
    .catch(() => {})
    .finally(() => {
      this.setData({ isLoading: false })
    })
  },

  // 从花园进入某个课程学习
  onContinue(e) {
    const themeId = e.currentTarget.dataset.themeId
    if (!app.globalData.openid) {
      wx.showToast({ title: '请稍后再试', icon: 'none' })
      return
    }

    wx.showLoading({ title: '切换中...' })

    wx.cloud.callFunction({
      name: 'switchTheme',
      data: { openid: app.globalData.openid, themeId },
      success: res => {
        wx.hideLoading()
        if (res.result?.success) {
          wx.reLaunch({ url: '/pages/learn/learn' })
        } else {
          wx.showToast({ title: res.result?.error || '切换失败', icon: 'none' })
        }
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({ title: '网络错误', icon: 'none' })
      },
    })
  },

  // 复习模式
  onReview(e) {
    const themeId = e.currentTarget.dataset.themeId
    app.setLearnContext({ themeId, mode: 'review' })
    wx.reLaunch({ url: '/pages/learn/learn' })
  },

  // 子页面跳转
  onNavigateTo(e) {
    const page = e.currentTarget.dataset.page
    const routes = {
      history: '/pages/history/history',
      favorites: '/pages/favorites/favorites',
      achievements: '/pages/achievements/achievements',
      settings: '/pages/settings/settings',
    }
    if (routes[page]) {
      wx.navigateTo({ url: routes[page] })
    }
  },

  // 添加课程
  onAddTheme() {
    wx.navigateTo({ url: '/pages/theme-store/theme-store' })
  },

  // 编辑画像
  onEditProfile() {
    wx.navigateTo({ url: '/pages/profile/profile' })
  },
})
