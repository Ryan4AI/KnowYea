// 云函数：addTheme - 从主题库添加主题
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const { openid, themeId } = event

  if (!openid || !themeId) {
    return { success: false, error: '缺少必要参数' }
  }

  try {
    // 检查用户是否已经添加过该主题
    const existingRes = await db.collection('user_themes')
      .where({ openid, themeId })
      .limit(1)
      .get()

    if (existingRes.data && existingRes.data.length > 0) {
      return { success: false, error: '该主题已经在学习列表中' }
    }

    // 获取主题信息
    const themeRes = await db.collection('themes').doc(themeId).get()
    if (!themeRes.data) {
      return { success: false, error: '主题不存在' }
    }

    const theme = themeRes.data

    // 获取主题的节点
    const nodesRes = await db.collection('nodes')
      .where({ themeId, status: 'published' })
      .orderBy('order', 'asc')
      .get()

    const nodes = nodesRes.data || []

    // 创建用户主题进度记录
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

    // 初始化用户花园记录
    await db.collection('user_gardens').add({
      data: {
        openid,
        themeId,
        plantLevel: 1, // 种子阶段
        points: 0,
        decorations: [],
        updatedAt: Date.now(),
      }
    })

    return {
      success: true,
      theme: {
        _id: theme._id,
        name: theme.name,
        description: theme.description,
        totalNodes: nodes.length,
      },
      nodes: nodes.map(n => ({
        _id: n._id,
        order: n.order,
        title: n.title,
        learningObjective: n.learningObjective,
      })),
    }
  } catch (e) {
    console.error('addTheme 云函数错误', e)
    return { success: false, error: e.message }
  }
}