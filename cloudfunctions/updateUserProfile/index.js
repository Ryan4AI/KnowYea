// 云函数：updateUserProfile - 更新用户画像
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const { openid, profile } = event

  if (!openid) {
    return { success: false, error: '缺少 openid' }
  }

  if (!profile) {
    return { success: false, error: '缺少 profile 数据' }
  }

  try {
    // 获取现有用户
    const userRes = await db.collection('users')
      .where({ openid })
      .limit(1)
      .get()

    if (!userRes.data || userRes.data.length === 0) {
      // 用户不存在，先创建
      await db.collection('users').add({
        data: {
          openid,
          profile,
          lastActive: Date.now(),
          createdAt: Date.now(),
        }
      })
      return { success: true }
    }

    // 更新 profile
    await db.collection('users').doc(userRes.data[0]._id).update({
      data: {
        profile: db.command.set(profile),
        lastActive: Date.now(),
      }
    })

    return { success: true }
  } catch (e) {
    console.error('updateUserProfile 云函数错误', e)
    return { success: false, error: e.message }
  }
}