const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

async function clearCollection(name) {
  let all = []
  let offset = 0
  while (true) {
    const r = await db.collection(name).skip(offset).limit(100).get()
    all = all.concat(r.data)
    if (r.data.length < 100) break
    offset += 100
  }
  for (const doc of all) {
    await db.collection(name).doc(doc._id).remove()
  }
  return all.length
}

exports.main = async () => {
  const counts = {}
  for (const name of ['users', 'messages', 'history', 'courses', 'lessons', 'course_tags', 'user_tags', 'user_achievements']) {
    counts[name] = await clearCollection(name)
  }
  return { success: true, deleted: counts }
}
