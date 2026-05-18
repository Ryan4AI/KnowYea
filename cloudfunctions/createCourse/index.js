// 云函数：createCourse - AI 生成课程大纲 + 写入数据库
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
      max_tokens: 4096,
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
  const { openid, topic, userAge, userOccupation, interestTags } = event
  if (!openid || !topic) return { success: false, error: '缺少必要参数' }

  try {
    const now = Date.now()

    // 1. 构建 system prompt
    const ageText = userAge ? `年龄：${userAge}岁` : '年龄：未知'
    const occText = userOccupation ? `职业：${userOccupation}` : '职业：未知'
    const tagsText = interestTags && interestTags.length > 0
      ? `兴趣标签：${interestTags.join('、')}`
      : '兴趣标签：无'

    const systemPrompt = `你是一个课程设计师。根据以下用户信息，设计一个关于"${topic}"的课程。

用户画像：
${ageText}
${occText}
${tagsText}

请以 JSON 数组格式返回课程大纲，每个元素包含：
{
  "courseTitle": "课程标题",
  "courseDescription": "课程简介（50-100字）",
  "tagNames": ["标签1", "标签2", "标签3"],
  "lessons": [
    {
      "title": "课时标题",
      "objective": "学习目标（30-50字）",
      "order": 1,
      "content": "课时内容简介（50-100字）"
    }
  ]
}

课时数量控制在 3-6 个。
只返回 JSON 数组，不要有其他文字。`

    const aiRes = await callMiniMax([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `请为"${topic}"设计一个课程` }
    ])

    let aiContent = aiRes.choices?.[0]?.message?.content || ''
    if (!aiContent) return { success: false, error: 'AI 返回为空' }

    // 剥离 <think> 推理标签
    aiContent = aiContent.replace(/<think>[\s\S]*?<\/think>/g, '').trim()

    // 解析 JSON：先找数组，再找对象，最后直接解析
    let courseData
    const arrayMatch = aiContent.match(/\[[\s\S]*?\]/)
    if (arrayMatch) {
      courseData = JSON.parse(arrayMatch[0])
    } else {
      const objMatch = aiContent.match(/\{[\s\S]*?\}/)
      if (objMatch) {
        courseData = JSON.parse(objMatch[0])
      } else {
        courseData = JSON.parse(aiContent)
      }
    }
    const course = Array.isArray(courseData) ? courseData[0] : courseData

    // 2. 写入 courses 表
    const courseId = 'course_' + now
    const lessonCount = course.lessons ? course.lessons.length : 0
    await db.collection('courses').add({
      data: {
        _id: courseId,
        openid,
        name: course.courseTitle,
        description: course.courseDescription,
        difficulty: 'beginner',
        totalLessons: lessonCount,
        source: 'ai_generated',
        status: 'learning',
        currentLessonOrder: 1,
        lessonSummary: '',
        startedAt: now,
        completedAt: null,
        lastStudiedAt: null,
        createdAt: now,
        updatedAt: now,
      }
    })

    // 3. 写入每个课时
    if (course.lessons && course.lessons.length > 0) {
      for (const lesson of course.lessons) {
        const lessonId = 'lesson_' + now + '_' + (lesson.order || 1)
        await db.collection('lessons').add({
          data: {
            _id: lessonId,
            courseId,
            title: lesson.title,
            objective: lesson.objective,
            order: lesson.order,
            content: lesson.content,
            completedAt: null,
            createdAt: now,
            updatedAt: now,
          }
        })
      }
    }

    // 4. 写入 course_tags，确保 tags 表存在
    if (course.tagNames && course.tagNames.length > 0) {
      for (const tagName of course.tagNames) {
        await db.collection('course_tags').add({
          data: {
            courseId,
            tagName,
            createdAt: now,
            updatedAt: now,
          }
        })

        // 确保 tags 表中存在
        const existRes = await db.collection('tags').where({ name: tagName }).get()
        if (existRes.data.length === 0) {
          await db.collection('tags').add({
            data: { name: tagName, createdAt: now, updatedAt: now }
          })
        }
      }
    }

    return {
      success: true,
      data: {
        courseId,
        title: course.courseTitle,
        description: course.courseDescription,
        tagNames: course.tagNames || [],
        totalLessons: lessonCount,
        lessons: course.lessons || [],
      }
    }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
