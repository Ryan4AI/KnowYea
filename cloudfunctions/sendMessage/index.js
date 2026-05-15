// 云函数：sendMessage - AI 对话
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

// AI System Prompt
const SYSTEM_PROMPT = `你是一位专业、耐心、善于引导的AI导师。你的任务是帮助用户通过对话学习一个知识概念。

核心原则：
1. 用通俗易懂的语言解释抽象概念
2. 多用生活中的实际例子
3. 适当提问，确认用户理解程度
4. 鼓励用户思考，不要直接给出答案

输出格式要求：
- 使用结构化标记来区分不同类型的内容
- 每次回复应该简洁（100-200字），适合手机阅读
- 根据教学需要，灵活使用以下标记：

[概念]...[/概念] - 用于介绍一个新概念的定义
[例子]...[/例子] - 用于举例说明
[题目 type="choice"]...[/题目] - 选择题，选项用|A|B|C|D分隔
[题目 type="open"]...[/题目] - 开放题，让用户自由回答
[总结]...[/总结] - 用于总结本节点学习内容
[完成] - 当用户达成学习目标时包含此标记

完成信号：只有当用户能够用自己的话解释概念，并举出一个正确的例子时，才标记 [完成]。

注意：
- 不要一次性输出太多内容
- 每次只讲一个核心概念
- 用户回答后，给出具体的反馈`

exports.main = async (event, context) => {
  const { openid, themeId, nodeId, content, reviewMode } = event

  if (!openid || !themeId || !nodeId) {
    return { success: false, error: '缺少必要参数' }
  }

  try {
    // 获取节点信息
    const nodeRes = await db.collection('nodes').doc(nodeId).get()
    if (!nodeRes.data) {
      return { success: false, error: '节点不存在' }
    }
    const node = nodeRes.data

    // 获取对话历史（最近 10 条）
    const convRes = await db.collection('user_conversations')
      .where({ openid, themeId, nodeId })
      .limit(1)
      .get()

    let historyMessages = []
    if (convRes.data && convRes.data.length > 0) {
      historyMessages = convRes.data[0].messages.slice(-10)
    }

    // 构造 AI 输入
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'system', content: `当前节点：${node.title}\n学习目标：${node.learningObjective}\n完成标准：${node.completionSignal}` },
      ...historyMessages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content }
    ]

    // 调用 AI（模拟）
    let aiReply = await callAI(messages)

    // 内容安全检测（生产环境需要调用 msgSecCheck）
    // aiReply = await contentSafetyCheck(aiReply)

    // 生成消息 ID
    const messageId = 'msg_' + Date.now()

    // 保存用户消息
    await saveMessage(openid, themeId, nodeId, {
      id: 'user_' + Date.now(),
      role: 'user',
      content,
      createdAt: Date.now(),
    })

    // 保存 AI 回复
    const aiMessageId = 'ai_' + Date.now()
    await saveMessage(openid, themeId, nodeId, {
      id: aiMessageId,
      role: 'ai',
      content: aiReply,
      createdAt: Date.now(),
    })

    // 检查是否包含 [完成] 标记
    const isCompleted = aiReply.includes('[完成]')

    return {
      success: true,
      message: {
        id: aiMessageId,
        role: 'ai',
        content: aiReply,
        createdAt: Date.now(),
      },
      isCompleted,
    }
  } catch (e) {
    console.error('sendMessage 云函数错误', e)
    return { success: false, error: e.message }
  }
}

async function saveMessage(openid, themeId, nodeId, message) {
  const convRes = await db.collection('user_conversations')
    .where({ openid, themeId, nodeId })
    .limit(1)
    .get()

  if (convRes.data && convRes.data.length > 0) {
    // 更新现有对话
    const conv = convRes.data[0]
    const messages = conv.messages || []
    messages.push(message)

    // 保持最近 30 条消息
    if (messages.length > 30) {
      messages.splice(0, messages.length - 30)
    }

    await db.collection('user_conversations').doc(conv._id).update({
      data: {
        messages,
        updatedAt: Date.now(),
      }
    })
  } else {
    // 创建新对话
    await db.collection('user_conversations').add({
      data: {
        openid,
        themeId,
        nodeId,
        messages: [message],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
    })
  }
}

// 模拟 AI 调用（生产环境替换为真实 API）
async function callAI(messages) {
  // 模拟延迟
  await new Promise(resolve => setTimeout(resolve, 500))

  // 简单模拟回复
  const lastMessage = messages[messages.length - 1].content

  if (lastMessage.includes('什么是') || lastMessage.includes('解释')) {
    return `[概念]这是一个需要理解的概念，让我们一起来学习。[/概念]\n\n[例子]比如在生活中，我们可以这样理解...[/例子]\n\n你觉得这个解释清楚吗？有什么疑问吗？`
  }

  if (lastMessage.includes('例子') || lastMessage.includes('比如')) {
    return `[例子]就像我们去超市买菜，同样的菜在不同的地方价格不同，这就是经济学中的...[/例子]\n\n[题目 type="open"]你能想到生活中类似的例子吗？试着说一个。[/题目]`
  }

  // 默认回复
  return `[概念]很好，你在学习这个知识点。[/概念]\n\n继续思考一下，如果应用到实际生活中，你会怎么用？\n\n[题目 type="choice"]你觉得理解了吗？|A. 完全理解了|B. 大概理解了|C. 还需要再看看|D. 不太懂[/题目]`
}