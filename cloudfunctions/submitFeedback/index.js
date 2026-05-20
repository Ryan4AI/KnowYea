// 云函数：submitFeedback - 提交用户反馈
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { openid, content, contact } = event
  if (!openid) return { success: false, error: '缺少 openid' }
  if (!content || content.trim().length < 2) return { success: false, error: '请填写反馈内容' }
  if (content.length > 500) return { success: false, error: '反馈内容不能超过500字' }

  try {
    const now = Date.now()
    await db.collection('feedback').add({
      data: {
        openid,
        content: content.trim(),
        contact: (contact || '').trim(),
        status: 'new',
        createdAt: now,
        updatedAt: now,
      }
    })
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
