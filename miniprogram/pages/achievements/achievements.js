// pages/achievements/achievements.js
const app = getApp()

Page({
  data: {
    achievements: [],
    allAchievements: [
      { id: 'first_lesson', name: '初学乍道', description: '完成第一个课时', icon: '🌱' },
      { id: 'five_lessons', name: '三心二意', description: '完成 5 个课时', icon: '🎯' },
      { id: 'ten_lessons', name: '十全十美', description: '完成 10 个课时', icon: '🏆' },
      { id: 'streak_3', name: '持之以恒', description: '连续学习 3 天', icon: '🔥' },
      { id: 'streak_7', name: '连胜达人', description: '连续学习 7 天', icon: '⚡' },
      { id: 'first_course', name: '有始有终', description: '完成第一个课程', icon: '🎓' },
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
      },
      fail: err => {
        console.error('加载成就失败', err)
      }
    })
  },
})
