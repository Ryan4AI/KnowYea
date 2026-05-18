const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const results = {}
  const colls = ['courses', 'course_tags', 'lessons', 'users', 'tags', 'user_tags', 'messages', 'user_achievements', 'history']
  for (const name of colls) {
    try {
      const r = await db.collection(name).limit(1).get()
      results[name] = { exists: true, count: r.data.length }
    } catch (e) {
      results[name] = { exists: false, error: e.message }
    }
  }
  return results
}
