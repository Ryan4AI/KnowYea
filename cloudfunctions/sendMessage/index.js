// 云函数：sendMessage - AI 对话 + 消息保存 + 请求日志
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const https = require('https')

function callMiniMax(messages) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: 'MiniMax-M2.7',
      messages,
      max_tokens: 2048,
    })
    const req = https.request({
      hostname: 'api.minimaxi.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer sk-cp-c5wSwWsnIcUkewTEe9JhETRKZNyJ1OBnphm_4B1HdOV0LMNh9vP80kJFBKZV5jpCtp22_xyBUtF0zRAwgWaxU4YECc_LL8GPzEj6GVOHmMiovcfwylDgCDM'
      },
      timeout: 30000,
    }, res => {
      const statusCode = res.statusCode
      let body = ''
      res.on('data', chunk => body += chunk)
      res.on('end', () => {
        console.log('[sendMessage MiniMax] status:', statusCode, 'body:', body.slice(0, 500))
        try {
          const parsed = JSON.parse(body)
          if (statusCode !== 200) {
            reject(new Error('AI服务暂不可用'))
            return
          }
          resolve(parsed)
        } catch(e) {
          reject(new Error('AI响应格式异常'))
        }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('AI响应超时，请重试')) })
    req.write(data)
    req.end()
  })
}

// 日志记录
async function logAIRequest(params) {
  try {
    await db.collection('user_ai_logs').add({ data: {
      type: 'sendMessage',
      openid: params.openid || '',
      themeId: params.themeId || '',
      nodeId: params.nodeId || '',
      promptPreview: JSON.stringify(params.messages || []).slice(0, 2000),
      response: (params.response || '').slice(0, 3000),
      score: params.score || null,
      durationMs: params.durationMs || 0,
      status: params.status || 'success',
      error: params.error || '',
      isCompleted: params.isCompleted || false,
      createdAt: Date.now(),
    }})
  } catch(e) {
    console.error('[logAIRequest] 写入失败', e.message)
  }
}

exports.main = async (event, context) => {
  const { openid, themeId, nodeId, content, reviewMode, miniMaxMessages, themeName, nodeTitle, nodeObjective, historyMessages, userText } = event

  // 模式1：客户端传了 miniMaxMessages（预格式化，直接 AI 调用）
  if (miniMaxMessages && miniMaxMessages.length > 0) {
    if (!openid) return { success: false, error: '缺少 openid' }
    const startTime = Date.now()
    try {
      const aiRes = await callMiniMax(miniMaxMessages)
      const aiReply = aiRes.choices?.[0]?.message?.content || ''
      if (!aiReply) throw new Error('AI 返回为空')

      // 剥离推理标签（不要存到数据库）
      const noThink = aiReply.replace(/<think>[\s\S]*?<\/think>/g, '').trim()

      // 解析尾部 JSON 动作块：{"action":"complete","score":8} 或 {"score":8}
      let cleanReply = noThink
      let isCompleted = false
      let score = null
      const endBrace = noThink.lastIndexOf('}')
      if (endBrace >= 0 && noThink.slice(endBrace + 1).trim() === '') {
        const startBrace = noThink.lastIndexOf('{', endBrace)
        if (startBrace >= 0) {
          try {
            const meta = JSON.parse(noThink.slice(startBrace, endBrace + 1))
            if (meta.action === 'complete') isCompleted = true
            if (typeof meta.score === 'number') score = meta.score
            cleanReply = noThink.slice(0, startBrace).trim()
            // 提取摘要（跨课程上下文用）
            let summary = ''
            if (meta.summary && typeof meta.summary === 'string') {
              summary = meta.summary.trim()
            }
            // 保存课时摘要
            if (summary && themeId && nodeId) {
              db.collection('user_lesson_summaries').add({
                data: { openid, themeId, nodeId, summary, score, createdAt: Date.now() }
              }).catch(e => console.error('[saveSummary] 失败', e.message))
            }
          } catch (e) {
            // 不是合法 JSON，保留原文本
            cleanReply = noThink
          }
        }
      }

      // 旧格式兼容：[评分] 和 [完成] 标签
      if (!isCompleted && !score) {
        if (noThink.includes('[完成]')) {
          isCompleted = true
          cleanReply = noThink.replace(/\[完成\]/g, '').trim()
        }
        const legacyScore = noThink.match(/\[评分\]\s*(\d+)/)
        if (legacyScore) score = parseInt(legacyScore[1])
      }

      // 保存消息到数据库（自动消息不存用户输入）
      if (themeId && nodeId) {
        const convCol = db.collection('user_conversations')
        const now = Date.now()
        if (!event.isAutoMessage) {
          await convCol.add({ data: { id: 'user_' + now, openid, themeId, nodeId, role: 'user', content: userText || '', createdAt: now } })
        }
        await convCol.add({ data: { id: 'ai_' + now + 1, openid, themeId, nodeId, role: 'ai', content: cleanReply, createdAt: now + 1, isCompleted } })

        if (score !== null) {
          await db.collection('user_progress').add({
            data: { openid, themeId, nodeId, score, recordedAt: Date.now() }
          })
        }
      }

      // 异步记录日志（不影响主流程返回）
      logAIRequest({
        openid, themeId, nodeId,
        messages: miniMaxMessages,
        response: cleanReply,
        score, durationMs: Date.now() - startTime,
        status: 'success', isCompleted,
      })

      return { success: true, aiReply: cleanReply, isCompleted }
    } catch (e) {
      // 错误也记日志
      logAIRequest({
        openid, themeId, nodeId,
        messages: miniMaxMessages,
        response: '',
        score: null, durationMs: Date.now() - startTime,
        status: 'error', error: e.message,
        isCompleted: false,
      })
      return { success: false, error: e.message }
    }
  }

  // 模式2：纯 DB 存储（旧模式，由客户端传 userMsg + aiReply）
  const { userMsg, aiReply } = event
  if (!openid || !themeId || !nodeId) {
    return { success: false, error: '缺少必要参数' }
  }
  try {
    const now = Date.now()
    await db.collection('user_conversations').add({ data: { id: 'user_' + now, openid, themeId, nodeId, role: 'user', content: userMsg || '', createdAt: now } })
    await db.collection('user_conversations').add({ data: { id: 'ai_' + now + 1, openid, themeId, nodeId, role: 'ai', content: aiReply || '', createdAt: now + 1 } })
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
}