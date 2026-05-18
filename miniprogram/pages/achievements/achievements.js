// pages/achievements/achievements.js
const app = getApp()

Page({
  data: {
    achievements: [],
    allAchievements: [
      { id: 'first_node', name: '初学乍道', description: '完成第一个课时', icon: '🌱' },
      { id: 'first_theme', name: '有始有终', description: '完成第一个主题', icon: '🌿' },
      { id: 'streak_3', name: '连胜达人', description: '连续学习 3 天', icon: '🔥' },
      { id: 'streak_7', name: '持之以恒', description: '连续学习 7 天', icon: '💪' },
      { id: 'node_10', name: '十全十美', description: '完成 10 个课时', icon: '🏆' },
      { id: 'theme_3', name: '三心二意', description: '完成 3 个主题', icon: '🎯' },
      { id: 'favorites_3', name: '收藏家', description: '收藏 3 个课时', icon: '❤️' },
      { id: 'share', name: '传播者', description: '分享一个课时', icon: '📤' },
    ],
  },

  onLoad() {
    this.loadAchievements()
  },

  loadAchievements() {
    if (!app.globalData.openid) return

    wx.cloud.callFunction({
      name: 'getUser',
      data: { openid: app.globalData.openid },
      success: res => {
        if (res.result?.success) {
          const resultData = res.result.data || {}
          const unlocked = resultData.achievements || []
          const unlockedIds = unlocked.map(a => a.id)

          const achievements = this.data.allAchievements.map(a => ({
            ...a,
            unlocked: unlockedIds.includes(a.id),
            unlockedAt: unlocked.find(u => u.id === a.id)?.unlockedAt,
          }))

          this.setData({ achievements })
        }
      }
    })
  },
})
