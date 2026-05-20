// 云函数：getFeedbackList - 获取反馈列表（仅管理员可用）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const ADMIN_OPENID = 'oD7tH3Zy1HUIzU9bJXwmak_SjS-4'

exports.main = async (event, context) => {
  const { openid, status, page = 0, pageSize = 20 } = event
  if (openid !== ADMIN_OPENID) return { success: false, error: '无权限' }

  try {
    const query = {}
    if (status && status !== 'all') query.status = status

    const countResult = await db.collection('feedback').where(query).count()
    const total = countResult.total

    const res = await db.collection('feedback')
      .where(query)
      .orderBy('createdAt', 'desc')
      .skip(page * pageSize)
      .limit(pageSize)
      .get()

    return {
      success: true,
      data: res.data,
      total,
      page,
      pageSize,
    }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
