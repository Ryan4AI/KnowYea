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

    const records = histRes.data
    if (records.length === 0) {
      return { success: true, data: [] }
    }

    // 收集所有需要查询的 courseId / lessonId
    const courseIds = [...new Set(records.filter(r => r.courseId).map(r => r.courseId))]
    const lessonIds = [...new Set(records.filter(r => r.lessonId).map(r => r.lessonId))]

    // 并行批量查询
    const [coursesRes, lessonsRes] = await Promise.all([
      courseIds.length > 0
        ? db.collection('courses').where({ _id: db.command.in(courseIds) }).get()
        : Promise.resolve({ data: [] }),
      lessonIds.length > 0
        ? db.collection('lessons').where({ _id: db.command.in(lessonIds) }).get()
        : Promise.resolve({ data: [] }),
    ])

    // 转成 Map 方便查找
    const courseMap = new Map(coursesRes.data.map(c => [c._id, c]))
    const lessonMap = new Map(lessonsRes.data.map(l => [l._id, l]))

    // 组装
    const enriched = records.map(rec => {
      const course = rec.courseId ? courseMap.get(rec.courseId) : null
      const lesson = rec.lessonId ? lessonMap.get(rec.lessonId) : null
      return {
        ...rec,
        themeName: course?.name || '',
        nodeTitle: lesson?.title || '',
        nodeOrder: Number(lesson?.order || 0),
        completedAt: rec.createdAt,
      }
    })

    return { success: true, data: enriched }
  } catch (e) {
    return { success: false, error: e.message }
  }
}