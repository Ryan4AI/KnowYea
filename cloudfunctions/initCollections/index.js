// 初始化数据库：强制创建所有新集合
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async () => {
  const db = cloud.database()
  const now = Date.now()

  const collections = ['tags', 'course_tags', 'user_tags', 'courses', 'lessons', 'messages', 'user_achievements', 'history']

  for (const name of collections) {
    try {
      await db.collection(name).add({ data: { _init: true, createdAt: now, updatedAt: now } })
      console.log('[created]', name)
    } catch (e) {
      console.log('[error]', name, e.message)
    }
  }

  // 写入预设标签
  const PRESET_TAGS = ['编程','设计','数据','AI','商业','金融','心理','沟通','写作','外语','职场','思维','技术','管理','营销','产品','创业']
  for (const name of PRESET_TAGS) {
    try {
      const exist = await db.collection('tags').where({ name }).get()
      if (exist.data.length === 0) {
        await db.collection('tags').add({ data: { name, createdAt: now, updatedAt: now } })
      }
    } catch (e) {}
  }

  return { success: true, done: true }
}