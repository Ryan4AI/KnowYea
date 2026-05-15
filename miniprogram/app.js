// app.js
App({
  globalData: {
    userInfo: null,
    openid: '',
    isLogin: false,
    learnContext: null,
  },

  onLaunch() {
    wx.cloud.init({
      env: 'cloudbase-d7gxwljzddd575d93',
      traceUser: true,
    })

    // 登录
    this.login().then(() => {
      // 初始化数据库（创建预置主题和节点）
      wx.cloud.callFunction({
        name: 'initDatabase',
        data: {},
        success: res => {
          if (res.result && res.result.success) {
            console.log('数据库初始化完成:', res.result.message)
          }
        },
        fail: err => {
          console.error('数据库初始化失败', err)
        }
      })
    })
  },

  login() {
    return wx.cloud.callFunction({
      name: 'login',
      data: {},
      success: res => {
        if (res.result) {
          this.globalData.openid = res.result.openid
          this.globalData.isLogin = true
          console.log('登录成功, openid:', this.globalData.openid)
        }
      },
      fail: err => {
        console.error('登录失败', err)
      },
    })
  },

  waitForLogin() {
    return new Promise(resolve => {
      if (this.globalData.openid) {
        resolve(this.globalData.openid)
        return
      }
      const timer = setInterval(() => {
        if (this.globalData.openid) {
          clearInterval(timer)
          resolve(this.globalData.openid)
        }
      }, 200)
      setTimeout(() => {
        clearInterval(timer)
        resolve(this.globalData.openid)
      }, 8000)
    })
  },

  setLearnContext(context) {
    this.globalData.learnContext = context
  },

  consumeLearnContext() {
    const context = this.globalData.learnContext
    this.globalData.learnContext = null
    return context
  },
})
