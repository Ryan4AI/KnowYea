// 云函数：getMessages - 按课程+课时查询消息
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { openid, courseId, lessonId, limit = 30, offset = 0 } = event
  if (!openid || !courseId) return { success: false, error: '缺少参数' }

  try {
    const query = { openid, courseId }
    if (lessonId) query.lessonId = lessonId

    const countRes = await db.collection('messages').where(query).count()
    const total = countRes.total

    const msgRes = await db.collection('messages')
      .where(query)
      .orderBy('createdAt', 'asc')
      .skip(offset)
      .limit(limit)
      .get()

    return {
      success: true,
      data: msgRes.data.map(m => ({
        _id: m._id,
        id: m._id,
        role: m.role === 'ai' ? 'ai' : 'user',
        content: m.content,
        createdAt: m.createdAt,
        score: m.score || null,
        completed: m.isCompleted || false,
      })),
      total,
      hasMore: offset + limit < total,
    }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
