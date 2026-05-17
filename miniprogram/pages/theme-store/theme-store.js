// pages/theme-store/theme-store.js — AI 课程生成器
const app = getApp()

Page({
  data: {
    aiKeyword: '',
    newTheme: null,
    isGenerating: false,
  },

  onAIInput(e) {
    this.setData({ aiKeyword: e.detail.value || '' })
  },

  // AI 生成课程
  onAIRecommend() {
    const keyword = this.data.aiKeyword.trim()
    if (!keyword) {
      wx.showToast({ title: '请输入想学的主题', icon: 'none' })
      return
    }

    this.setData({ isGenerating: true })

    wx.cloud.callFunction({
      name: 'generateTheme',
      data: {
        openid: app.globalData.openid,
        themeName: keyword,
      },
      success: res => {
        this.setData({ isGenerating: false })

        if (res.result && res.result.success) {
          this.setData({
            newTheme: {
              id: res.result.themeId,
              name: keyword,
            }
          })
          wx.showToast({ title: '✅ 课程生成成功', icon: 'success' })
        } else {
          wx.showToast({ title: res.result?.error || '创建失败', icon: 'none' })
        }
      },
      fail: err => {
        this.setData({ isGenerating: false })
        console.error('AI 生成失败', err)
        wx.showToast({ title: '网络错误，请重试', icon: 'none' })
      }
    })
  },

  // 点击示例标签
  onExample(e) {
    const keyword = e.currentTarget.dataset.keyword
    this.setData({ aiKeyword: keyword })
    this.onAIRecommend()
  },

  // 前往学习
  onGoLearn() {
    const { newTheme } = this.data
    if (!newTheme) return
    app.setLearnContext({ themeId: newTheme.id, mode: 'new' })
    wx.reLaunch({ url: '/pages/learn/learn' })
  },

  // 再生成一个（重置状态）
  onReset() {
    this.setData({
      aiKeyword: '',
      newTheme: null,
    })
  },
})
