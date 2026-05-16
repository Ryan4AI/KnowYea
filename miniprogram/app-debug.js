// temp debug version - replace app.js with this to trace
const originalLogin = function() {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'login',
      data: {},
      success: res => {
        console.log('[login] result:', JSON.stringify(res.result))
        if (res.result) {
          console.log('[login] openid from result:', res.result.openid)
          this.globalData.openid = res.result.openid
          this.globalData.isLogin = true
          console.log('[login] globalData.openid set to:', this.globalData.openid)
        }
        resolve(res.result)
      },
      fail: err => {
        console.error('[login] fail:', err)
        reject(err)
      },
    })
  })
}
