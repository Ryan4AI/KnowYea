// 云函数：getCourses - 查询用户课程 + 关联标签
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { openid } = event
  if (!openid) return { success: false, error: '缺少 openid' }

  try {
    // 查询用户的所有课程
    const courseRes = await db.collection('courses').where({ openid }).orderBy('createdAt', 'desc').get()
    const courses = courseRes.data

    // 关联查询每个课程的标签
    const result = []
    for (const course of courses) {
      const tagRes = await db.collection('course_tags').where({ courseId: course._id }).get()
      const tags = tagRes.data.map(t => t.tagName)

      // 查当前课时
      let currentLesson = null
      const lessonRes = await db.collection('lessons')
        .where({ courseId: course._id, order: course.currentLessonOrder })
        .get()
      if (lessonRes.data.length > 0) {
        currentLesson = lessonRes.data[0]
      }

      // lessons: 查询本课程全部课时
      const allLessonsRes = await db.collection('lessons')
        .where({ courseId: course._id })
        .orderBy('order', 'asc')
        .get()
      const lessons = allLessonsRes.data

      // 扁平化返回（前端期望 course 的字段直接展开）
      result.push({
        _id: course._id,
        openid: course.openid,
        name: course.name,
        description: course.description,
        status: course.status,
        difficulty: course.difficulty,
        totalLessons: course.totalLessons,
        currentLessonOrder: course.currentLessonOrder,
        lessonSummary: course.lessonSummary,
        startedAt: course.startedAt,
        completedAt: course.completedAt,
        lastStudiedAt: course.lastStudiedAt,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
        tags,
        lessons,
        currentLesson,
      })
    }

    return { success: true, data: result }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
