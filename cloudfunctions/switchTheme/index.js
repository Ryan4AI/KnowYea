// 云函数：switchTheme - 切换主题
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const { openid, themeId } = event

  if (!openid || !themeId) {
    return { success: false, error: '缺少必要参数' }
  }

  try {
    // 获取主题信息
    const themeRes = await db.collection('themes').doc(themeId).get()
    if (!themeRes.data) {
      return { success: false, error: '主题不存在' }
    }

    const theme = themeRes.data

    // 获取用户主题进度
    const utRes = await db.collection('user_themes')
      .where({ openid, themeId })
      .limit(1)
      .get()

    if (!utRes.data || utRes.data.length === 0) {
      return { success: false, error: '未添加该主题' }
    }

    const userTheme = utRes.data[0]

    // 获取当前节点
    const currentOrder = userTheme.currentNodeOrder || 1
    const nodeRes = await db.collection('nodes')
      .where({ themeId, order: currentOrder, status: 'published' })
      .limit(1)
      .get()

    const currentNode = nodeRes.data?.[0] || null

    // 获取对话历史
    let messages = []
    if (currentNode) {
      const convRes = await db.collection('user_conversations')
        .where({ openid, themeId, nodeId: currentNode._id })
        .limit(1)
        .get()

      if (convRes.data && convRes.data.length > 0) {
        messages = convRes.data[0].messages || []
      }
    }

    // 获取花园数据
    const gardenRes = await db.collection('user_gardens')
      .where({ openid, themeId })
      .limit(1)
      .get()

    const garden = gardenRes.data?.[0] || null

    return {
      success: true,
      theme: {
        _id: theme._id,
        name: theme.name,
        description: theme.description,
        totalNodes: theme.totalNodes,
        completedCount: userTheme.completedNodeIds?.length || 0,
      },
      currentNode,
      messages,
      garden,
    }
  } catch (e) {
    console.error('switchTheme 云函数错误', e)
    return { success: false, error: e.message }
  }
}