// 云函数：getTags - 获取所有标签列表
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const tagRes = await db.collection('tags').get()
    return { success: true, data: tagRes.data }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
