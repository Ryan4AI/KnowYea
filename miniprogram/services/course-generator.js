/**
 * course-generator.js — 课程生成服务
 * shared by: theme-store page, (future) other pages
 *
 * 职责：封装 generateTheme 云函数调用 + 进度管理 + 兴趣标签加载
 * 不包含页面 UI 逻辑（不要 setData 页面状态）
 */

const GEN_STAGES = [
  { text: '正在分析你的兴趣方向...', progress: 20 },
  { text: '正在构思课程结构...', progress: 50 },
  { text: '正在生成课程内容...', progress: 75 },
  { text: '课程即将准备就绪...', progress: 90 },
]

/**
 * 获取用户兴趣标签
 * @param {string} openid
 * @returns {Promise<string[]>}
 */
function loadInterestTags(openid) {
  return new Promise((resolve) => {
    if (!openid) { resolve([]); return }
    wx.cloud.callFunction({
      name: 'getUser',
      data: { openid }
    }).then(res => {
      const ud = res.result?.data || {}
      const userData = ud.user || {}
      const profile = userData.profile || userData
      if (res.result?.success && ud.user) {
        const tags = (userData.interests || []).filter(t => t.length > 0)
        resolve(tags)
      } else {
        resolve([])
      }
    }).catch(() => resolve([]))
  })
}

/**
 * 调用云函数生成课程
 * @param {string} openid
 * @param {object} profile - 用户画像
 * @param {string} themeName - 课程主题
 * @returns {Promise<{success:boolean, theme?:object, error?:string}>}
 */
function callGenerateTheme(openid, profile, themeName) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'createCourse',
      data: {
        openid,
        topic: themeName,
        userAge: profile.age || profile.ageRange,
        userOccupation: profile.occupation,
        interestTags: profile.interests || [],
      },
      success: res => {
        const d = res.result?.data || res.result
        if (res.result?.success && d?.courseId) {
          resolve({
            success: true,
            theme: {
              id: d.courseId,
              name: d.title,
              desc: d.description || '',
              nodesCount: d.totalLessons || 0,
            }
          })
        } else {
          resolve({ success: false, error: res.result?.error || '创建失败' })
        }
      },
      fail: err => {
        reject(err)
      }
    })
  })
}

/**
 * 模拟进度条的计时器
 * @param {function} onProgress - (stage:string, progress:number) => void
 * @returns {function} cancel - 调用取消计时器
 */
function startProgressSimulation(onProgress) {
  const timers = []
  let i = 0

  const next = () => {
    if (i >= GEN_STAGES.length) return
    onProgress(GEN_STAGES[i].text, GEN_STAGES[i].progress)
    i++
    if (i < GEN_STAGES.length) {
      const t = setTimeout(next, 2500)
      timers.push(t)
    }
  }

  onProgress('正在准备...', 5)
  const t0 = setTimeout(next, 800)
  timers.push(t0)

  return () => timers.forEach(clearTimeout)
}

module.exports = {
  GEN_STAGES,
  loadInterestTags,
  callGenerateTheme,
  startProgressSimulation,
}
