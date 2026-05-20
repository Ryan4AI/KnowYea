// 云函数：sendMessage - 课时级 AI 对话
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const https = require('https')

const API_KEY = process.env.MINIMAX_API_KEY

function callMiniMax(messages) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: 'MiniMax-M2.7',
      messages,
      max_tokens: 3072,
    })
    const req = https.request({
      hostname: 'api.minimaxi.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + API_KEY
      },
      timeout: 60000,
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

function parseCompletion(aiReply) {
  const result = { isCompleted: false, score: null }
  if (!aiReply) return result
  try {
    // 先剥离 <think> 标签，避免推理段里的花括号干扰匹配
    const clean = aiReply.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
    const match = clean.match(/\{[\s\S]*?"action"[\s\S]*?\}/)
    if (match) {
      const parsed = JSON.parse(match[0])
      if (parsed.action === 'complete') result.isCompleted = true
      if (typeof parsed.score === 'number') result.score = parsed.score
    }
  } catch (e) { /* ignore parse errors */ }
  return result
}

exports.main = async (event, context) => {
  // 新调用方式：前端已组装好 miniMaxMessages 数组，直接调用 AI
  if (event.miniMaxMessages) {
    try {
      const aiRes = await callMiniMax(event.miniMaxMessages)
      const aiReply = aiRes.choices?.[0]?.message?.content || ''
      if (!aiReply) return { success: false, error: 'AI 返回为空' }
      const { isCompleted, score } = parseCompletion(aiReply)
      const result = { success: true, aiReply, isCompleted, score }

      // 保存消息到数据库（auto-message 只存 AI 回复，不存系统生成的用户消息）
      if (event.openid && event.courseId && event.lessonId) {
        const now = Date.now()
        // 用户真实发送的消息才保存
        if (!event.isAutoMessage && event.userText) {
          await db.collection('messages').add({
            data: {
              openid: event.openid,
              courseId: event.courseId,
              lessonId: event.lessonId,
              role: 'user',
              content: event.userText,
              sentAt: now,
              createdAt: now,
              updatedAt: now,
            }
          })
        }
        // AI 回复统一保存（含 auto-message 的开场白）
        await db.collection('messages').add({
          data: {
            openid: event.openid,
            courseId: event.courseId,
            lessonId: event.lessonId,
            role: 'ai',
            content: aiReply,
            sentAt: now + 1,
            createdAt: now + 1,
            updatedAt: now + 1,
          }
        })
      }

      return result
    } catch (e) {
      return { success: false, error: e.message }
    }
  }

  const { openid, courseId, lessonId, content } = event
  if (!openid || !courseId || !lessonId || !content) {
    return { success: false, error: '缺少必要参数' }
  }

  try {
    const now = Date.now()

    // 1. 读最近 20 条消息
    const msgRes = await db.collection('messages')
      .where({ courseId, lessonId })
      .orderBy('sentAt', 'desc')
      .limit(20)
      .get()
    const historyMsgs = msgRes.data.reverse()

    // 2. 读课程信息
    const courseRes = await db.collection('courses').doc(courseId).get()
    if (!courseRes.data) return { success: false, error: '课程不存在' }
    const course = courseRes.data

    // 3. 读课时信息
    const lessonRes = await db.collection('lessons').doc(lessonId).get()
    if (!lessonRes.data) return { success: false, error: '课时不存在' }
    const lesson = lessonRes.data

    // 4. 读用户画像
    const userRes = await db.collection('users').where({ openid }).get()
    const user = userRes.data.length > 0 ? userRes.data[0] : null
    const ageText = user && user.age ? `年龄：${user.age}岁` : '年龄：未知'
    const occText = user && user.occupation ? `职业：${user.occupation}` : '职业：未知'

    // 组装 system prompt
    const lessonSummary = course.lessonSummary ? `课程学习进度摘要：${course.lessonSummary}` : ''
    const systemPrompt = `你是"小知也"AI 学习助手，正在进行一对一学习辅导。

用户信息：
${ageText}
${occText}

当前课程：${course.name}
课程介绍：${course.description}

当前课时：${lesson.title}
学习目标：${lesson.objective}
课时内容：${lesson.content}

${lessonSummary}

请以友好的导师风格回应，引导用户思考和理解。
不要主动结束对话，除非用户明确表示已完成。
每次回复要自然、有教学性、能引发进一步讨论。`

    // 组装完整 messages
    const messages = [
      { role: 'system', content: systemPrompt },
      ...historyMsgs.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content },
    ]

    // 5. 调 MiniMax
    const aiRes = await callMiniMax(messages)
    const aiReply = aiRes.choices?.[0]?.message?.content || ''
    if (!aiReply) return { success: false, error: 'AI 返回为空' }

    // 6. 写入消息
    const userMsgId = 'msg_user_' + now
    await db.collection('messages').add({
      data: {
        _id: userMsgId,
        openid,
        courseId,
        lessonId,
        role: 'user',
        content,
        sentAt: now,
        createdAt: now,
        updatedAt: now,
      }
    })

    const aiMsgId = 'msg_ai_' + (now + 1)
    await db.collection('messages').add({
      data: {
        _id: aiMsgId,
        openid,
        courseId,
        lessonId,
        role: 'ai',
        content: aiReply,
        sentAt: now + 1,
        createdAt: now + 1,
        updatedAt: now + 1,
      }
    })

    // 7. 返回 AI 回复（含完成标记和分数）
    const { isCompleted, score } = parseCompletion(aiReply)
    const result = { success: true, aiReply, isCompleted, score }
    return result
  } catch (e) {
    return { success: false, error: e.message }
  }
}
