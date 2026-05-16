// pages/settings/settings.js
const app = getApp()

Page({
  data: {
    version: '1.0.0',
    notifications: true,
  },

  onLoad() {
    const stored = wx.getStorageSync('settings_notifications')
    if (stored !== '' && stored !== undefined && stored !== null) {
      this.setData({ notifications: !!stored })
    }
  },

  onNotificationChange(e) {
    const notifications = e.detail.value
    this.setData({ notifications })
    wx.setStorageSync('settings_notifications', notifications)
    wx.showToast({ title: notifications ? '已开启通知' : '已关闭通知', icon: 'none' })
  },

  onClearCache() {
    wx.showModal({
      title: '提示',
      content: '确定要清除本地缓存吗？',
      success: res => {
        if (res.confirm) {
          wx.clearStorageSync()
          wx.showToast({ title: '清除成功', icon: 'success' })
        }
      },
    })
  },

  onAbout() {
    wx.showModal({
      title: '关于小知也',
      content: '小知也 v1.0.0\n\n每天几分钟，慢慢变强。\n\n基于微信云开发的 AI 驱动体系化学习工具。',
      showCancel: false,
    })
  },
})
