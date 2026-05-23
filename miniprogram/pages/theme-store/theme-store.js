// pages/theme-store/theme-store.js — AI 课程生成器
const app = getApp()
const { loadInterestTags, callGenerateTheme, startProgressSimulation } = require('../../services/course-generator')

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

  onLoad(opts) {
    if (opts && opts.fromOnboard === '1') {
      this._autoGenerate = true
    }
  },

  onShow() {
    this.loadUserProfile()
  },

  loadUserProfile() {
    if (!app.globalData.openid) return
    wx.cloud.callFunction({
      name: 'getUser',
      data: { openid: app.globalData.openid }
    }).then(res => {
      const resultData = res.result?.data || {}
      const userData = resultData.user || {}
      const profile = userData.profile || userData
      if (res.result?.success && resultData.user) {
        this.setData({
          userProfile: profile,
          profileLoaded: true,
        })
        loadInterestTags(app.globalData.openid).then(tags => {
          this.setData({ interestTags: tags })
          if (this._autoGenerate && tags.length > 0) {
            this._autoGenerate = false
            const keyword = tags[0]
            this.setData({ aiKeyword: keyword })
            setTimeout(() => this.onAIRecommend(), 400)
          }
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
        success: res => { if (res.confirm) this.onGoProfile() }
      })
      return
    }

    this.setData({ isGenerating: true })

    this._cancelProgress = startProgressSimulation((stage, progress) => {
      this.setData({ genStage: stage, genProgress: progress })
    })

    callGenerateTheme(app.globalData.openid, userProfile, keyword).then(result => {
      this._cancelProgress?.()
      if (result.success) {
        this.setData({
          isGenerating: false,
          genProgress: 100,
          genStage: '✅ 课程已生成',
          newTheme: result.theme,
        })
        wx.showToast({ title: '✅ 课程生成成功', icon: 'success' })
      } else {
        this.setData({ isGenerating: false })
        wx.showToast({ title: result.error, icon: 'none' })
      }
    }).catch(err => {
      this._cancelProgress?.()
      this.setData({ isGenerating: false })
      console.error('AI 生成失败', err)
      wx.showToast({ title: '网络错误，请重试', icon: 'none' })
    })
  },

  onExample(e) {
    this.setData({ aiKeyword: e.currentTarget.dataset.keyword })
    this.onAIRecommend()
  },

  onGoLearn() {
    const { newTheme } = this.data
    if (!newTheme) return
    app.setLearnContext({ courseId: newTheme.id, mode: 'new' })
    wx.reLaunch({ url: '/pages/learn/learn' })
  },

  onGoProfile() {
    wx.navigateTo({ url: '/pages/profile/profile?edit=1' })
  },

  onReset() {
    this._cancelProgress?.()
    this.setData({
      aiKeyword: '',
      newTheme: null,
      genStage: '',
      genProgress: 0,
    })
  },
})
