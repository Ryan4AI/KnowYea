// 云函数：getHistory - 按时间倒序获取历史记录（含课程名/课时名）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { openid } = event
  if (!openid) return { success: false, error: '缺少 openid' }

  try {
    const histRes = await db.collection('history')
      .where({ openid })
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get()

    // 为每条记录补充课程名 + 课时名 + 课时序号
    const enriched = []
    for (const rec of histRes.data) {
      let themeName = ''
      let nodeTitle = ''
      let nodeOrder = 0
      let createdAt = rec.createdAt

      // 查课程名
      if (rec.courseId) {
        try {
          const courseRes = await db.collection('courses').doc(rec.courseId).get()
          if (courseRes.data) {
            themeName = courseRes.data.name || ''
          }
        } catch (_) {}
      }

      // 查课时名 + 序号
      if (rec.lessonId) {
        try {
          const lessonRes = await db.collection('lessons').doc(rec.lessonId).get()
          if (lessonRes.data) {
            nodeTitle = lessonRes.data.title || ''
            nodeOrder = lessonRes.data.order || 0
          }
        } catch (_) {}
      }

      enriched.push({
        ...rec,
        themeName,
        nodeTitle,
        nodeOrder: Number(nodeOrder),
        completedAt: createdAt,
      })
    }

    return { success: true, data: enriched }
  } catch (e) {
    return { success: false, error: e.message }
  }
}