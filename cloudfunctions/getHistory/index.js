// 云函数：getHistory - 获取学习历史
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const { openid } = event

  if (!openid) {
    return { success: false, error: '缺少 openid' }
  }

  try {
    // 获取用户已完成的主题
    const utRes = await db.collection('user_themes')
      .where({ openid, status: 'completed' })
      .get()

    if (!utRes.data || utRes.data.length === 0) {
      return { success: true, history: [] }
    }

    const history = []

    // 获取每个主题的已完成节点
    for (const ut of utRes.data) {
      const completedNodeIds = ut.completedNodeIds || []

      // 获取主题信息
      const themeRes = await db.collection('themes').doc(ut.themeId).get()
      const themeName = themeRes.data?.name || ''

      for (const nodeId of completedNodeIds) {
        const nodeRes = await db.collection('nodes').doc(nodeId).get()
        if (!nodeRes.data) continue

        const node = nodeRes.data

        history.push({
          themeId: ut.themeId,
          themeName,
          nodeId: node._id,
          nodeTitle: node.title,
          nodeOrder: node.order,
          completedAt: ut.completedAt,
        })
      }
    }

    // 按完成时间倒序排列
    history.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))

    return { success: true, history }
  } catch (e) {
    console.error('getHistory 云函数错误', e)
    return { success: false, error: e.message }
  }
}