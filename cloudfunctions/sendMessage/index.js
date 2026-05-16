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
  await new Promise(resolve => setTimeout(resolve, 800))

  const lastMessage = messages[messages.length - 1].content
  const systemMessages = messages.filter(m => m.role === 'system')
  const nodeInfo = systemMessages.find(m => m.content.includes('当前节点'))
  const nodeTitle = nodeInfo ? nodeInfo.content.match(/当前节点：(.+)/)?.[1] : ''
  const learningObj = nodeInfo ? nodeInfo.content.match(/学习目标：(.+)/)?.[1] : ''
  const completionSignal = nodeInfo ? nodeInfo.content.match(/完成标准：(.+)/)?.[1] : ''

  // 理解类问题
  if (lastMessage.includes('什么是') || lastMessage.includes('解释') || lastMessage.includes('理解')) {
    return `[概念]${nodeTitle}是一个值得深入理解的概念。[/概念]\n\n${learningObj}\n\n[例子]比如说，在日常生活中我们可以这样理解${nodeTitle}...[/例子]\n\n[题目 type="open"]你能试着用自己的话说说你对${nodeTitle}的理解吗？[/题目]`
  }

  // 例子类问题
  if (lastMessage.includes('例子') || lastMessage.includes('比如') || lastMessage.includes('如何应用')) {
    return `[例子]就像我们去超市买菜，同样的菜在不同的地方价格不同——这就涉及到经济学中${nodeTitle}的原理。[/例子]\n\n[总结]所以当你做决策时，考虑一下${nodeTitle}会如何影响结果。[/总结]\n\n[题目 type="choice"]你觉得理解了吗？|A. 完全理解了|B. 大概理解了|C. 还需要再看看|D. 不太懂[/题目]`
  }

  // 用户给出理解/解释，判断是否达到完成标准
  if (lastMessage.includes('我认为是') || lastMessage.includes('我的理解') || lastMessage.includes('我觉得') || lastMessage.length > 20) {
    // 模拟判断用户是否达到完成标准
    const hasExplained = lastMessage.length > 15 && !lastMessage.includes('不知道')
    const hasExample = lastMessage.includes('比如') || lastMessage.includes('就像') || lastMessage.includes('例如')

    if (hasExplained) {
      if (hasExample) {
        return `[概念]你的理解很到位！[/概念]\n\n[例子]你举的例子也很贴切，说明你真正掌握了${nodeTitle}这个概念。${completionSignal ? '完成标准已达成：' + completionSignal : ''}[/例子]\n\n✅ [完成]\n\n[总结]我们来做个小测验巩固一下吧！[/总结]\n\n[题目 type="choice"]以下哪个说法正确体现了${nodeTitle}？|A. 涉及到机会成本的选择|B. ${nodeTitle}的实际应用|C. 两者的区别和联系|D. 以上都是[/题目]`
      }
      return `[概念]你的理解基本正确！[/概念]\n\n不过要真正掌握${nodeTitle}，还需要能举出一个生活中的例子。能试着举例说明吗？\n\n[题目 type="open"]请举个生活中的例子来说明${nodeTitle}？[/题目]`
    }
    return `[概念]没关系，我们慢慢来理解${nodeTitle}。[/概念]\n\n[例子]让我用一个更简单的例子来说明：就像...[/例子]\n\n[题目 type="open"]你觉得这个例子和${nodeTitle}有什么关系？[/题目]`
  }

  // 选择题回答
  if (/^[A-D]/.test(lastMessage)) {
    const correctAnswer = 'B' // 模拟正确答案
    if (lastMessage.startsWith(correctAnswer)) {
      return `[概念]回答正确！[/概念]\n\n你对${nodeTitle}的理解已经很扎实了。${completionSignal ? '完成标准已达成：' + completionSignal : ''}\n\n✅ [完成]\n\n[总结]恭喜你完成了"${nodeTitle}"的学习！继续加油！[/总结]`
    }
    return `[例子]这个答案不太准确，但不要紧。[/例子]\n\n让我再解释一下：${nodeTitle}的核心在于...\n\n[题目 type="open"]再想想，为什么答案是${correctAnswer}？[/题目]`
  }

  // 复习模式
  if (systemMessages.some(m => m.content.includes('复习'))) {
    return `[概念]我们来复习一下"${nodeTitle}"。[/概念]\n\n${learningObj}\n\n[题目 type="choice"]关于${nodeTitle}，以下说法正确的是？|A. ${nodeTitle}就是...|B. ${nodeTitle}的特点是...|C. ${nodeTitle}可以帮助我们...|D. 以上都不对[/题目]`
  }

  // 默认回复
  return `[概念]欢迎学习"${nodeTitle}"！[/概念]\n\n今天我们将掌握：${learningObj}\n\n[总结]准备好了吗？我们开始吧！[/总结]\n\n[题目 type="open"]你知道什么是${nodeTitle}吗？试着说说你的理解。[/题目]`
}