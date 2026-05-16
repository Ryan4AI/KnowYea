// 云函数：clearUserData - 清除用户所有学习记录
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const openid = event.openid
  if (!openid) return { success: false, error: '需要 openid' }

  const collections = ['user_conversations', 'user_progress', 'user_themes', 'user_gardens', 'user_achievements', 'user_favorites']
  const results = {}

  for (const col of collections) {
    try {
      // 先获取数量确认
      const countRes = await db.collection(col).where({ openid: openid }).count()
      const total = countRes.total || 0

      if (total > 0) {
        const res = await db.collection(col).where({ openid: openid }).remove()
        const stats = res.stats || {}
        results[col] = { total, removed: stats.removed || 0 }
        console.log(`[clearUserData] ${col}: ${total} docs found, removed ${stats.removed || 0}`)
      } else {
        results[col] = { total: 0, removed: 0 }
        console.log(`[clearUserData] ${col}: no docs found`)
      }
    } catch (e) {
      results[col] = { error: e.message }
      console.error(`[clearUserData] ${col} 删除失败:`, e.message)
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
