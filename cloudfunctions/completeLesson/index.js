// 云函数：completeLesson - 完成课时 + 成就检查 + 摘要生成
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const https = require('https')

const API_KEY = process.env.MINIMAX_API_KEY || 'sk-cp-c5wSwWsnIcUkewTEe9JhETRKZNyJ1OBnphm_4B1HdOV0LMNh9vP80kJFBKZV5jpCtp22_xyBUtF0zRAwgWaxU4YECc_LL8GPzEj6GVOHmMiovcfwylDgCDM'

function callMiniMax(messages) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: 'MiniMax-M2.7',
      messages,
      max_tokens: 1024,
    })
    const req = https.request({
      hostname: 'api.minimaxi.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + API_KEY
      },
      timeout: 30000,
    }, res => {
      let body = ''
      res.on('data', chunk => body += chunk)
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error('AI服务暂不可用'))
          return
        }
        try {
          resolve(JSON.parse(body))
        } catch (e) {
          reject(new Error('AI响应格式异常'))
        }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('AI响应超时')) })
    req.write(data)
    req.end()
  })
}

exports.main = async (event, context) => {
  const { openid, courseId, lessonId, messages } = event
  if (!openid || !courseId || !lessonId) {
    return { success: false, error: '缺少必要参数' }
  }

  try {
    const now = Date.now()

    // 1. 更新 lessons 的 completedAt
    await db.collection('lessons').doc(lessonId).update({
      data: { completedAt: now, updatedAt: now }
    })

    // 2. 读课程和课时信息
    const courseRes = await db.collection('courses').doc(courseId).get()
    const course = courseRes.data
    if (!course) return { success: false, error: '课程不存在' }

    const newOrder = (course.currentLessonOrder || 1) + 1

    // 更新 courses
    const courseUpdate = {
      currentLessonOrder: newOrder,
      lastStudiedAt: now,
      updatedAt: now,
    }

    // 3. 如果所有课时完成
    const isCourseComplete = newOrder > course.totalLessons
    if (isCourseComplete) {
      courseUpdate.status = 'completed'
    }

    await db.collection('courses').doc(courseId).update({ data: courseUpdate })

    // 4. 更新 users
    const userRes = await db.collection('users').where({ openid }).get()
    const user = userRes.data[0]
    const today = new Date().toISOString().slice(0, 10)

    let streak = user.streak || 0
    if (user.lastStudyDate) {
      const lastDate = user.lastStudyDate.slice(0, 10)
      const diffDays = Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000)
      if (diffDays === 1) streak += 1
      else if (diffDays > 1) streak = 1
    } else {
      streak = 1
    }

    await db.collection('users').where({ openid }).update({
      data: {
        completedLessons: (user.completedLessons || 0) + 1,
        points: (user.points || 0) + 10,
        streak,
        lastStudyDate: today,
        updatedAt: now,
      }
    })

    if (isCourseComplete) {
      await db.collection('users').where({ openid }).update({
        data: {
          completedCourses: (user.completedCourses || 0) + 1,
        }
      })
    }

    // 5. 检查成就
    const achievRes = await db.collection('user_achievements').where({ openid }).get()
    const existingTypes = new Set(achievRes.data.map(a => a.achievementId))

    const achievementsToAdd = []

    // 首次完成课时成就
    if (user.completedLessons === 0 && !existingTypes.has('first_lesson')) {
      achievementsToAdd.push({ openid, achievementId: 'first_lesson', unlockedAt: now })
    }

    // 完成 5 个课时
    if ((user.completedLessons + 1) >= 5 && !existingTypes.has('five_lessons')) {
      achievementsToAdd.push({ openid, achievementId: 'five_lessons', unlockedAt: now })
    }

    // 完成 10 个课时
    if ((user.completedLessons + 1) >= 10 && !existingTypes.has('ten_lessons')) {
      achievementsToAdd.push({ openid, achievementId: 'ten_lessons', unlockedAt: now })
    }

    // 连续学习 3 天
    if (streak >= 3 && !existingTypes.has('streak_3')) {
      achievementsToAdd.push({ openid, achievementId: 'streak_3', unlockedAt: now })
    }

    // 连续学习 7 天
    if (streak >= 7 && !existingTypes.has('streak_7')) {
      achievementsToAdd.push({ openid, achievementId: 'streak_7', unlockedAt: now })
    }

    // 完成第一个课程
    if (isCourseComplete && !existingTypes.has('first_course')) {
      achievementsToAdd.push({ openid, achievementId: 'first_course', unlockedAt: now })
    }

    for (const ach of achievementsToAdd) {
      await db.collection('user_achievements').add({ data: ach })
    }

    // 6. 写入 history 记录
    await db.collection('history').add({
      data: {
        openid,
        courseId,
        lessonId,
        action: 'completeLesson',
        createdAt: now,
        updatedAt: now,
      }
    })

    // 7. 生成课时摘要（调 MiniMax + 历史消息）
    let summary = ''
    if (messages && Array.isArray(messages) && messages.length > 0) {
      try {
        const summaryMessages = [
          { role: 'system', content: `请根据以下对话内容，用一句话总结用户在这个课时中学到了什么（不超过 50 字）。` },
          ...messages.slice(-10).map(m => ({
            role: m.role === 'ai' ? 'assistant' : 'user',
            content: m.content
          }))
        ]
        const summaryRes = await callMiniMax(summaryMessages)
        summary = summaryRes.choices?.[0]?.message?.content?.trim() || ''
      } catch (e) {
        console.error('[summary] 生成失败', e.message)
      }
    }

    // 更新 lessonSummary（累加）
    if (summary) {
      const existingSummary = course.lessonSummary || ''
      const newSummary = existingSummary
        ? existingSummary + '\n' + summary
        : summary
      await db.collection('courses').doc(courseId).update({
        data: { lessonSummary: newSummary, updatedAt: now }
      })
    }

    return {
      success: true,
      data: {
        completed: true,
        pointsEarned: 10,
        currentOrder: newOrder,
        isCourseComplete,
        achievements: achievementsToAdd.map(a => ({ type: a.achievementId, title: a.achievementId })),
        summary,
      }
    }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
