// 云函数：setupCollections - 创建必要的数据库集合
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

const COLLECTIONS = [
  'users',
  'user_achievements', 
  'user_favorites',
  'user_progress',
  'user_themes',
  'user_gardens',
  'user_conversations',
  'themes',
  'nodes',
]

exports.main = async (event, context) => {
  const results = []
  
  for (const name of COLLECTIONS) {
    try {
      await db.createCollection(name)
      results.push({ collection: name, status: 'created' })
    } catch (e) {
      if (e.errCode === -502005 || e.message.includes('already exists')) {
        results.push({ collection: name, status: 'already_exists' })
      } else {
        results.push({ collection: name, status: 'error', error: e.message })
      }
    }
  }
  
  return { success: true, results }
}