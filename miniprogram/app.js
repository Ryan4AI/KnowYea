// app.js
const cloud = require('wx-server-sdk')

App({
  globalData: {
    userInfo: null,
    openid: '',
    isLogin: false,
  },

  onLaunch() {
    // 初始化云开发
    wx.cloud.init({
      env: 'cloudbase-d7gxwljzddd575d93',
      traceUser: true,
    })

    // 登录
    this.login()
  },

  login() {
    wx.cloud.callFunction({
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
      }
    })
  },
})