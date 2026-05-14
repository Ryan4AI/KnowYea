// 云函数：getUserProfile - 获取用户信息
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const { openid } = event

  if (!openid) {
    return { success: false, error: '缺少 openid' }
  }

  try {
    // 获取用户信息
    const userRes = await db.collection('users').where({ openid }).limit(1).get()
    const user = userRes.data?.[0] || null

    // 获取用户主题进度列表
    const utRes = await db.collection('user_themes')
      .where({ openid })
      .get()

    // 计算统计数据
    let completedNodes = 0
    let completedThemes = 0
    let totalPoints = 0

    const recentThemes = []

    if (utRes.data && utRes.data.length > 0) {
      for (const ut of utRes.data) {
        const completed = ut.completedNodeIds?.length || 0
        completedNodes += completed

        if (ut.status === 'completed') {
          completedThemes++
        }

        // 获取花园数据
        const gardenRes = await db.collection('user_gardens')
          .where({ openid, themeId: ut.themeId })
          .limit(1)
          .get()

        if (gardenRes.data && gardenRes.data.length > 0) {
          totalPoints += gardenRes.data[0].points || 0
        }

        // 获取主题信息
        const themeRes = await db.collection('themes').doc(ut.themeId).get()
        if (themeRes.data) {
          recentThemes.push({
            _id: ut.themeId,
            name: themeRes.data.name,
            status: ut.status,
            completedCount: completed,
            totalNodes: themeRes.data.totalNodes,
          })
        }
      }
    }

    // 获取成就
    const achRes = await db.collection('user_achievements')
      .where({ openid })
      .limit(1)
      .get()

    const achievements = achRes.data?.[0]?.achievements || []

    return {
      success: true,
      user,
      stats: {
        completedNodes,
        completedThemes,
        totalPoints,
        streak: 0, // TODO: 计算连续学习天数
      },
      achievements,
      recentThemes: recentThemes.slice(0, 3),
    }
  } catch (e) {
    console.error('getUserProfile 云函数错误', e)
    return { success: false, error: e.message }
  }
}