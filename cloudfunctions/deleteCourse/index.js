// 云函数：deleteCourse - 级联删除课程及相关数据
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { openid, courseId } = event
  if (!openid || !courseId) return { success: false, error: '缺少必要参数' }

  try {
    // 1. 删 course_tags
    const tagRes = await db.collection('course_tags').where({ courseId }).get()
    for (const doc of tagRes.data) {
      await db.collection('course_tags').doc(doc._id).remove()
    }

    // 2. 删 lessons
    const lessonRes = await db.collection('lessons').where({ courseId }).get()
    for (const doc of lessonRes.data) {
      await db.collection('lessons').doc(doc._id).remove()
    }

    // 3. 删 messages
    const msgRes = await db.collection('messages').where({ courseId }).get()
    for (const doc of msgRes.data) {
      await db.collection('messages').doc(doc._id).remove()
    }

    // 4. 删 history 记录
    const histRes = await db.collection('history').where({ courseId }).get()
    for (const doc of histRes.data) {
      await db.collection('history').doc(doc._id).remove()
    }

    // 5. 删 courses
    await db.collection('courses').doc(courseId).remove()

    return { success: true, data: { deleted: true } }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
