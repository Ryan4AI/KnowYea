// pages/garden/garden.js
const app = getApp()

Page({
  data: {
    gardens: [],
    isLoading: false,
  },

  onLoad() {
    this.loadGarden()
  },

  loadGarden() {
    if (!app.globalData.openid) return

    this.setData({ isLoading: true })

    wx.cloud.callFunction({
      name: 'getGarden',
      data: { openid: app.globalData.openid },
      success: res => {
        this.setData({ isLoading: false })
        if (res.result && res.result.success) {
          this.setData({ gardens: res.result.gardens || [] })
        }
      },
      fail: err => {
        this.setData({ isLoading: false })
        console.error('加载花园失败', err)
      }
    })
  },
})
