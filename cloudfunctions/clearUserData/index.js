// 云函数：clearUserData - 清除用户所有学习记录
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const openid = event.openid
  if (!openid) return { success: false, error: '需要 openid' }

  const collections = ['user_conversations', 'user_progress', 'user_themes', 'user_gardens', 'user_achievements', 'user_favorites']
  const results = {}

  for (const col of collections) {
    try {
      const res = await db.collection(col).where({ openid }).remove()
      results[col] = { deleted: res.deleted }
    } catch (e) {
      results[col] = { error: e.message }
    }
  }

  // 重置 users 集合中的用户进度
  try {
    await db.collection('users').where({ openid }).update({
      data: { lastActive: Date.now(), profile: _.set(null) }
    })
    results['users'] = { updated: true }
  } catch (e) {
    results['users'] = { error: e.message }
  }

  return { success: true, results }
}