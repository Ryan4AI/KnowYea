const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const PRESET_TAGS = ['编程','设计','数据','AI','商业','金融','心理','沟通','写作','外语','职场','思维','技术','管理','营销','产品','创业']

const COLLECTIONS = [
  'tags', 'course_tags', 'user_tags', 'courses', 'lessons', 'messages', 'user_achievements', 'history'
]

exports.main = async () => {
  const db = cloud.database()
  const now = Date.now()
  const results = []

  // 用 createCollection 创建新集合
  for (const name of COLLECTIONS) {
    try {
      await db.createCollection(name)
      results.push({ collection: name, status: 'created' })
    } catch (e) {
      if (e.errCode === -501001 || (e.message && (e.message.includes('already exist') || e.message.includes('ALREADY_EXIST')))) {
        results.push({ collection: name, status: 'already_exists' })
      } else {
        results.push({ collection: name, status: 'error', msg: e.message })
      }
    }
  }

  // 写入预设标签
  let tagsAdded = 0
  for (const name of PRESET_TAGS) {
    try {
      await db.collection('tags').add({ data: { name, createdAt: now, updatedAt: now } })
      tagsAdded++
    } catch (e) {}
  }

  return { success: true, results, tagsAdded }
}
