// 云函数：completeNode - 完成节点
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const { openid, themeId, nodeId, reviewMode } = event

  if (!openid || !themeId || !nodeId) {
    return { success: false, error: '缺少必要参数' }
  }

  if (reviewMode) {
    return {
      success: true,
      completed: false,
      reviewMode: true,
      message: '复习模式不更新学习进度',
    }
  }

  try {
    // 更新用户主题进度
    const utRes = await db.collection('user_themes')
      .where({ openid, themeId })
      .limit(1)
      .get()

    if (!utRes.data || utRes.data.length === 0) {
      return { success: false, error: '用户主题进度不存在' }
    }

    const userTheme = utRes.data[0]
    const completedNodeIds = userTheme.completedNodeIds || []

    // 检查节点是否已完成
    if (!completedNodeIds.includes(nodeId)) {
      completedNodeIds.push(nodeId)
    }

    // 获取节点总数
    const nodeCount = await db.collection('nodes')
      .where({ themeId, status: 'published' })
      .count()

    const totalNodes = nodeCount.total
    const isThemeCompleted = completedNodeIds.length >= totalNodes

    // 计算下一个节点顺序
    const currentOrder = userTheme.currentNodeOrder || 1
    const nextOrder = isThemeCompleted ? currentOrder : currentOrder + 1

    // 更新进度
    await db.collection('user_themes').doc(userTheme._id).update({
      data: {
        completedNodeIds,
        currentNodeOrder: nextOrder,
        status: isThemeCompleted ? 'completed' : 'learning',
        completedAt: isThemeCompleted ? Date.now() : null,
      }
    })

    // 更新花园数据
    const gardenRes = await db.collection('user_gardens')
      .where({ openid, themeId })
      .limit(1)
      .get()

    // 记录每日学习日志
    const today = new Date().toISOString().slice(0, 10)
    const logRes = await db.collection('study_logs').where({ openid, date: today }).limit(1).get()
    if (logRes.data && logRes.data.length > 0) {
      await db.collection('study_logs').doc(logRes.data[0]._id).update({
        data: { count: db.command.inc(1), updatedAt: Date.now() }
      })
    } else {
      await db.collection('study_logs').add({
        data: { openid, date: today, count: 1, createdAt: Date.now() }
      })
    }

    let newPlantLevel = null
    let pointsEarned = 10

    if (gardenRes.data && gardenRes.data.length > 0) {
      const garden = gardenRes.data[0]
      const currentPoints = garden.points || 0
      const currentLevel = garden.plantLevel || 1

      // 计算新植物阶段
      // 种子(1) -> 苗(2) -> 花(3) -> 果实(4)
      const newPoints = currentPoints + pointsEarned
      let newLevel = currentLevel

      if (newPoints >= 30 && currentLevel < 4) newLevel = 4  // 果实
      else if (newPoints >= 20 && currentLevel < 3) newLevel = 3  // 花
      else if (newPoints >= 10 && currentLevel < 2) newLevel = 2  // 苗

      // 主题完成奖励
      if (isThemeCompleted) {
        const decorations = garden.decorations || []
        decorations.push('🏆金牌植物')
        await db.collection('user_gardens').doc(garden._id).update({
          data: {
            points: newPoints,
            plantLevel: newLevel,
            decorations,
            updatedAt: Date.now(),
          }
        })
      } else {
        await db.collection('user_gardens').doc(garden._id).update({
          data: {
            points: newPoints,
            plantLevel: newLevel,
            updatedAt: Date.now(),
          }
        })
      }

      if (newLevel !== currentLevel) {
        newPlantLevel = newLevel
      }
    }

    // 检查成就
    const unlockedAchievement = await checkAchievements(openid, {
      completedNodes: completedNodeIds.length,
      completedThemes: isThemeCompleted ? (userTheme.completedThemes || 0) + 1 : 0,
    })

    return {
      success: true,
      completed: true,
      isThemeCompleted,
      pointsEarned,
      newPlantLevel,
      unlockedAchievement,
    }
  } catch (e) {
    console.error('completeNode 云函数错误', e)
    return { success: false, error: e.message }
  }
}

// 检查成就解锁
async function checkAchievements(openid, stats) {
  try {
    const achRes = await db.collection('user_achievements')
      .where({ openid })
      .limit(1)
      .get()

    if (!achRes.data || achRes.data.length === 0) return null

    const userAchievements = achRes.data[0].achievements || []
    const unlockedIds = userAchievements.map(a => a.id)

    // 成就定义
    const ACHIEVEMENTS = [
      { id: 'first_node', name: '初学乍道', description: '完成第一个节点', icon: '🌱', trigger: () => stats.completedNodes >= 1 },
      { id: 'node_10', name: '十全十美', description: '完成 10 个节点', icon: '🏆', trigger: () => stats.completedNodes >= 10 },
      { id: 'first_theme', name: '有始有终', description: '完成第一个主题', icon: '🌿', trigger: () => stats.completedThemes >= 1 },
    ]

    // 检查是否有新成就可以解锁
    for (const ach of ACHIEVEMENTS) {
      if (!unlockedIds.includes(ach.id) && ach.trigger()) {
        // 解锁新成就
        userAchievements.push({
          id: ach.id,
          unlockedAt: Date.now(),
        })

        await db.collection('user_achievements').doc(achRes.data[0]._id).update({
          data: { achievements: userAchievements }
        })

        return { id: ach.id, name: ach.name, description: ach.description, icon: ach.icon }
      }
    }

    return null
  } catch (e) {
    console.error('checkAchievements 错误', e)
    return null
  }
}