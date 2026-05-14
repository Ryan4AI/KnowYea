// 云函数：getStoreThemes - 获取主题库
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    // 获取所有已发布的主题
    const themesRes = await db.collection('themes')
      .where({ status: 'published' })
      .get()

    const themes = (themesRes.data || []).map(t => {
      // 根据主题名称添加 emoji
      let emoji = '📚'
      if (t.name.includes('经济')) emoji = '📊'
      else if (t.name.includes('心理')) emoji = '🧠'
      else if (t.name.includes('思维')) emoji = '💡'
      else if (t.name.includes('商业')) emoji = '💼'
      else if (t.name.includes('沟通')) emoji = '💬'
      else if (t.name.includes('投资')) emoji = '💰'
      else if (t.name.includes('历史')) emoji = '🏛️'

      return {
        _id: t._id,
        name: t.name,
        description: t.description,
        cover: t.cover,
        totalNodes: t.totalNodes,
        tags: t.tags || [],
        emoji,
        nodeCount: t.totalNodes || 0,
        added: false, // 前端会根据用户已添加的主题来设置
      }
    })

    return { success: true, themes }
  } catch (e) {
    console.error('getStoreThemes 云函数错误', e)
    return { success: false, error: e.message }
  }
}