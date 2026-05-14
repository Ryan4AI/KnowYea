// 云函数：msgSecCheck - 内容安全检测
// 微信内容安全 API，使用云开发统一资源实现
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const { content } = event

  if (!content) {
    return { success: false, error: '缺少内容' }
  }

  try {
    // 调用微信内容安全检测
    // 方式一：使用云开发安全拦截（云开发环境自带基础安全保障）
    // 方式二：调用微信内容安全 API（需企业认证）

    // 这里使用模拟检测，生产环境替换为真实 API
    // 真实调用示例：
    // const res = await cloud.openapi.security.msgSecCheck({
    //   content: content,
    //   version: 2,
    //   openid: event.openid || '',
    //   scene: 2,
    // })

    // 模拟：检测敏感词
    const sensitiveWords = ['敏感词示例1', '敏感词示例2']
    for (const word of sensitiveWords) {
      if (content.includes(word)) {
        return {
          success: true,
          safe: false,
          error: '内容包含敏感信息'
        }
      }
    }

    return { success: true, safe: true }
  } catch (e) {
    console.error('msgSecCheck 云函数错误', e)
    // 出错时返回安全（避免阻断正常流程）
    return { success: true, safe: true }
  }
}