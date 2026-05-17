// pages/profile/profile.js — 个人中心（仅已有画像时展示）
const app = getApp()

Page({
  data: {
    user: null,
    userProfile: null,
    stats: { completedNodes: 0, completedThemes: 0, totalPoints: 0, streak: 0 },
    achievements: [],
    recentThemes: [],
    profileSlogan: '',
  },

  onLoad() {
    this.loadProfile()
  },

  onShow() {
    // 如果刚从画像编辑页返回，重新加载
    this.loadProfile()
  },

  loadProfile() {
    if (!app.globalData.openid) return

    wx.cloud.callFunction({
      name: 'getUserProfile',
      data: { openid: app.globalData.openid },
      success: res => {
        if (res.result && res.result.success) {
          const profile = res.result.user?.profile
          // 没画像 → 跳转到引导页
          if (!profile) {
            wx.redirectTo({ url: '/pages/learn/learn' })
            return
          }
          const stats = res.result.stats || { completedNodes: 0, completedThemes: 0, totalPoints: 0, streak: 0 }
          const interests = profile.interests || []
          const slogan = `${profile.occupation || ''}${interests.length > 0 ? ' · ' + interests.join('、') : ''}`
          this.setData({
            user: res.result.user,
            userProfile: profile,
            stats,
            achievements: res.result.achievements || [],
            profileSlogan: slogan,
          })
        }
      },
      fail: err => {
        console.error('加载个人中心失败', err)
      },
    })
  },

  onGoEditProfile() {
    wx.navigateTo({ url: '/pages/learn/learn' })
  },

  onNavigateTo(e) {
    const routes = {
      history: '/pages/history/history',
      favorites: '/pages/favorites/favorites',
      achievements: '/pages/achievements/achievements',
      garden: '/pages/garden/garden',
      settings: '/pages/settings/settings',
    }
    const page = e.currentTarget.dataset.page
    if (routes[page]) wx.navigateTo({ url: routes[page] })
  },
})
