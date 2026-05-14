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

  // 继续学习
  onContinue(e) {
    const themeId = e.currentTarget.dataset.themeId
    // 跳转到学习页面
    wx.navigateTo({
      url: `/pages/learn/learn?themeId=${themeId}`
    })
  },

  // 复习
  onReview(e) {
    const themeId = e.currentTarget.dataset.themeId
    wx.navigateTo({
      url: `/pages/learn/learn?themeId=${themeId}&mode=review`
    })
  },

  // 添加主题
  onAddTheme() {
    wx.navigateTo({
      url: '/pages/theme-store/theme-store'
    })
  },
})