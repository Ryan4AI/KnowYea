// 云函数：updateFeedbackStatus - 更新反馈状态（仅管理员可用）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const ADMIN_OPENID = 'oD7tH3Zy1HUIzU9bJXwmak_SjS-4'

exports.main = async (event, context) => {
  const { openid, feedbackId, status } = event
  if (openid !== ADMIN_OPENID) return { success: false, error: '无权限' }

  const validStatuses = ['new', 'viewed', 'resolved', 'wontfix']
  if (!validStatuses.includes(status)) return { success: false, error: '无效状态' }
  if (!feedbackId) return { success: false, error: '缺少 feedbackId' }

  try {
    await db.collection('feedback').doc(feedbackId).update({
      data: { status, updatedAt: Date.now() },
    })
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
