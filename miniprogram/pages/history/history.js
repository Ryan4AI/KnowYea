// pages/history/history.js — 学习历史时间线
const app = getApp()

function relativeTime(ts) {
  if (!ts) return ''
  const now = Date.now()
  const diff = now - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return mins + '分钟前'
  const hours = Math.floor(mins / 60)
  if (hours < 24) return hours + '小时前'
  const days = Math.floor(hours / 24)
  if (days < 2) return '昨天'
  if (days < 7) return days + '天前'
  const d = new Date(ts)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function dateLabel(ts) {
  if (!ts) return '更早'
  const now = new Date()
  const d = new Date(ts)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diffDays = Math.floor((today - target) / 86400000)
  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '昨天'
  if (diffDays < 7) return `${diffDays}天前`
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

Page({
  data: {
    historyList: [],
    groupedHistory: [],
    isLoading: false,
  },

  onLoad() {
    this.loadHistory()
  },

  onShow() {
    // 每次进入重新加载（可能有新的学习记录）
    if (!this.data.isLoading && this.data.historyList.length > 0) {
      this.loadHistory()
    }
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
          const historyList = res.result.data || res.result.history || []
          this.setData({
            historyList,
            groupedHistory: this._groupByDate(historyList),
          })
          // 新助手生成的历史从第一天开始记录
        }
      },
      fail: err => {
        this.setData({ isLoading: false })
        console.error('加载历史记录失败', err)
      }
    })
  },

  // 按日期分组，每项附加相对时间
  _groupByDate(list) {
    const groups = []
    let currentLabel = null
    let currentItems = []

    for (const item of list) {
      const ts = item.completedAt || item.createdAt
      const label = dateLabel(ts)
      const timeStr = relativeTime(ts)
      const enriched = { ...item, completedAt: ts, timeStr }

      if (label !== currentLabel) {
        if (currentItems.length > 0) {
          groups.push({ dateLabel: currentLabel, items: currentItems })
        }
        currentLabel = label
        currentItems = [enriched]
      } else {
        currentItems.push(enriched)
      }
    }

    if (currentItems.length > 0) {
      groups.push({ dateLabel: currentLabel, items: currentItems })
    }

    return groups
  },

  onItemTap(e) {
    const { themeId, nodeId, courseId, lessonId } = e.currentTarget.dataset
    const targetThemeId = courseId || themeId
    const targetNodeId = lessonId || nodeId
    if (!targetThemeId || !targetNodeId) return
    app.setLearnContext({ themeId: targetThemeId, nodeId: targetNodeId, mode: 'review' })
    wx.reLaunch({ url: '/pages/learn/learn' })
  },
})
