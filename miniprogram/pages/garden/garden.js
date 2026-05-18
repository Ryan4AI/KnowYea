// pages/garden/garden.js — 知识花园
const app = getApp()

const PLANT_LEVELS = [
  { threshold: 0,    emoji: '🌱', name: '种子', title: '初学者' },
  { threshold: 10,   emoji: '🌿', name: '嫩芽', title: '勤学者' },
  { threshold: 30,   emoji: '🌾', name: '稻穗', title: '探索者' },
  { threshold: 60,   emoji: '🌻', name: '开花', title: '求知者' },
  { threshold: 120,  emoji: '🪴', name: '盆景', title: '博学者' },
  { threshold: 250,  emoji: '🌳', name: '大树', title: '智识者' },
  { threshold: 500,  emoji: '🏡', name: '花园', title: '终身学习者' },
]

const STREAK_MILESTONES = [
  { days: 0,   text: '' },
  { days: 1,   text: '🏅 第一天，好的开始' },
  { days: 3,   text: '🔥 连续 3 天，保持势头' },
  { days: 7,   text: '🔥🔥 一周打卡，习惯养成中' },
  { days: 14,  text: '🔥🔥🔥 两周坚持，了不起' },
  { days: 30,  text: '🔥🔥🔥🔥 一个月！你是认真的' },
  { days: 60,  text: '🔥🔥🔥🔥🔥 两月如一日，高手' },
  { days: 100, text: '🏆 百日学习者！超越 99% 的人' },
]

function calcPlant(completedNodes) {
  let level = 0
  for (let i = PLANT_LEVELS.length - 1; i >= 0; i--) {
    if (completedNodes >= PLANT_LEVELS[i].threshold) {
      level = i
      break
    }
  }
  const current = PLANT_LEVELS[level]
  const next = PLANT_LEVELS[level + 1]
  return {
    level: level + 1,
    ...current,
    nextThreshold: next ? next.threshold : null,
    nextName: next ? next.name : null,
  }
}

function calcStreak(days) {
  let text = ''
  for (let i = STREAK_MILESTONES.length - 1; i >= 0; i--) {
    if (days >= STREAK_MILESTONES[i].days) {
      text = STREAK_MILESTONES[i].text
      break
    }
  }
  return text
}

Page({
  data: {
    isLoading: true,
    plant: { level: 1, emoji: '🌱', name: '种子' },
    plantPoints: 0,
    streakText: '',
    stats: { completedNodes: 0, completedThemes: 0, totalPoints: 0, streak: 0 },
    themes: [],
    lastActiveTheme: null,
    recentHistory: [],
  },

  onLoad() { this.loadAll() },
  onShow() { this.loadAll() },

  loadAll() {
    if (!app.globalData.openid) {
      const checkId = setInterval(() => {
        if (app.globalData.openid) { clearInterval(checkId); this.loadAll() }
      }, 300)
      return
    }
    this.setData({ isLoading: true })

    const openid = app.globalData.openid
    let userResult, coursesResult, historyResult

    Promise.all([
      // getUser → user stats + profile
      new Promise(resolve => {
        wx.cloud.callFunction({
          name: 'getUser', data: { openid },
          success: r => { userResult = r.result?.data }
        })
      }),
      // getCourses → course list
      new Promise(resolve => {
        wx.cloud.callFunction({
          name: 'getCourses', data: { openid },
          success: r => { coursesResult = r.result?.data || [] }
        })
      }),
      // getHistory → recent history preview
      new Promise(resolve => {
        wx.cloud.callFunction({
          name: 'getHistory', data: { openid, limit: 3 },
          success: r => { historyResult = r.result?.data || [] }
        })
      }),
    ]).then(() => {
      const user = userResult?.user || {}
      const courses = coursesResult || []
      const history = historyResult || []

      const completedNodes = user.completedLessons || 0
      const plant = calcPlant(completedNodes)
      const streakText = calcStreak(user.streak || 0)

      // Latest active course
      let lastActiveCourse = null
      const activeCourses = courses.filter(c => c.status === 'learning')
      if (activeCourses.length > 0) {
        lastActiveCourse = activeCourses.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0]
      }

      this.setData({
        plant,
        plantPoints: user.points || 0,
        streakText,
        stats: {
          completedNodes,
          completedThemes: user.completedCourses || 0,
          totalPoints: user.points || 0,
          streak: user.streak || 0,
          plantLevel: user.plantLevel || 1,
        },
        themes: courses,
        lastActiveTheme: lastActiveCourse,
        recentHistory: history,
        isLoading: false,
      })

      // 缓存
      const { isLoading, ...cache } = this.data
      wx.setStorageSync('garden_cache', cache)
    })
  },

  onCourseTap(e) {
    const courseId = e.currentTarget.dataset.themeId
    if (!courseId) return
    if (!app.globalData.openid) {
      wx.showToast({ title: '请稍后再试', icon: 'none' })
      return
    }
    wx.reLaunch({ url: '/pages/learn/learn' })
  },

  onNavigateTo(e) {
    const page = e.currentTarget.dataset.page
    const routes = {
      history: '/pages/history/history',
      achievements: '/pages/achievements/achievements',
      settings: '/pages/settings/settings',
    }
    if (routes[page]) {
      wx.navigateTo({ url: routes[page] })
    }
  },

  onAddTheme() {
    wx.navigateTo({ url: '/pages/theme-store/theme-store' })
  },

  confirmDeleteTheme(e) {
    const courseId = e.currentTarget.dataset.themeId
    const courseName = e.currentTarget.dataset.themeName || '该课程'
    wx.showModal({
      title: '删除课程',
      content: `确定要删除「${courseName}」吗？`,
      confirmText: '删除',
      confirmColor: '#e74c3c',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' })
          wx.cloud.callFunction({
            name: 'deleteCourse',
            data: { openid: app.globalData.openid, courseId },
            success: (res) => {
              wx.hideLoading()
              if (res.result?.success) {
                const courses = this.data.themes.filter(c => c._id !== courseId)
                this.setData({ themes: courses })
                wx.showToast({ title: '已删除', icon: 'success' })
              } else {
                wx.showToast({ title: res.result?.error || '删除失败', icon: 'none' })
              }
            },
            fail: (err) => {
              wx.hideLoading()
              wx.showToast({ title: '请求失败', icon: 'none' })
            }
          })
        }
      }
    })
  },

  onNewTheme() {
    wx.showLoading({ title: '检查中...' })
    wx.cloud.callFunction({
      name: 'getUser',
      data: { openid: app.globalData.openid },
      success: res => {
        wx.hideLoading()
        if (res.result?.success && res.result.data?.user) {
          wx.navigateTo({ url: '/pages/theme-store/theme-store' })
        } else {
          wx.navigateTo({ url: '/pages/profile/profile' })
        }
      },
      fail: () => {
        wx.hideLoading()
        wx.navigateTo({ url: '/pages/theme-store/theme-store' })
      }
    })
  },

  onEditProfile() {
    wx.navigateTo({ url: '/pages/profile/profile?edit=1' })
  },
})
