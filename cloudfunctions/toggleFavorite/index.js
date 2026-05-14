// 云函数：toggleFavorite - 收藏/取消收藏节点
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const { openid, nodeId } = event

  if (!openid || !nodeId) {
    return { success: false, error: '缺少必要参数' }
  }

  try {
    // 获取收藏列表
    const favRes = await db.collection('user_favorites')
      .where({ openid })
      .limit(1)
      .get()

    if (favRes.data && favRes.data.length > 0) {
      const fav = favRes.data[0]
      const nodeIds = fav.nodeIds || []
      const index = nodeIds.indexOf(nodeId)

      if (index > -1) {
        // 取消收藏
        nodeIds.splice(index, 1)
        await db.collection('user_favorites').doc(fav._id).update({
          data: {
            nodeIds,
            updatedAt: Date.now(),
          }
        })
        return { success: true, favorited: false }
      } else {
        // 添加收藏
        nodeIds.push(nodeId)
        await db.collection('user_favorites').doc(fav._id).update({
          data: {
            nodeIds,
            updatedAt: Date.now(),
          }
        })
        return { success: true, favorited: true }
      }
    } else {
      // 创建收藏记录
      await db.collection('user_favorites').add({
        data: {
          openid,
          nodeIds: [nodeId],
          updatedAt: Date.now(),
        }
      })
      return { success: true, favorited: true }
    }
  } catch (e) {
    console.error('toggleFavorite 云函数错误', e)
    return { success: false, error: e.message }
  }
}