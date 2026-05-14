// 云函数：getConversations - 获取对话历史
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { openid, themeId, nodeId, offset = 0, limit = 20 } = event

  if (!openid || !themeId || !nodeId) {
    return { success: false, error: '缺少必要参数' }
  }

  try {
    const convRes = await db.collection('user_conversations')
      .where({ openid, themeId, nodeId })
      .limit(1)
      .get()

    if (!convRes.data || convRes.data.length === 0) {
      return { success: true, messages: [], hasMore: false }
    }

    const messages = convRes.data[0].messages || []
    const total = messages.length
    const start = Math.max(0, total - offset - limit)
    const end = total - offset
    const sliced = messages.slice(start, end > 0 ? end : total).reverse()

    return {
      success: true,
      messages: sliced,
      hasMore: offset + limit < total,
    }
  } catch (e) {
    console.error('getConversations 云函数错误', e)
    return { success: false, error: e.message }
  }
}