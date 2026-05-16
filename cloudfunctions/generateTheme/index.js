// 云函数：generateTheme - 保存客户端生成的课程到数据库
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const { openid, themeData } = event

  if (!openid || !themeData || !themeData.name || !themeData.nodes) {
    return { success: false, error: '缺少必要参数' }
  }

  try {
    const themeId = 'theme_' + Date.now()

    // 创建主题记录
    await db.collection('themes').add({
      data: {
        _id: themeId,
        name: themeData.name,
        description: themeData.description || '',
        cover: '',
        totalNodes: themeData.totalNodes || themeData.nodes.length,
        tags: themeData.tags || [],
        status: 'published',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
    })

    // 创建节点记录
    const nodeIds = []
    for (let i = 0; i < themeData.nodes.length; i++) {
      const node = themeData.nodes[i]
      const nodeId = `${themeId}_node_${i + 1}`
      await db.collection('nodes').add({
        data: {
          _id: nodeId,
          themeId,
          order: i + 1,
          title: node.title,
          learningObjective: node.learningObjective || '',
          completionSignal: node.completionSignal || '',
          status: 'published',
        }
      })
      nodeIds.push(nodeId)
    }

    // 创建用户主题进度
    await db.collection('user_themes').add({
      data: {
        openid,
        themeId,
        completedNodeIds: [],
        currentNodeOrder: 1,
        status: 'learning',
        startedAt: Date.now(),
        completedAt: null,
      }
    })

    // 初始化花园
    await db.collection('user_gardens').add({
      data: {
        openid,
        themeId,
        plantLevel: 1,
        points: 0,
        decorations: [],
        updatedAt: Date.now(),
      }
    })

    return {
      success: true,
      theme: {
        _id: themeId,
        name: themeData.name,
        description: themeData.description,
        totalNodes: themeData.totalNodes || themeData.nodes.length,
      },
    }
  } catch (e) {
    console.error('generateTheme 云函数错误', e)
    return { success: false, error: e.message }
  }
}
