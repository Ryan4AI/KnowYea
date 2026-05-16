// pages/learn/learn.js
const app = getApp()

const AGE_OPTIONS = ['18岁以下', '18-25岁', '26-35岁', '36-45岁', '45岁以上']

const OCCUPATION_OPTIONS = ['学生', '产品经理', '设计师', '工程师/技术', '运营', '市场/营销', '销售', '财务/金融', 'HR/行政', '创业者', '自由职业', '其他']
const INTEREST_OPTIONS = ['经济学', '心理学', '思维模型', '商业分析', '自我提升', '效率工具', '科技趋势', '历史', '哲学', '科学']

const InterestTags = [
  '经济学', '心理学', '思维模型', '商业分析', '自我提升',
  '效率工具', '科技趋势', '历史', '哲学', '科学',
  '管理', '创业', '投资', '沟通', '决策'
]



function formatTime(timestamp) {
  const date = new Date(timestamp)
  const h = date.getHours().toString().padStart(2, '0')
  const m = date.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

function parseMessageBlocks(content) {
  if (!content) return [{ type: 'text', text: '' }]

  const blocks = []
  const pattern = /\[(概念|例子|总结)\]([\s\S]*?)\[\/\1\]|\[题目 type="(choice|open)"\]([\s\S]*?)\[\/题目\]/g
  let lastIndex = 0
  let match

  while ((match = pattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const plain = content.slice(lastIndex, match.index).replace(/\[完成\]/g, '').trim()
      if (plain) blocks.push({ type: 'text', text: plain })
    }
    if (match[1]) {
      blocks.push({ type: match[1], text: match[2].trim() })
    } else if (match[2]) {
      blocks.push({
        type: match[2],
        content: match[3].trim(),
      })
    }
    lastIndex = pattern.lastIndex
  }

  const rest = content.slice(lastIndex).replace(/\[完成\]/g, '').trim()
  if (rest) blocks.push({ type: 'text', text: rest })
  if (blocks.length === 0) {
    blocks.push({ type: 'text', text: content.replace(/\[完成\]/g, '').trim() })
  }
  return blocks
}

function processMessages(messages) {
  return (messages || []).map(msg => ({
    ...msg,
    blocks: parseMessageBlocks(msg.content),
    timeStr: formatTime(msg.createdAt || Date.now()),
  }))
}

function lightVibrate() {
  try {
    if (wx.vibrateShort) {
      wx.vibrateShort({ type: 'light' })
    }
  } catch (e) {
    // ignore
  }
}

Page({
  data: {
    openid: '',
    theme: null,
    node: null,
    messages: [],
    isLoading: false,
    loadingMore: false,
    inputValue: '',
    plantLevel: 1,
    plantPoints: 0,
    isCompleted: false,
    showCompleteBtn: false,
    reviewMode: false,
    isFavorited: false,
    showThemeSwitcher: false,
    learningThemes: [],
    hasMoreMessages: false,
    messageOffset: 0,
    showAchievementPopup: false,
    currentAchievement: null,
    showProfileSetup: false,
    showCustomInterestInput: false,
    // 课程生成加载进度
    showGenLoading: false,
    genProgress: 0,
    genStageText: '',
    profileForm: {
      ageIndex: 2,
      occupationIndex: -1,
      interestIndexes: [],
    },
    occupationOptions: OCCUPATION_OPTIONS,
    interestOptions: InterestTags,
    ageOptions: AGE_OPTIONS,
    scrollIntoView: '',
  },

  onShow() {
    console.log('[learn onShow] called')
    this.bootstrap()
  },

  async bootstrap() {
    await app.waitForLogin()
    console.log('[bootstrap] openid:', app.globalData.openid)
    this.setData({ openid: app.globalData.openid || '' })

    const context = app.consumeLearnContext()
    if (context) {
      this.loadHomeData(context)
      return
    }

    this.loadHomeData()
  },

  loadHomeData(context = {}) {
    console.log('[loadHomeData] called, context:', JSON.stringify(context))
    if (!app.globalData.openid) return

    wx.showLoading({ title: '加载中...' })

    wx.cloud.callFunction({
      name: 'getHomeData',
      data: {
        openid: app.globalData.openid,
        themeId: context.themeId,
        nodeId: context.nodeId,
        mode: context.mode,
        messageLimit: 30,
        messageOffset: context.messageOffset || 0,
      },
      success: res => {
        wx.hideLoading()
        if (!res.result || !res.result.success) return

        const {
          currentTheme,
          currentNode,
          messages,
          garden,
          needsOnboarding,
          isReviewMode,
          isFavorited,
          hasMoreMessages,
          messageOffset,
        } = res.result

        const processedMessages = processMessages(messages)

        this.setData({
          theme: currentTheme,
          node: currentNode,
          messages: processedMessages,
          plantLevel: garden?.plantLevel || 1,
          plantPoints: garden?.points || 0,
          reviewMode: !!isReviewMode,
          isFavorited: !!isFavorited,
          hasMoreMessages: !!hasMoreMessages,
          messageOffset: messageOffset || 0,
          showProfileSetup: !!needsOnboarding,
          isCompleted: false,
          showCompleteBtn: false,
        })

        if (isReviewMode) {
          wx.showToast({ title: '复习模式', icon: 'none' })
        }
      },
      fail: err => {
        wx.hideLoading()
        console.error('加载失败', err)
        wx.showToast({ title: '加载失败', icon: 'none' })
      },
    })
  },

  loadLearningThemes() {
    wx.cloud.callFunction({
      name: 'getThemes',
      data: { openid: app.globalData.openid },
      success: res => {
        if (res.result && res.result.success) {
          const learningThemes = (res.result.themes || []).filter(
            t => t.status === 'learning'
          )
          this.setData({ learningThemes })
        }
      },
    })
  },

  sendMessage(contentOverride) {
    const content = (typeof contentOverride === 'string' ? contentOverride : this.data.inputValue || '').trim()
    const { node, theme, messages, isLoading, reviewMode } = this.data
    if (!content || isLoading || !node) return

    const userMsg = {
      id: 'user_' + Date.now(),
      role: 'user',
      content,
      createdAt: Date.now(),
      blocks: parseMessageBlocks(content),
      timeStr: formatTime(Date.now()),
    }

    // 如果是自动触发的第一条消息（来自 onConfirmTheme），不显示用户消息
    if (contentOverride) {
      this.setData({ isLoading: true })
    } else {
      this.setData({
        messages: [...messages, userMsg],
        inputValue: '',
        isLoading: true,
      })
    }
    this.scrollToBottom()

    // 构建 MiniMax 对话
    const miniMaxMessages = [
      { role: 'system', content: '你是一位专业、耐心、善于引导的AI导师。用通俗易懂的语言解释概念，多用生活例子，适当提问。每次回复简洁，适合手机阅读。当用户理解后标记 [完成]。' },
      { role: 'system', content: `当前课程：${theme?.name || ''}\n当前节点：${node?.title || ''}\n学习目标：${node?.learningObjective || ''}` },
      ...messages.slice(-6).map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content })),
      { role: 'user', content }
    ]

    // 通过云函数调 MiniMax API（不受域名白名单限制）
    wx.cloud.callFunction({
      name: 'sendMessage',
      data: {
        openid: app.globalData.openid,
        themeId: theme?._id || '',
        nodeId: node?._id || '',
        miniMaxMessages,
        userText: content,
      },
      success: res => {
        if (res.result && res.result.success && res.result.aiReply) {
          const aiReply = res.result.aiReply
          const isCompleted = aiReply.includes('[完成]')
          const aiMsg = {
            id: 'ai_' + Date.now(),
            role: 'ai',
            content: aiReply,
            blocks: parseMessageBlocks(aiReply),
            createdAt: Date.now(),
            timeStr: formatTime(Date.now()),
          }
          this.setData({
            messages: [...this.data.messages, aiMsg],
            isCompleted,
            showCompleteBtn: isCompleted && !reviewMode,
            isLoading: false,
          })
          this.scrollToBottom()
        } else {
          this.setData({ isLoading: false })
          wx.showToast({ title: res.result?.error || 'AI 请求失败', icon: 'none' })
        }
      },
      fail: err => {
        this.setData({ isLoading: false })
        wx.showToast({ title: '网络错误，请重试', icon: 'none' })
      }
    })
  },

  onInputChange(e) {
    this.setData({ inputValue: e.detail.value })
  },

  onQuestionSelect(e) {
    const { option } = e.detail
    if (!option) return
    lightVibrate()
    const answer = `${option.label}. ${option.text}`
    this.sendMessage(answer)
  },

  onQuestionSubmit(e) {
    const { answer } = e.detail
    if (answer && answer.trim()) {
      this.sendMessage(answer.trim())
    }
  },

  completeNode() {
    const { theme, node, reviewMode } = this.data
    if (!theme || !node) return

    if (reviewMode) {
      wx.showToast({ title: '复习模式不更新进度', icon: 'none' })
      return
    }

    wx.showLoading({ title: '处理中...' })

    wx.cloud.callFunction({
      name: 'completeNode',
      data: {
        openid: app.globalData.openid,
        themeId: theme._id,
        nodeId: node._id,
        reviewMode,
      },
      success: res => {
        wx.hideLoading()

        if (res.result && res.result.success) {
          const { isThemeCompleted, pointsEarned, newPlantLevel, unlockedAchievement } = res.result
          lightVibrate()

          const ACH_META = {
            first_node: { name: '初学乍道', description: '完成第一个节点', icon: '🌱' },
            node_10: { name: '十全十美', description: '完成 10 个节点', icon: '🏆' },
            first_theme: { name: '有始有终', description: '完成第一个主题', icon: '🌿' },
          }

          const showAchievement = () => {
            if (unlockedAchievement) {
              const meta = ACH_META[unlockedAchievement.id] || {}
              this.setData({
                showAchievementPopup: true,
                currentAchievement: {
                  ...unlockedAchievement,
                  name: unlockedAchievement.name || meta.name,
                  description: unlockedAchievement.description || meta.description,
                  icon: unlockedAchievement.icon || meta.icon,
                },
              })
            }
          }

          wx.showModal({
            title: '🎉 节点完成！',
            content: `获得 ${pointsEarned} 积分${newPlantLevel ? '，植物升级了！' : ''}`,
            showCancel: false,
            success: () => {
              showAchievement()
              if (isThemeCompleted) {
                wx.showToast({ title: '🎊 主题完成！', icon: 'none' })
              }
              this.loadHomeData()
            },
          })
        }
      },
      fail: err => {
        wx.hideLoading()
        console.error('完成节点失败', err)
        wx.showToast({ title: '操作失败', icon: 'none' })
      },
    })
  },

  onToggleFavorite() {
    const { node, isFavorited } = this.data
    if (!node) return

    wx.cloud.callFunction({
      name: 'toggleFavorite',
      data: { openid: app.globalData.openid, nodeId: node._id },
      success: res => {
        if (res.result && res.result.success) {
          lightVibrate()
          this.setData({ isFavorited: res.result.favorited })
          wx.showToast({
            title: res.result.favorited ? '已收藏' : '已取消收藏',
            icon: 'success',
          })
        }
      },
    })
  },

  onSwitchTheme() {
    lightVibrate()
    this.loadLearningThemes()
    this.setData({ showThemeSwitcher: true })
  },

  onCloseThemeSwitcher() {
    this.setData({ showThemeSwitcher: false })
  },

  onThemeChange(e) {
    const { themeId } = e.detail
    wx.showLoading({ title: '切换中...' })

    wx.cloud.callFunction({
      name: 'switchTheme',
      data: { openid: app.globalData.openid, themeId },
      success: res => {
        wx.hideLoading()
        if (res.result && res.result.success) {
          lightVibrate()
          this.setData({ showThemeSwitcher: false, reviewMode: false })
          this.loadHomeData()
        } else {
          wx.showToast({ title: res.result?.error || '切换失败', icon: 'none' })
        }
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({ title: '网络错误', icon: 'none' })
      },
    })
  },

  onGoThemeStore() {
    this.setData({ showThemeSwitcher: false })
    wx.navigateTo({ url: '/pages/theme-store/theme-store' })
  },

  onLoadMoreMessages() {
    if (!this.data.hasMoreMessages || this.data.loadingMore) return

    const { theme, node, messageOffset } = this.data
    if (!theme || !node) return

    this.setData({ loadingMore: true })
    const newOffset = messageOffset + 30

    wx.cloud.callFunction({
      name: 'getHomeData',
      data: {
        openid: app.globalData.openid,
        themeId: theme._id,
        nodeId: node._id,
        messageLimit: 30,
        messageOffset: newOffset,
      },
      success: res => {
        this.setData({ loadingMore: false })
        if (res.result && res.result.success) {
          const olderMessages = processMessages(res.result.messages)
          this.setData({
            messages: [...olderMessages, ...this.data.messages],
            hasMoreMessages: res.result.hasMoreMessages,
            messageOffset: newOffset,
          })
        }
      },
      fail: () => {
        this.setData({ loadingMore: false })
      },
    })
  },

  onProfileInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`profileForm.${field}`]: e.detail.value })
  },

  onAgeChange(e) {
    this.setData({ 'profileForm.ageIndex': Number(e.detail.value) })
  },

  onOccupationChange(e) {
    this.setData({ 'profileForm.occupationIndex': Number(e.detail.value) })
  },

  onInterestToggle(e) {
    const idx = Number(e.currentTarget.dataset.index)
    const indexes = [...this.data.profileForm.interestIndexes]
    const pos = indexes.indexOf(idx)
    if (pos > -1) {
      indexes.splice(pos, 1)
    } else {
      indexes.push(idx)
    }
    this.setData({ 'profileForm.interestIndexes': indexes })
  },

  onShowCustomInterest() {
    this.setData({ showCustomInterestInput: true })
  },

  onCustomInterestConfirm(e) {
    const text = (e.detail.value || '').trim()
    if (text) {
      const options = [...this.data.interestOptions]
      const idx = options.length
      options.push(text)
      const indexes = [...this.data.profileForm.interestIndexes]
      indexes.push(String(idx))
      this.setData({
        interestOptions: options,
        'profileForm.interestIndexes': indexes,
        showCustomInterestInput: false,
      })
    }
  },

  onCustomInterestBlur(e) {
    const text = (e.detail.value || '').trim()
    if (text) {
      this.onCustomInterestConfirm(e)
    } else {
      this.setData({ showCustomInterestInput: false })
    }
  },

  onSubmitProfile() {
    const { profileForm, occupationOptions, interestOptions } = this.data
    if (profileForm.occupationIndex < 0) {
      wx.showToast({ title: '请选择职业', icon: 'none' })
      return
    }

    if (!app.globalData.openid) {
      wx.showToast({ title: '登录异常', icon: 'none' })
      return
    }

    const profile = {
      age: profileForm.ageIndex + 1,
      occupation: occupationOptions[profileForm.occupationIndex],
      interests: profileForm.interestIndexes.map(i => interestOptions[i]),
    }

    wx.showLoading({ title: 'AI 生成课程中...', mask: true })

    wx.cloud.callFunction({
      name: 'generateTheme',
      data: { openid: app.globalData.openid, profile },
      success: genRes => {
        wx.hideLoading()
        if (genRes.result && genRes.result.success) {
          this.setData({
            showProfileSetup: false,
            pendingTheme: genRes.result.theme,
          })
        } else {
          wx.showToast({ title: genRes.result?.error || '生成失败', icon: 'none' })
        }
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({ title: '网络错误，请重试', icon: 'none' })
      }
    })
  },

  onConfirmTheme() {
    const { pendingTheme } = this.data
    if (!pendingTheme) return
    this.setData({ pendingTheme: null })
    wx.showLoading({ title: '加载中...' })
    wx.cloud.callFunction({
      name: 'getHomeData',
      data: { openid: app.globalData.openid },
      success: res => {
        wx.hideLoading()
        if (res.result && res.result.success && res.result.currentNode) {
          this.setData({
            theme: res.result.currentTheme || pendingTheme,
            node: res.result.currentNode,
            messages: [],
            isCompleted: false,
            showCompleteBtn: false,
          }, () => {
            // setData 完成后才发消息，确保 node 已经更新
            this.sendMessage('请开始介绍这个课时要学习的内容，用通俗易懂的语言')
          })
        }
      },
      fail: () => wx.hideLoading()
    })
  },

  onRegenerateTheme() {
    const { profileForm, occupationOptions, interestOptions } = this.data
    const profile = {
      age: profileForm.ageIndex + 1,
      occupation: occupationOptions[profileForm.occupationIndex],
      interests: profileForm.interestIndexes.map(i => interestOptions[i]),
    }

    // 显示进度条进行重新生成
    const interval = this.startGenLoading()

    const ageMap = { 1: '18岁以下', 2: '18-25岁', 3: '26-35岁', 4: '36-45岁', 5: '45岁以上' }
    const prompt = `根据以下用户画像，推荐一个合适的学习主题：

用户信息：
- 年龄：${ageMap[profile.age] || '25-35岁'}
- 职业：${profile.occupation || '职场人士'}
- 兴趣：${profile.interests?.join('、') || '通用知识'}

请生成一个适合该用户的全新学习主题，不要和之前推荐的重叠。节点数量由AI根据内容复杂度自行决定，不设上限。

严格以 JSON 格式输出（不要用 markdown 代码块）：
{"name":"主题名称","description":"主题描述","tags":["标签"],"nodes":[{"title":"节点标题","learningObjective":"学习目标","completionSignal":"完成标准"}]}`

    wx.cloud.callFunction({
      name: 'generateTheme',
      data: { openid: app.globalData.openid, profile },
      success: genRes => {
        this.stopGenLoading(interval)
        if (genRes.result && genRes.result.success) {
          this.setData({ pendingTheme: genRes.result.theme })
        } else {
          wx.showToast({ title: genRes.result?.error || '保存失败', icon: 'none' })
        }
      },
      fail: () => {
        this.stopGenLoading(interval)
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },

  onCloseThemePreview() {
    this.setData({ pendingTheme: null })
  },

  onCloseAchievement() {
    this.setData({ showAchievementPopup: false, currentAchievement: null })
  },

  scrollToBottom() {
    this.setData({ scrollIntoView: '' })
    setTimeout(() => {
      this.setData({ scrollIntoView: 'msg-bottom' })
    }, 80)
  },

  onGoThemeStoreFromEmpty() {
    wx.navigateTo({ url: '/pages/theme-store/theme-store' })
  },
})
