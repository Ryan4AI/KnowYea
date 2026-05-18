// pages/splash/splash.js — 启动页：登录 + 路由
const app = getApp()

Page({
  onLoad() {
    wx.cloud.callFunction({
      name: 'login',
      data: {},
      success: res => {
        const user = res.result?.user || {}
        const openid = user.openid || res.result?.openid || ''
        if (!openid) {
          wx.showToast({ title: '登录失败', icon: 'none' })
          setTimeout(() => wx.reLaunch({ url: '/pages/learn/learn' }), 1000)
          return
        }
        app.globalData.openid = openid

        wx.cloud.callFunction({
          name: 'getUser',
          data: { openid },
          success: r => {
            const u = r.result?.data?.user || {}
            if (!u.occupation && (!u.interests || u.interests.length === 0)) {
              wx.reLaunch({ url: '/pages/profile/profile?forceForm=1' })
              return
            }
            wx.cloud.callFunction({
              name: 'getCourses',
              data: { openid },
              success: r2 => {
                const active = (r2.result?.data || []).filter(c => c.status === 'learning')
                wx.reLaunch({ url: active.length > 0 ? '/pages/learn/learn' : '/pages/theme-store/theme-store' })
              },
              fail: () => wx.reLaunch({ url: '/pages/learn/learn' }),
            })
          },
          fail: () => wx.reLaunch({ url: '/pages/learn/learn' }),
        })
      },
      fail: () => {
        wx.showToast({ title: '加载失败', icon: 'none' })
        setTimeout(() => wx.reLaunch({ url: '/pages/learn/learn' }), 1000)
      },
    })
  },
})
