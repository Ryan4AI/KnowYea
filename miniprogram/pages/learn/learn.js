// pages/learn/learn.js — 纯学习页（不处理画像收集 / 课程生成）
const app = getApp()

// 仅用于 system prompt 中映射年龄文字
const AGE_OPTIONS = ['18岁以下', '18-25岁', '26-35岁', '36-45岁', '46岁以上']

const { formatTime, parseMessageBlocks } = require('../../utils/helpers')

function processMessages(messages) {
  return (messages || []).map(msg => ({
    ...msg,
    blocks: parseMessageBlocks(msg.content),
    timeStr: formatTime(msg.createdAt || Date.now()),
    completed: msg.completed || msg.isCompleted || false,
  }))
}

function lightVibrate() {
  try {
    if (wx.vibrateShort) {
      wx.vibrateShort({ type: 'light' })
    }
  } catch (e) { /* ignore */ }
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
    canSend: false,
    plantLevel: 1,
    isCompleted: false,
    isLearning: false,
    isPendingTransition: false,
    showCompleteBtn: false,
    reviewMode: false,
    isFavorited: false,
    showThemeSwitcher: false,
    learningThemes: [],
    hasMoreMessages: false,
    messageOffset: 0,
    showAchievementPopup: false,
    currentAchievement: null,
    userProfile: {},
    showThemeInfo: false,
    hasNextNode: false,
    scrollIntoView: '',
    navBarTop: 0,
    courseContext: '',
  },

  onShow() {
    this.bootstrap()
  },

  async bootstrap() {
    try {
      const sys = wx.getSystemInfoSync()
      this.setData({ navBarTop: sys.statusBarHeight })
    } catch(e) {
      this.setData({ navBarTop: 44 })
    }

    await app.waitForLogin()
    this.setData({ openid: app.globalData.openid || '' })

    const context = app.consumeLearnContext()
    if (context) {
      this.loadHomeData(context)
      return
    }

    this.loadHomeData()
  },

  loadHomeData(context = {}) {
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
          nodeCompleted,
          garden,
          needsOnboarding,
          isReviewMode,
          isFavorited,
          hasMoreMessages,
          messageOffset,
          user,
        } = res.result

        // 没画像 → 跳转画像收集
        if (needsOnboarding) {
          wx.redirectTo({ url: '/pages/profile/profile' })
          return
        }

        // 有画像但没课程 → 跳转课程商店
        if (!currentTheme && !context.themeId) {
          wx.redirectTo({ url: '/pages/theme-store/theme-store' })
          return
        }

        const userProfile = user?.profile || {}
        this.setData({ userProfile })

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
          isCompleted: !!nodeCompleted,
          isLearning: !!currentNode && !isReviewMode && !nodeCompleted,
          isPendingTransition: false,
          showCompleteBtn: false,
          hasNextNode: currentTheme?.totalNodes && currentNode?.order
            ? currentNode.order < currentTheme.totalNodes
            : false,
        })

        if (isReviewMode) {
          wx.showToast({ title: '复习模式', icon: 'none' })
        }

        this.refreshCourseContext()

        if (typeof context.callback === 'function') {
          context.callback()
        }

        if (currentNode && processedMessages.length === 0 && !needsOnboarding && !isReviewMode) {
          wx.showLoading({ title: '加载中...' })
          setTimeout(() => {
            wx.hideLoading()
            this.sendMessage(`请开始介绍"${currentNode.title}"这个课时要学习的内容，用通俗易懂的语言`, true)
          }, 500)
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
          this.setData({
            learningThemes: (res.result.themes || []).filter(t => t.status === 'learning'),
          })
        }
      },
    })
  },

  refreshCourseContext() {
    const { theme } = this.data
    if (!app.globalData.openid) return
    wx.cloud.callFunction({
      name: 'getCourseContext',
      data: { openid: app.globalData.openid, currentThemeId: theme?._id || '' },
      success: res => {
        if (res.result?.success && res.result.context) {
          this.setData({ courseContext: res.result.context })
        }
      },
      fail: () => {},
    })
  },

  sendMessage(contentOverride, isAutoMessage) {
    const content = (typeof contentOverride === 'string' ? contentOverride : this.data.inputValue || '').trim()
    const { node, theme, messages, isLoading, reviewMode } = this.data
    if (!content || isLoading || !node) return

    const updatedMessages = isAutoMessage ? messages : [...messages, {
      id: 'user_' + Date.now(),
      role: 'user',
      content,
      createdAt: Date.now(),
      blocks: parseMessageBlocks(content),
      timeStr: formatTime(Date.now()),
    }]

    this.setData({
      messages: updatedMessages,
      inputValue: isAutoMessage ? this.data.inputValue : '',
      isLoading: true,
      canSend: false,
    })
    if (!isAutoMessage) this.scrollToBottom()

    const sysContent = [
      '你是一位专业、耐心、善于引导的AI导师。',
      '',
      '# 回复格式',
      `当前课程：${theme?.name || ''}`,
      `当前课时：${node?.title || ''}`,
      `学习目标：${node?.learningObjective || ''}`,
      '',
      '# 用户信息',
      `- 职业：${this.data.userProfile?.occupation || '未知'}`,
      `- 兴趣：${(this.data.userProfile?.interests || []).join('、') || '未知'}`,
      `- 年龄：${AGE_OPTIONS[(this.data.userProfile?.age || 3) - 1] || '26-35岁'}`,
      '',
      '# 学习档案（跨课程上下文）',
      this.data.courseContext || '暂无历史学习记录。用户首次使用课程。',
      '',
      '# 格式说明',
      '你可以使用以下标签组织回复（段首标签自动延续到下一个标签，不需要写关闭）：',
      '- [概念]核心概念解释 → 用于定义和解释核心概念',
      '- [例子]具体例子说明 → 用于生活或工作中举例说明',
      '- [总结]内容总结 → 用于归纳要点或回顾',
      '- [评价]分析评价 → 用于点评用户的回答',
      '',
      '# 出题与评分',
      '- 选择题格式（管道分隔）：[题目 type="choice"]问题描述|选项A|选项B|选项C|选项D[/题目]',
      '- 选择题格式（换行前缀）：[题目 type="choice"]问题描述\nA. 选项A\nB. 选项B\nC. 选项C\nD. 选项D[/题目]',
      '- 两种格式均可，但**选项必须放在 [题目] 和 [/题目] 之间，不能放在外面**',
      '- 问答题格式：[题目 type="open"]问题描述[/题目]',
      '',
      '# 完成标记（回复末尾加 JSON 块）',
      '- 需要计分时：{"score":N}（N为0-10分）',
      '- 确认用户掌握本课时后：{"action":"complete","score":N}',
      '- 用户说"学会了/明白了/继续"时也输出 complete JSON',
      '- 完成时额外输出 summary 字段，一句话总结用户对本课时的掌握情况：{"action":"complete","score":N,"summary":"用户对X概念理解清晰，Y概念需要更多练习"}',
      '- summary 是跨课程上下文的核心数据，AI下次对话会参考，请认真撰写',
      '',
      '# 评分标准',
      '- 完全正确、深入理解 → 9-10分',
      '- 基本正确、理解到位 → 7-8分',
      '- 部分正确、部分偏差 → 5-6分',
      '- 理解不足、方向偏差 → 3-4分',
      '- 完全不对 → 1-2分',
      '',
      '# 出题方式',
      '- 每小节至少出1道题检验用户理解',
      '- 题目难度递增：先概念确认，再理解应用，最后综合分析',
      '- 选择题的选项数量保持4个',
      '- 问答题用于引导用户思考和表达',
      '',
      '# 教学流程',
      '1. 先用[概念]讲解本课时核心知识点',
      '2. 用[例子]列举相关例子辅助理解',
      '3. 出题检验（选择题或问答题）',
      '4. 根据用户的回答给出反馈和评分',
      '5. 必要时再用讲解加深巩固',
      '6. 确认用户理解后，在回复末尾加 JSON 完成标记',
      '',
      '注意：不要在回复中写"第X课"或"第X节"等序号，因为小程序会自动显示课时标题。',
    ].join('\n')

    const miniMaxMessages = [
      { role: 'system', content: sysContent },
      ...messages.slice(-20).map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content })),
      { role: 'user', content },
    ]

    wx.cloud.callFunction({
      name: 'sendMessage',
      data: {
        openid: app.globalData.openid,
        themeId: theme?._id || '',
        nodeId: node?._id || '',
        miniMaxMessages,
        userText: content,
        isAutoMessage: !!isAutoMessage,
      },
      success: res => {
        if (res.result && res.result.success && res.result.aiReply) {
          let aiReply = res.result.aiReply.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
          const isCompleted = !!res.result.isCompleted
          const score = res.result.score || null
          const aiMsg = {
            id: 'ai_' + Date.now(),
            role: 'ai',
            content: aiReply,
            blocks: parseMessageBlocks(aiReply),
            createdAt: Date.now(),
            timeStr: formatTime(Date.now()),
            score,
            completed: isCompleted,
          }
          this.setData({
            messages: [...this.data.messages, aiMsg],
            isCompleted,
            canSend: this.data.inputValue.trim().length > 0,
            isLoading: false,
          })
          this.scrollToBottom()
        } else {
          this.setData({ isLoading: false, canSend: true })
          wx.showToast({ title: 'AI 服务暂时不可用，请重试', icon: 'none' })
        }
      },
      fail: () => {
        this.setData({ isLoading: false, canSend: true })
        wx.showToast({ title: 'AI 服务暂时不可用，请重试', icon: 'none' })
      },
    })
  },

  onInputChange(e) {
    this.setData({
      inputValue: e.detail.value,
      canSend: e.detail.value.trim().length > 0 && !this.data.isLoading,
    })
  },

  onInputFocus() {},

  onInputBlur(e) {
    this.setData({ inputValue: e.detail.value })
  },

  doSend() {
    const content = (this.data.inputValue || '').trim()
    if (!content || this.data.isLoading || !this.data.node) return
    this.setData({ canSend: false })
    this.sendMessage(content)
  },

  onQuestionSelect(e) {
    const { option } = e.detail
    if (!option) return
    lightVibrate()
    this.sendMessage(`${option.label}. ${option.text}`)
  },

  onQuestionSubmit(e) {
    const { answer } = e.detail
    if (answer && answer.trim()) {
      this.sendMessage(answer.trim())
    }
  },

  manualAdvance() {
    const { theme, node } = this.data
    if (!theme || !node) return
    if (node.order >= theme.totalNodes) {
      wx.showToast({ title: '🎉 已学完全部课时！', icon: 'none' })
      return
    }
    const nextNodeId = `${theme._id}_node_${node.order + 1}`
    this.setData({ isCompleted: false })
    wx.showLoading({ title: '进入下一节' })

    wx.cloud.callFunction({
      name: 'completeNode',
      data: {
        openid: app.globalData.openid,
        themeId: theme._id,
        nodeId: node._id,
      },
      complete: () => {
        this.switchToNode(nextNodeId, () => {
          wx.hideLoading()
          const newNode = this.data.node
          if (newNode) {
            this.sendMessage(`请开始介绍"${newNode.title}"这个课时要学习的内容，用通俗易懂的语言`, true)
          }
        })
      },
    })
  },

  switchToNode(nodeId, callback) {
    const loadingMsg = {
      id: 'loading_' + Date.now(),
      role: 'ai',
      content: '⏳ AI 正在生成下一节内容...',
      blocks: [{ type: 'text', text: '⏳ AI 正在生成下一节内容…' }],
      createdAt: Date.now(),
      timeStr: formatTime(Date.now()),
    }
    this.setData({
      messages: [...this.data.messages, loadingMsg],
      isLoading: true,
    })
    this.scrollToBottom()
    this.loadHomeData({ nodeId, callback })
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
            first_node: { name: '初学乍道', description: '完成第一个课时', icon: '🌱' },
            node_10: { name: '十全十美', description: '完成 10 个课时', icon: '🏆' },
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
            title: '🎉 课时完成！',
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
          wx.showToast({ title: res.result.favorited ? '已收藏' : '已取消收藏', icon: 'success' })
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
          this.setData({
            messages: [...processMessages(res.result.messages), ...this.data.messages],
            hasMoreMessages: res.result.hasMoreMessages,
            messageOffset: newOffset,
          })
        }
      },
      fail: () => this.setData({ loadingMore: false }),
    })
  },

  onCloseAchievement() {
    this.setData({ showAchievementPopup: false, currentAchievement: null })
  },

  scrollToBottom() {
    this.setData({ scrollIntoView: '' })
    setTimeout(() => this.setData({ scrollIntoView: 'msg-bottom' }), 80)
  },

  onGoThemeStoreFromEmpty() {
    wx.navigateTo({ url: '/pages/theme-store/theme-store' })
  },

  onGardenTap() {
    wx.navigateTo({ url: '/pages/garden/garden' })
  },

  showCourseSwitcher() {
    const { theme, learningThemes } = this.data
    if (!theme) return
    if (learningThemes.length === 0) {
      wx.showLoading({ title: '' })
      wx.cloud.callFunction({
        name: 'getThemes',
        data: { openid: app.globalData.openid },
        success: (res) => {
          wx.hideLoading()
          const themes = (res.result?.themes || []).filter(t => t.status === 'learning')
          this.setData({ learningThemes: themes })
          this._pickTheme(themes)
        },
        fail: () => wx.hideLoading(),
      })
    } else {
      this._pickTheme(learningThemes)
    }
  },

  _pickTheme(themes) {
    const currentId = this.data.theme?._id
    const names = themes.map(t =>
      `${t._id === currentId ? '✓ ' : ''}${t.name || '未命名课程'}`
    )
    wx.showActionSheet({
      itemList: names,
      success: (r) => {
        const picked = themes[r.tapIndex]
        if (!picked || picked._id === currentId) return
        this.setData({ theme: null, node: null, messages: [], isCompleted: false, isPendingTransition: false })
        this.loadHomeData({ themeId: picked._id })
      },
    })
  },
})
