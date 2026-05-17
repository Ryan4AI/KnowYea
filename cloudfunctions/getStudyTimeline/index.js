// 云函数：getStudyTimeline - 获取最近 7 天学习时间线
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const { openid } = event
  if (!openid) return { success: false, error: '缺少 openid' }

  try {
    // 生成最近 7 天日期列表
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      days.push({
        date: d.toISOString().slice(0, 10),
        weekday: ['日', '一', '二', '三', '四', '五', '六'][d.getDay()],
        count: 0,
      })
    }

    // 查询 study_logs
    const sevenDaysAgo = days[0].date
    const res = await db.collection('study_logs')
      .where({ openid, date: db.command.gte(sevenDaysAgo) })
      .get()

    if (res.data && res.data.length > 0) {
      for (const log of res.data) {
        const day = days.find(d => d.date === log.date)
        if (day) day.count = log.count || 0
      }
    }

    const total = days.reduce((s, d) => s + d.count, 0)

    return { success: true, days, total }
  } catch (e) {
    console.error('getStudyTimeline 错误', e)
    return { success: false, error: e.message }
  }
}
