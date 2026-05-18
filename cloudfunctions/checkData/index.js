const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  try {
    const courseRes = await db.collection('courses').orderBy('createdAt', 'desc').get()
    const courses = courseRes.data.map(c => ({ _id: c._id, openid: c.openid, name: c.name, status: c.status }))

    const userRes = await db.collection('users').orderBy('createdAt', 'desc').get()
    const users = userRes.data.map(u => ({ _id: u._id, openid: u.openid, occupation: u.occupation }))

    return { courses, users }
  } catch (e) {
    return { error: e.message }
  }
}
