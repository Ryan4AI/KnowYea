// pages/feedback-admin/feedback-admin.js — 反馈管理后台
const app = getApp()

Page({
  data: {
    list: [],
    filter: 'new',
    loading: false,
    expandedId: null,
    statusLabels: {
      'new': '待处理',
      'viewed': '已阅',
      'resolved': '已解决',
      'wontfix': '暂不处理',
    },
  },

  onShow() {
    this.loadList()
  },

  loadList() {
    const { filter } = this.data
    if (!app.globalData.openid) {
      wx.showToast({ title: '登录信息缺失', icon: 'none' })
      return
    }

    this.setData({ loading: true })
    wx.cloud.callFunction({
      name: 'getFeedbackList',
      data: { openid: app.globalData.openid, status: filter },
      success: res => {
        if (res.result?.success) {
          this.setData({ list: res.result.data || [] })
        } else {
          wx.showToast({ title: res.result?.error || '加载失败', icon: 'none' })
        }
      },
      fail: () => {
        wx.showToast({ title: '网络错误', icon: 'none' })
      },
      complete: () => {
        this.setData({ loading: false })
      },
    })
  },

  onFilter(e) {
    const status = e.currentTarget.dataset.status
    this.setData({ filter: status, expandedId: null }, () => this.loadList())
  },

  onToggleDetail(e) {
    const idx = e.currentTarget.dataset.idx
    const item = this.data.list[idx]
    if (!item) return
    this.setData({
      expandedId: this.data.expandedId === item._id ? null : item._id,
    })
  },

  onUpdateStatus(e) {
    const { id, status } = e.currentTarget.dataset

    wx.showLoading({ title: '更新中...' })
    wx.cloud.callFunction({
      name: 'updateFeedbackStatus',
      data: { openid: app.globalData.openid, feedbackId: id, status },
      success: res => {
        wx.hideLoading()
        if (res.result?.success) {
          wx.showToast({ title: '已更新', icon: 'success' })
          this.loadList()
        } else {
          wx.showToast({ title: res.result?.error || '更新失败', icon: 'none' })
        }
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({ title: '网络错误', icon: 'none' })
      },
    })
  },

  formatTime(ts) {
    if (!ts) return ''
    const d = new Date(ts)
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  },
})
