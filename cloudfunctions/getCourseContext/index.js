// 云函数：getCourseContext - 获取跨课程学习档案
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const { openid, currentThemeId } = event
  if (!openid) return { success: false, error: '缺少 openid' }

  try {
    // 1. 获取当前课程已完成课时的摘要
    let currentCourseLines = []
    let otherCourses = []

    if (currentThemeId) {
      const curSummaries = await db.collection('user_lesson_summaries')
        .where({ openid, themeId: currentThemeId })
        .orderBy('createdAt', 'asc')
        .get()

      if (curSummaries.data?.length > 0) {
        currentCourseLines = curSummaries.data.map(s => {
          const nodeLabel = s.nodeId ? `课时${s.nodeId.replace('node_', '')}` : '课时'
          return `  - ${nodeLabel}（${s.score || '?'}分）: ${s.summary || ''}`
        })
      }
    }

    // 2. 获取其他已完成课程的所有课时摘要
    const allSummaries = await db.collection('user_lesson_summaries')
      .where({ openid })
      .orderBy('createdAt', 'asc')
      .get()

    if (allSummaries.data?.length > 0) {
      // 按 themeId 分组
      const grouped = {}
      for (const s of allSummaries.data) {
        if (s.themeId === currentThemeId) continue // 跳过当前课程（已单独处理）
        if (!grouped[s.themeId]) grouped[s.themeId] = []
        grouped[s.themeId].push(s)
      }

      // 获取课程名称
      const themeIds = Object.keys(grouped)
      for (const tid of themeIds) {
        let name = tid
        try {
          const tRes = await db.collection('themes').doc(tid).get()
          if (tRes.data?.name) name = tRes.data.name
        } catch(e) {}
        const lines = grouped[tid].map(s => {
          const nodeLabel = s.nodeId ? `第${s.nodeId.replace('node_', '')}课` : ''
          return s.score
            ? `    ${nodeLabel}（${s.score}分）: ${s.summary || ''}`
            : `    ${nodeLabel}: ${s.summary || ''}`
        })
        otherCourses.push(`- ${name}（${grouped[tid].length}个课时）:\n${lines.join('\n')}`)
      }
    }

    // 3. 构建上下文文本
    const parts = []
    if (currentCourseLines.length > 0) {
      parts.push(`当前课程已学:\n${currentCourseLines.join('\n')}`)
    }
    if (otherCourses.length > 0) {
      parts.push(`已学课程:\n${otherCourses.join('\n\n')}`)
    }

    const context = parts.join('\n\n')

    return { success: true, context: context || '暂无历史学习记录。' }
  } catch (e) {
    console.error('[getCourseContext] error:', e.message)
    return { success: false, error: e.message }
  }
}
