// 云函数：getRecommendation - 基于兴趣标签的课程推荐
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { openid } = event
  if (!openid) return { success: false, error: '缺少 openid' }

  try {
    // 1. 获取用户兴趣标签
    const tagRes = await db.collection('user_tags').where({ openid }).get()
    const userTags = new Set(tagRes.data.map(t => t.tagName.toLowerCase()))

    if (userTags.size === 0) {
      // 无兴趣标签时返回最近课程
      const recentCourseRes = await db.collection('courses')
        .where({ openid })
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get()
      const result = []
      for (const course of recentCourseRes.data) {
        const ctRes = await db.collection('course_tags').where({ courseId: course._id }).get()
        result.push({ course, tags: ctRes.data.map(t => t.tagName) })
      }
      return { success: true, data: result }
    }

    // 2. 获取所有课程（排除用户自己的）
    const allCoursesRes = await db.collection('courses').get()
    const scored = []

    for (const course of allCoursesRes.data) {
      // 排除自己的课程
      if (course.openid === openid) continue

      // 获取课程标签
      const ctRes = await db.collection('course_tags').where({ courseId: course._id }).get()
      const courseTagNames = ctRes.data.map(t => t.tagName.toLowerCase())

      // 计算交集大小
      let intersectionCount = 0
      for (const tag of courseTagNames) {
        if (userTags.has(tag)) intersectionCount++
      }

      if (intersectionCount > 0) {
        scored.push({
          course,
          tags: ctRes.data.map(t => t.tagName),
          matchCount: intersectionCount,
        })
      }
    }

    // 按匹配数降序排列
    scored.sort((a, b) => b.matchCount - a.matchCount)

    return { success: true, data: scored.slice(0, 10) }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
