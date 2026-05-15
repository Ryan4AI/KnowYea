// pages/themes/themes.js
const app = getApp()

Page({
  data: {
    themes: [],
    isLoading: false,
  },

  onLoad() {
    this.loadThemes()
  },

  onShow() {
    this.loadThemes()
  },

  // 加载主题列表
  loadThemes() {
    if (!app.globalData.openid) return

    this.setData({ isLoading: true })

    wx.cloud.callFunction({
      name: 'getThemes',
      data: { openid: app.globalData.openid },
      success: res => {
        this.setData({ isLoading: false })

        if (res.result && res.result.success) {
          const themes = res.result.themes || []

          // 补充植物图标
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
      },
      fail: err => {
        this.setData({ isLoading: false })
        console.error('加载主题失败', err)
      }
    })
  },

  // 切换当前学习主题并回到学习页（learn 为 tabBar 页面，必须用 switchTab）
  switchToLearn(themeId) {
    if (!app.globalData.openid) {
      wx.showToast({ title: '登录中，请稍后再试', icon: 'none' })
      return
    }

    wx.showLoading({ title: '切换中...' })

    wx.cloud.callFunction({
      name: 'switchTheme',
      data: {
        openid: app.globalData.openid,
        themeId,
      },
      success: res => {
        wx.hideLoading()
        if (res.result && res.result.success) {
          wx.switchTab({ url: '/pages/learn/learn' })
        } else {
          wx.showToast({ title: res.result?.error || '切换失败', icon: 'none' })
        }
      },
      fail: err => {
        wx.hideLoading()
        console.error('切换主题失败', err)
        wx.showToast({ title: '网络错误', icon: 'none' })
      },
    })
  },

  // 继续学习
  onContinue(e) {
    const themeId = e.currentTarget.dataset.themeId
    this.switchToLearn(themeId)
  },

  // 查看详情：进入该主题当前节点（复习不影响进度）
  onReview(e) {
    const themeId = e.currentTarget.dataset.themeId
    app.setLearnContext({ themeId, mode: 'review' })
    wx.switchTab({ url: '/pages/learn/learn' })
  },

  // 添加主题
  onAddTheme() {
    wx.navigateTo({
      url: '/pages/theme-store/theme-store'
    })
  },
})