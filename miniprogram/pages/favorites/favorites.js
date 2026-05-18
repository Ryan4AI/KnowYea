// pages/favorites/favorites.js
const app = getApp()

Page({
  data: {
    favorites: [],
    isLoading: false,
  },

  onLoad() {
    wx.showToast({ title: '收藏功能已更新', icon: 'none' })
    wx.navigateBack({ delta: 1 })
  },
})
