// 云函数：getHomeData - 获取首页数据
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const { openid } = event

  if (!openid) {
    return { success: false, error: '缺少 openid' }
  }

  try {
    // 获取用户当前主题
    const utRes = await db.collection('user_themes')
      .where({ openid, status: 'learning' })
      .orderBy('startedAt', 'desc')
      .limit(1)
      .get()

    let currentTheme = null
    let currentNode = null
    let messages = []

    if (utRes.data && utRes.data.length > 0) {
      const userTheme = utRes.data[0]
      const themeId = userTheme.themeId
      const currentOrder = userTheme.currentNodeOrder || 1

      // 获取主题信息
      const themeRes = await db.collection('themes').doc(themeId).get()
      if (themeRes.data) {
        currentTheme = {
          _id: themeId,
          name: themeRes.data.name,
          description: themeRes.data.description,
          totalNodes: themeRes.data.totalNodes,
          completedCount: userTheme.completedNodeIds?.length || 0,
        }
      }

      // 获取当前节点
      const nodeRes = await db.collection('nodes')
        .where({ themeId, order: currentOrder, status: 'published' })
        .limit(1)
        .get()

      if (nodeRes.data && nodeRes.data.length > 0) {
        currentNode = nodeRes.data[0]

        // 获取对话历史
        const convRes = await db.collection('user_conversations')
          .where({ openid, themeId, nodeId: currentNode._id })
          .limit(1)
          .get()

        if (convRes.data && convRes.data.length > 0) {
          messages = convRes.data[0].messages || []
        }
      }
    }

    // 获取用户信息
    const userRes = await db.collection('users').where({ openid }).limit(1).get()
    const user = userRes.data?.[0] || null

    // 获取用户花园数据
    let garden = null
    if (currentTheme) {
      const gardenRes = await db.collection('user_gardens')
        .where({ openid, themeId: currentTheme._id })
        .limit(1)
        .get()
      if (gardenRes.data && gardenRes.data.length > 0) {
        garden = gardenRes.data[0]
      }
    }

    // 获取用户成就
    const achRes = await db.collection('user_achievements')
      .where({ openid })
      .limit(1)
      .get()

    const achievements = achRes.data?.[0]?.achievements || []

    return {
      success: true,
      currentTheme,
      currentNode,
      messages,
      user,
      garden,
      achievements,
    }
  } catch (e) {
    console.error('getHomeData 云函数错误', e)
    return { success: false, error: e.message }
  }
}