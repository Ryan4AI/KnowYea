// 云函数：sendMessage - 纯数据库存储，AI 调用在客户端完成
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const { openid, themeId, nodeId, userMsg, aiReply, reviewMode } = event

  if (!openid || !themeId || !nodeId) {
    return { success: false, error: '缺少必要参数' }
  }

  try {
    // 保存用户消息
    const userMessage = {
      id: 'user_' + Date.now(),
      role: 'user',
      content: userMsg || '',
      createdAt: Date.now(),
    }

    // 保存 AI 回复
    const aiMessage = {
      id: 'ai_' + Date.now(),
      role: 'ai',
      content: aiReply || '',
      createdAt: Date.now(),
    }

    // 批量写入数据库
    const convRes = await db.collection('user_conversations')
      .where({ openid, themeId, nodeId })
      .limit(1)
      .get()

    const messages = [userMessage, aiMessage]

    if (convRes.data && convRes.data.length > 0) {
      const conv = convRes.data[0]
      const existing = conv.messages || []
      existing.push(...messages)
      if (existing.length > 30) existing.splice(0, existing.length - 30)
      await db.collection('user_conversations').doc(conv._id).update({
        data: { messages: existing, updatedAt: Date.now() }
      })
    } else {
      await db.collection('user_conversations').add({
        data: { openid, themeId, nodeId, messages, createdAt: Date.now(), updatedAt: Date.now() }
      })
    }

    const isCompleted = aiReply.includes('[完成]')

    return {
      success: true,
      message: aiMessage,
      isCompleted,
    }
  } catch (e) {
    console.error('sendMessage 云函数错误', e)
    return { success: false, error: e.message }
  }
}
