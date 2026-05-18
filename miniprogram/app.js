// app.js — 仅初始化
App({
  globalData: {
    openid: '',
    isLogin: false,
    learnContext: null,
  },

  onLaunch() {
    wx.cloud.init({
      env: 'cloudbase-d7gxwljzddd575d93',
      traceUser: true,
    })
  },

  setLearnContext(context) {
    this.globalData.learnContext = context
  },

  consumeLearnContext() {
    const ctx = this.globalData.learnContext
    this.globalData.learnContext = null
    return ctx
  },
})
