// pages/garden/garden.js — 知识花园（入口+课程列表+个人中心合一）
const app = getApp()

const PLANT_LEVELS = [
  { threshold: 0, emoji: '🌱', name: '种子' },
  { threshold: 10, emoji: '🌿', name: '嫩芽' },
  { threshold: 30, emoji: '🌾', name: '稻穗' },
  { threshold: 60, emoji: '🌻', name: '开花' },
  { threshold: 120, emoji: '🪴', name: '盆景' },
  { threshold: 250, emoji: '🌳', name: '大树' },
  { threshold: 500, emoji: '🏡', name: '花园' },
]

function calcPlant(completedNodes) {
  let level = 0
  for (let i = PLANT_LEVELS.length - 1; i >= 0; i--) {
    if (completedNodes >= PLANT_LEVELS[i].threshold) {
      return { level: i + 1, ...PLANT_LEVELS[i] }
    }
  }
  return { level: 1, ...PLANT_LEVELS[0] }
}

Page({
  data: {
    isLoading: true,
    // 花园
    plant: { level: 1, emoji: '🌱', name: '种子' },
    plantPoints: 0,
    // 用户
    stats: {
      completedNodes: 0,
      completedThemes: 0,
      totalPoints: 0,
      streak: 0,
    },
    achievements: [],
    unlockedAchievements: 0,
    // 课程
    themes: [],
    lastActiveTheme: null,
    // 预览数据
    recentHistory: [],
    favorites: [],
    favoriteCount: 0,
  },

  onLoad() {
    this.loadAll()
  },

  onShow() {
    this.loadAll()
  },

  loadAll() {
    if (!app.globalData.openid) {
      const checkId = setInterval(() => {
        if (app.globalData.openid) {
          clearInterval(checkId)
          this.loadAll()
        }
      }, 300)
      return
    }

    this.setData({ isLoading: true })

    // 并行加载
    wx.cloud.callFunction({ name: 'getGarden', data: { openid: app.globalData.openid } })
    .then(res => {
      if (res.result?.success && res.result.gardens?.length > 0) {
        const g = res.result.gardens[0]
        this.setData({ plantPoints: g.points || 0 })
      }
    })
    .catch(() => {})

    wx.cloud.callFunction({ name: 'getThemes', data: { openid: app.globalData.openid } })
    .then(res => {
      if (res.result?.success) {
        let themes = res.result.themes || []
        this.setData({ themes })
      }
    })
    .catch(() => {})

    wx.cloud.callFunction({ name: 'getUserProfile', data: { openid: app.globalData.openid } })
    .then(res => {
      if (res.result?.success) {
        const stats = res.result.stats
        const plant = calcPlant(stats.completedNodes || 0)
        let lastActiveTheme = null
        const themes = this.data.themes || []
        if (themes.length > 0) {
          lastActiveTheme = themes.reduce((a, b) => {
            const aTime = a.lastStudiedAt || a.startedAt || 0
            const bTime = b.lastStudiedAt || b.startedAt || 0
            return aTime > bTime ? a : b
          })
        }
        const unlockedAchievements = (res.result.achievements || []).filter(a => a.unlocked).length
        this.setData({
          stats,
          achievements: res.result.achievements || [],
          unlockedAchievements,
          plant,
          lastActiveTheme,
        })
      }
    })
    .catch(() => {})

    // 加载最近历史记录（预览用）
    wx.cloud.callFunction({ name: 'getHistory', data: { openid: app.globalData.openid, limit: 3 } })
    .then(res => {
      if (res.result?.success && res.result.history?.length > 0) {
        this.setData({ recentHistory: res.result.history })
      }
    })
    .catch(() => {})

    // 加载收藏预览
    wx.cloud.callFunction({ name: 'getFavorites', data: { openid: app.globalData.openid, limit: 3 } })
    .then(res => {
      if (res.result?.success) {
        this.setData({
          favorites: res.result.favorites || [],
          favoriteCount: res.result.count || 0,
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
