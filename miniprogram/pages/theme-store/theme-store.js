// pages/theme-store/theme-store.js — AI 课程生成器
const app = getApp()

Page({
  data: {
    aiKeyword: '',
    newTheme: null,
    isGenerating: false,
    userProfile: null,
    profileLoaded: false,
  },

  onShow() {
    this.loadUserProfile()
  },

  loadUserProfile() {
    if (!app.globalData.openid) return
    wx.cloud.callFunction({
      name: 'getUserProfile',
      data: { openid: app.globalData.openid }
    }).then(res => {
      if (res.result?.success && res.result?.user?.profile) {
        this.setData({ userProfile: res.result.user.profile, profileLoaded: true })
      } else {
        this.setData({ profileLoaded: true })
      }
    }).catch(() => {
      this.setData({ profileLoaded: true })
    })
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

    const { userProfile } = this.data
    if (!userProfile) {
      wx.showModal({
        title: '需要个人画像',
        content: 'AI 需要了解你的年龄、职业和兴趣才能生成定制课程，现在去设置？',
        confirmText: '去设置',
        success: res => {
          if (res.confirm) this.onGoProfile()
        }
      })
      return
    }

    this.setData({ isGenerating: true })

    wx.cloud.callFunction({
      name: 'generateTheme',
      data: {
        openid: app.globalData.openid,
        profile: userProfile,
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

  // 前往个人画像
  onGoProfile() {
    wx.navigateTo({ url: '/pages/learn/learn' })
  },

  // 再生成一个（重置状态）
  onReset() {
    this.setData({
      aiKeyword: '',
      newTheme: null,
    })
  },
})
