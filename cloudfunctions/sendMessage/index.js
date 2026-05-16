// 云函数：sendMessage - AI 对话 + 消息保存
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
      let body = ''
      res.on('data', chunk => body += chunk)
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body)
          resolve(parsed)
        } catch(e) {
          reject(new Error('解析MiniMax响应失败'))
        }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('MiniMax 请求超时')) })
    req.write(data)
    req.end()
  })
}

exports.main = async (event, context) => {
  const { openid, themeId, nodeId, content, reviewMode, miniMaxMessages, themeName, nodeTitle, nodeObjective, historyMessages, userText } = event

  // 模式1：客户端传了 miniMaxMessages（预格式化，直接 AI 调用）
  if (miniMaxMessages && miniMaxMessages.length > 0) {
    if (!openid) return { success: false, error: '缺少 openid' }
    try {
      const aiRes = await callMiniMax(miniMaxMessages)
      const aiReply = aiRes.choices?.[0]?.message?.content || ''
      if (!aiReply) return { success: false, error: 'AI 返回为空' }
      const isCompleted = aiReply.includes('[完成]')

      // 保存消息到数据库
      if (themeId && nodeId) {
        const convCol = db.collection('user_conversations')
        const now = Date.now()
        await convCol.add({ data: { id: 'user_' + now, openid, themeId, nodeId, role: 'user', content: userText || '', createdAt: now } })
        await convCol.add({ data: { id: 'ai_' + now + 1, openid, themeId, nodeId, role: 'ai', content: aiReply, createdAt: now + 1 } })
      }

      return { success: true, aiReply, isCompleted }
    } catch (e) {
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
