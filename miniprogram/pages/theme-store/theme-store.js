// pages/theme-store/theme-store.js — AI 课程生成器
const app = getApp()

const GEN_STAGES = [
  { text: '正在分析你的兴趣方向...', progress: 20 },
  { text: '正在构思课程结构...', progress: 50 },
  { text: '正在生成课程内容...', progress: 75 },
  { text: '课程即将准备就绪...', progress: 90 },
]

Page({
  data: {
    aiKeyword: '',
    newTheme: null,
    isGenerating: false,
    userProfile: null,
    profileLoaded: false,
    interestTags: [],
    genStage: '',
    genProgress: 0,
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
        const profile = res.result.user.profile
        const interests = (profile.interests || []).filter(t => t.length > 0)
        this.setData({
          userProfile: profile,
          profileLoaded: true,
          interestTags: interests,
        })
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

  // 进度条动画
  _startProgress() {
    let i = 0
    const tick = () => {
      if (i >= GEN_STAGES.length || !this.data.isGenerating) return
      this.setData({
        genStage: GEN_STAGES[i].text,
        genProgress: GEN_STAGES[i].progress,
      })
      i++
      if (i < GEN_STAGES.length) {
        setTimeout(tick, 2500)
      }
    }
    this.setData({ genStage: '正在准备...', genProgress: 5 })
    setTimeout(tick, 800)
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
    this._startProgress()

    wx.cloud.callFunction({
      name: 'generateTheme',
      data: {
        openid: app.globalData.openid,
        profile: userProfile,
        themeName: keyword,
      },
      success: res => {
        if (res.result && res.result.success) {
          const theme = res.result.theme
          this.setData({
            isGenerating: false,
            genProgress: 100,
            genStage: '✅ 课程已生成',
            newTheme: {
              id: theme._id,
              name: theme.name,
              desc: theme.description || '',
              nodesCount: theme.totalNodes || 0,
            },
          })
          wx.showToast({ title: '✅ 课程生成成功', icon: 'success' })
        } else {
          this.setData({ isGenerating: false })
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

  // 点击兴趣标签
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
    wx.navigateTo({ url: '/pages/profile/profile?edit=1' })
  },

  onLoad(opts) {
    if (opts && opts.fromOnboard === '1') {
      wx.showToast({ title: '画像已保存，开始生成你的第一门课程吧！', icon: 'none' })
    }
  },

  // 再生成一个（重置状态）
  onReset() {
    this.setData({
      aiKeyword: '',
      newTheme: null,
      genStage: '',
      genProgress: 0,
    })
  },
})
