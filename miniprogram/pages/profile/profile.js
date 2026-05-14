// pages/profile/profile.js
const app = getApp()

Page({
  data: {
    user: null,
    stats: {
      completedNodes: 0,
      completedThemes: 0,
      totalPoints: 0,
      streak: 0,
    },
    achievements: [],
    recentThemes: [],
  },

  onLoad() {
    this.loadProfile()
  },

  onShow() {
    this.loadProfile()
  },

  loadProfile() {
    if (!app.globalData.openid) return

    wx.cloud.callFunction({
      name: 'getUserProfile',
      data: { openid: app.globalData.openid },
      success: res => {
        if (res.result && res.result.success) {
          this.setData({
            user: res.result.user,
            stats: res.result.stats,
            achievements: res.result.achievements || [],
          })
        }
      },
      fail: err => {
        console.error('加载个人中心失败', err)
      }
    })
  },

  // 跳转到各子页面
  onNavigateTo(e) {
    const page = e.currentTarget.dataset.page
    const routes = {
      history: '/pages/history/history',
      favorites: '/pages/favorites/favorites',
      achievements: '/pages/achievements/achievements',
      garden: '/pages/garden/garden',
      settings: '/pages/settings/settings',
    }
    if (routes[page]) {
      wx.navigateTo({ url: routes[page] })
    }
  },
})