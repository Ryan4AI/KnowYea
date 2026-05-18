// 云函数：getHistory - 按时间倒序获取历史记录
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { openid } = event
  if (!openid) return { success: false, error: '缺少 openid' }

  try {
    const histRes = await db.collection('history')
      .where({ openid })
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get()

    return { success: true, data: histRes.data }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
