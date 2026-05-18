// 云函数：updateProfile - 更新用户资料 + 同步兴趣标签
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { openid, age, occupation, tags } = event
  if (!openid) return { success: false, error: '缺少 openid' }

  try {
    const now = Date.now()

    // 更新用户资料
    const updateData = { updatedAt: now }
    if (age !== undefined) updateData.age = age
    if (occupation !== undefined) updateData.occupation = occupation
    await db.collection('users').where({ openid }).update({ data: updateData })

    // 同步兴趣标签：先删旧的
    if (tags !== undefined && Array.isArray(tags)) {
      const oldTags = await db.collection('user_tags').where({ openid }).get()
      const oldIds = oldTags.data.map(t => t._id)
      for (const id of oldIds) {
        await db.collection('user_tags').doc(id).remove()
      }

      // 写入新标签，并确保 tags 表中存在
      for (const tagName of tags) {
        await db.collection('user_tags').add({
          data: { openid, tagName, createdAt: now, updatedAt: now }
        })

        // 确保 tags 表有这个标签名
        const existRes = await db.collection('tags').where({ name: tagName }).get()
        if (existRes.data.length === 0) {
          await db.collection('tags').add({
            data: { name: tagName, createdAt: now, updatedAt: now }
          })
        }
      }
    }

    // 重新读取返回
    const userRes = await db.collection('users').where({ openid }).get()
    return { success: true, data: { user: userRes.data[0] } }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
