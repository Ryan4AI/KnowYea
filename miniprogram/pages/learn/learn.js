// pages/learn/learn.js
const app = getApp()

// 时间格式化
function formatTime(timestamp) {
  const date = new Date(timestamp)
  const h = date.getHours().toString().padStart(2, '0')
  const m = date.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

// 解析消息内容为 HTML
function parseMessageContent(content) {
  if (!content) return ''
  // 替换换行符
  let html = content.replace(/\n/g, '<br>')

  // 概念卡片
  html = html.replace(/\[概念\]([\s\S]*?)\[\/概念\]/g, '<div class="concept-card"><div class="concept-title">📚 概念</div><div class="concept-text">$1</div></div>')

  // 例子卡片
  html = html.replace(/\[例子\]([\s\S]*?)\[\/例子\]/g, '<div class="example-card"><div class="example-label">💡 例子</div><div class="example-text">$1</div></div>')

  // 总结卡片
  html = html.replace(/\[总结\]([\s\S]*?)\[\/总结\]/g, '<div class="summary-card"><div class="summary-label">📝 总结</div><div class="summary-text">$1</div></div>')

  // 选择题
  html = html.replace(/\[题目 type="choice"\]([\s\S]*?)\[\/题目\]/g, function(match, body) {
    const parts = body.split('|')
    if (parts.length < 2) return match
    const questionText = parts[0]
    const options = parts.slice(1)
    const letters = ['A', 'B', 'C', 'D', 'E', 'F']
    let optionsHtml = '<div class="question-options">'
    options.forEach(function(opt, i) {
      if (opt.trim()) {
        optionsHtml += '<div class="option-btn" data-option="' + letters[i] + '. ' + opt.trim() + '">' + letters[i] + '. ' + opt.trim() + '</div>'
      }
    })
    optionsHtml += '</div>'
    return '<div class="question-card choice"><div class="question-label">📋 选择题</div><div class="question-text">' + questionText + '</div>' + optionsHtml + '</div>'
  })

  // 开放题
  html = html.replace(/\[题目 type="open"\]([\s\S]*?)\[\/题目\]/g, '<div class="question-card open"><div class="question-label">✏️ 开放题</div><div class="question-text">$1</div></div>')

  // 移除 [完成] 标记（用于逻辑判断不在界面显示）
  html = html.replace(/\[完成\]/g, '')

  return html
}

Page({
  data: {
    openid: '',
    theme: null,          // 当前主题
    node: null,           // 当前节点
    messages: [],          // 消息列表
    isLoading: false,
    inputValue: '',
    plantEmoji: '🌱',     // 当前植物图标
    isCompleted: false,    // 当前节点是否已完成
    showCompleteBtn: false,
    },

  onLoad() {
    this.setData({ openid: app.globalData.openid })
    this.loadHomeData()
  },

  onShow() {
    // 每次显示页面时刷新数据
    if (app.globalData.openid) {
      this.loadHomeData()
    }
  },

  // 加载首页数据
  loadHomeData() {
    if (!app.globalData.openid) return

    wx.showLoading({ title: '加载中...' })

    wx.cloud.callFunction({
      name: 'getHomeData',
      data: { openid: app.globalData.openid },
      success: res => {
        wx.hideLoading()
        if (res.result && res.result.success) {
          const { currentTheme, currentNode, messages } = res.result

          // 更新植物图标
          let plantEmoji = '🌱'
          if (currentTheme) {
            const completed = currentTheme.completedCount || 0
            if (completed >= 10) plantEmoji = '🍎'
            else if (completed >= 7) plantEmoji = '🌸'
            else if (completed >= 4) plantEmoji = '🌾'
            else if (completed >= 1) plantEmoji = '🌿'
          }

          // 处理消息：添加解析内容、时间字符串和选择题提示
          const processedMessages = (messages || []).map(msg => {
            const hasChoice = msg.content && (
              msg.content.includes('[题目 type="choice"]') || 
              msg.content.includes('[题目 type="open"]')
            );
            return {
              ...msg,
              parsedContent: parseMessageContent(msg.content),
              timeStr: formatTime(msg.createdAt || Date.now()),
              showChoiceHint: hasChoice && msg.role === 'ai'  // 只有AI的选择题显示提示
            };
          });

          this.setData({
            theme: currentTheme,
            node: currentNode,
            messages: processedMessages,
            plantEmoji,
          })
        }
      },
      fail: err => {
        wx.hideLoading()
        console.error('加载失败', err)
        wx.showToast({ title: '加载失败', icon: 'none' })
      }
    })
  },

  // 渲染消息列表
  renderMessages() {
    const { messages } = this.data

    // 如果没有消息，显示引导
    if (messages.length === 0 && this.data.node) {
      // 发送第一条 AI 消息引导学习
      this.sendFirstMessage()
    }
  },

  // 发送第一条引导消息
  sendFirstMessage() {
    const { node } = this.data
    if (!node) return

    const guideMessage = {
      id: 'ai_guide_' + Date.now(),
      role: 'ai',
      content: '[概念]欢迎来到"' + node.title + '"的学习！[/概念]\n\n今天我们将学习：' + node.learningObjective + '\n\n[总结]准备好了吗？我们可以开始了！[/总结]',
      createdAt: Date.now(),
      parsedContent: parseMessageContent('[概念]欢迎来到"' + node.title + '"的学习！[/概念]\n\n今天我们将学习：' + node.learningObjective + '\n\n[总结]准备好了吗？我们可以开始了！[/总结]'),
      timeStr: formatTime(Date.now()),
    }

    this.setData({ messages: [guideMessage] })
  },

  // 发送消息
  sendMessage() {
    const { inputValue, node, theme, isLoading } = this.data
    if (!inputValue.trim() || isLoading || !node) return

    const userMsg = {
      id: 'user_' + Date.now(),
      role: 'user',
      content: inputValue.trim(),
      createdAt: Date.now(),
      parsedContent: parseMessageContent(inputValue.trim()),
      timeStr: formatTime(Date.now()),
    }
    const messages = [...this.data.messages, userMsg]
    this.setData({
      messages,
      inputValue: '',
      isLoading: true,
    })

    // 调用云函数
    wx.cloud.callFunction({
      name: 'sendMessage',
      data: {
        openid: app.globalData.openid,
        themeId: theme._id,
        nodeId: node._id,
        content: inputValue.trim(),
      },
      success: res => {
        this.setData({ isLoading: false })

        if (res.result && res.result.success) {
          const { message, isCompleted } = res.result

          // 添加 AI 回复（含解析内容）
          const aiMsg = {
            ...message,
            parsedContent: parseMessageContent(message.content),
            timeStr: formatTime(message.createdAt || Date.now()),
          }
          this.setData({
            messages: [...this.data.messages, aiMsg],
            isCompleted,
            showCompleteBtn: isCompleted,
          })

          // 滚动到底部
          this.scrollToBottom()
        } else {
          wx.showToast({ title: res.result?.error || '发送失败', icon: 'none' })
        }
      },
      fail: err => {
        this.setData({ isLoading: false })
        console.error('发送消息失败', err)
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },

  // 输入变化
  onInputChange(e) {
    this.setData({ inputValue: e.detail.value })
  },

  // 手动完成节点
  completeNode() {
    const { theme, node } = this.data
    if (!theme || !node) return

    wx.showLoading({ title: '处理中...' })

    wx.cloud.callFunction({
      name: 'completeNode',
      data: {
        openid: app.globalData.openid,
        themeId: theme._id,
        nodeId: node._id,
      },
      success: res => {
        wx.hideLoading()

        if (res.result && res.result.success) {
          const { isThemeCompleted, pointsEarned, newPlantLevel } = res.result

          wx.showModal({
            title: '🎉 节点完成！',
            content: '获得 ' + pointsEarned + ' 积分' + (newPlantLevel ? '，植物升级了！' : ''),
            showCancel: false,
            success: () => {
              if (isThemeCompleted) {
                wx.showToast({ title: '🎊 主题完成！', icon: 'none' })
              }
              // 刷新数据
              this.loadHomeData()
            }
          })
        }
      },
      fail: err => {
        wx.hideLoading()
        console.error('完成节点失败', err)
        wx.showToast({ title: '操作失败', icon: 'none' })
      }
    })
  },

  // 滚动到底部
  scrollToBottom() {
    setTimeout(() => {
      wx.pageScrollTo({ scrollTop: 99999, duration: 300 })
    }, 100)
  },

  // 切换主题
  onSwitchTheme() {
    wx.navigateTo({ url: '/pages/themes/themes' })
  },

  // 选择选项（通过事件冒泡从 rich-text 点击）
  onOptionSelect(e) {
    const option = e.currentTarget.dataset.option
    if (option) {
      this.setData({ inputValue: option }, () => {
        this.sendMessage()
      })
    }
  },

  // 消息卡片点击（用于选择题选项点击）
  onMessageTap(e) {
    // rich-text 内的点击无法直接传参，通过 dataset
    const dataset = e.currentTarget.dataset
    if (dataset.option) {
      this.setData({ inputValue: dataset.option }, () => {
        this.sendMessage()
      })
    }
  },
})
