// pages/history/history.js
const app = getApp()

Page({
  data: {
    historyList: [],
    isLoading: false,
  },

  onLoad() {
    this.loadHistory()
  },

  loadHistory() {
    if (!app.globalData.openid) return

    this.setData({ isLoading: true })

    wx.cloud.callFunction({
      name: 'getHistory',
      data: { openid: app.globalData.openid },
      success: res => {
        this.setData({ isLoading: false })
        if (res.result && res.result.success) {
          this.setData({ historyList: res.result.history || [] })
        }
      },
      fail: err => {
        this.setData({ isLoading: false })
        console.error('加载历史记录失败', err)
      }
    })
  },

  onItemTap(e) {
    const { themeId, nodeId } = e.currentTarget.dataset
    app.setLearnContext({ themeId, nodeId, mode: 'review' })
    wx.switchTab({ url: '/pages/learn/learn' })
  },
})
