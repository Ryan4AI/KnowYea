// pages/favorites/favorites.js
const app = getApp()

Page({
  data: {
    favorites: [],
    isLoading: false,
  },

  onLoad() {
    this.loadFavorites()
  },

  loadFavorites() {
    if (!app.globalData.openid) return

    this.setData({ isLoading: true })

    wx.cloud.callFunction({
      name: 'getFavorites',
      data: { openid: app.globalData.openid },
      success: res => {
        this.setData({ isLoading: false })
        if (res.result && res.result.success) {
          this.setData({ favorites: res.result.favorites || [] })
        }
      },
      fail: err => {
        this.setData({ isLoading: false })
        console.error('加载收藏失败', err)
      }
    })
  },

  onItemTap(e) {
    const { themeId, nodeId } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/learn/learn?themeId=${themeId}&nodeId=${nodeId}&mode=review`
    })
  },

  onRemove(e) {
    const nodeId = e.currentTarget.dataset.nodeId
    wx.cloud.callFunction({
      name: 'toggleFavorite',
      data: { openid: app.globalData.openid, nodeId },
      success: () => {
        wx.showToast({ title: '已取消收藏', icon: 'success' })
        this.loadFavorites()
      }
    })
  },
})
