// 云函数：checkAchievement - 检查成就解锁
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

// 成就定义
const ACHIEVEMENT_DEFS = [
  { id: 'first_node', name: '初学乍道', description: '完成第一个节点', icon: '🌱' },
  { id: 'first_theme', name: '有始有终', description: '完成第一个主题', icon: '🌿' },
  { id: 'streak_3', name: '连胜达人', description: '连续学习 3 天', icon: '🔥' },
  { id: 'streak_7', name: '持之以恒', description: '连续学习 7 天', icon: '💪' },
  { id: 'node_10', name: '十全十美', description: '完成 10 个节点', icon: '🏆' },
  { id: 'theme_3', name: '三心二意', description: '完成 3 个主题', icon: '🎯' },
  { id: 'favorites_3', name: '收藏家', description: '收藏 3 个节点', icon: '❤️' },
  { id: 'share', name: '传播者', description: '分享一个节点', icon: '📤' },
]

exports.main = async (event, context) => {
  const { openid, trigger } = event

  if (!openid) {
    return { success: false, error: '缺少 openid' }
  }

  try {
    // 获取用户当前成就
    const achRes = await db.collection('user_achievements')
      .where({ openid })
      .limit(1)
      .get()

    let userAchievements = []
    let recordId = null

    if (achRes.data && achRes.data.length > 0) {
      userAchievements = achRes.data[0].achievements || []
      recordId = achRes.data[0]._id
    }

    const unlockedIds = userAchievements.map(a => a.id)

    // 根据 trigger 计算统计数据
    const stats = await calculateStats(openid, trigger)

    // 检查哪些成就可以解锁
    for (const def of ACHIEVEMENT_DEFS) {
      if (unlockedIds.includes(def.id)) continue
      if (checkTrigger(def.id, stats)) {
        // 解锁成就
        const newAchievement = { id: def.id, unlockedAt: Date.now() }
        userAchievements.push(newAchievement)

        if (recordId) {
          await db.collection('user_achievements').doc(recordId).update({
            data: { achievements: userAchievements }
          })
        } else {
          await db.collection('user_achievements').add({
            data: { openid, achievements: userAchievements }
          })
        }

        return { success: true, unlocked: { ...def, unlockedAt: Date.now() } }
      }
    }

    return { success: true, unlocked: null }
  } catch (e) {
    console.error('checkAchievement 云函数错误', e)
    return { success: false, error: e.message }
  }
}

async function calculateStats(openid, trigger) {
  // 获取用户已完成节点数
  const utRes = await db.collection('user_themes')
    .where({ openid })
    .get()

  let completedNodes = 0
  let completedThemes = 0

  if (utRes.data) {
    for (const ut of utRes.data) {
      completedNodes += (ut.completedNodeIds || []).length
      if (ut.status === 'completed') completedThemes++
    }
  }

  // 收藏数
  const favRes = await db.collection('user_favorites')
    .where({ openid })
    .limit(1)
    .get()

  const favorites = (favRes.data?.[0]?.nodeIds || []).length

  return { completedNodes, completedThemes, favorites }
}

function checkTrigger(achievementId, stats) {
  switch (achievementId) {
    case 'first_node': return stats.completedNodes >= 1
    case 'node_10': return stats.completedNodes >= 10
    case 'first_theme': return stats.completedThemes >= 1
    case 'theme_3': return stats.completedThemes >= 3
    case 'favorites_3': return stats.favorites >= 3
    default: return false
  }
}