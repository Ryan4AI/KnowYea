// 云函数：login - 查/建用户文档
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  // 优先从 event 取 openid（测试用），否则从微信上下文自动获取
  let openid = event.openid
  if (!openid) {
    const wxContext = cloud.getWXContext()
    openid = wxContext.OPENID
  }
  if (!openid) return { success: false, error: '缺少 openid' }

  try {
    // 查用户
    const userRes = await db.collection('users').where({ openid }).get()
    if (userRes.data.length > 0) {
      return { success: true, isNew: false, user: userRes.data[0] }
    }

    // 新用户，创建基础文档
    const now = Date.now()
    const newUser = {
      openid,
      age: null,
      occupation: null,
      plantLevel: 1,
      points: 0,
      decorations: [],
      completedLessons: 0,
      completedCourses: 0,
      streak: 0,
      lastStudyDate: null,
      createdAt: now,
      updatedAt: now,
    }

    await db.collection('users').add({ data: newUser })
    return { success: true, isNew: true, user: newUser }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
