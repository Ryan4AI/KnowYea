// 云函数：getFavorites - 获取收藏列表
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const { openid } = event

  if (!openid) {
    return { success: false, error: '缺少 openid' }
  }

  try {
    // 获取收藏列表
    const favRes = await db.collection('user_favorites')
      .where({ openid })
      .limit(1)
      .get()

    if (!favRes.data || favRes.data.length === 0) {
      return { success: true, favorites: [] }
    }

    const nodeIds = favRes.data[0].nodeIds || []

    if (nodeIds.length === 0) {
      return { success: true, favorites: [] }
    }

    // 获取收藏的节点详情
    const favorites = []
    for (const nodeId of nodeIds) {
      const nodeRes = await db.collection('nodes').doc(nodeId).get()
      if (!nodeRes.data) continue

      const node = nodeRes.data

      // 获取主题信息
      const themeRes = await db.collection('themes').doc(node.themeId).get()

      favorites.push({
        nodeId: node._id,
        nodeTitle: node.title,
        nodeOrder: node.order,
        learningObjective: node.learningObjective,
        themeId: node.themeId,
        themeName: themeRes.data?.name || '',
      })
    }

    return { success: true, favorites }
  } catch (e) {
    console.error('getFavorites 云函数错误', e)
    return { success: false, error: e.message }
  }
}