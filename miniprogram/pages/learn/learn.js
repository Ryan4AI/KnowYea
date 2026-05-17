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

const { formatTime, parseMessageBlocks } = require('../../utils/helpers')

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
    showProfileSetup: false,
    showCustomInterestInput: false,
    userProfile: {},
    showGenLoading: false,
    genStageText: '',
    genProgress: 0,
    showThemeInfo: false,
    hasNextNode: false,
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
    navBarTop: 0,
  },

  onShow() {
    console.log('[learn onShow] called')
    this.bootstrap()
  },

  async bootstrap() {
    // 自定义导航栏：计算状态栏高度
    try {
      const sys = wx.getSystemInfoSync()
      this.setData({ navBarTop: sys.statusBarHeight })
    } catch(e) {
      this.setData({ navBarTop: 44 })
    }

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
          nodeCompleted,
          garden,
          needsOnboarding,
          isReviewMode,
          isFavorited,
          hasMoreMessages,
          messageOffset,
          user,
        } = res.result

        // 保存用户画像，用于学习提示词
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
          showProfileSetup: !!needsOnboarding,
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

        // 执行回调（如自动进入下一节后发送消息）
        if (typeof context.callback === 'function') {
          context.callback()
        }

        // 如果没有历史消息但有当前节点，自动发送开场白
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
          const learningThemes = (res.result.themes || []).filter(
            t => t.status === 'learning'
          )
          this.setData({ learningThemes })
        }
      },
    })
  },

  sendMessage(contentOverride, isAutoMessage) {
    const content = (typeof contentOverride === 'string' ? contentOverride : this.data.inputValue || '').trim()
    const { node, theme, messages, isLoading, reviewMode } = this.data
    if (!content || isLoading || !node) return

    // 用户消息才加气泡，自动消息（进入下一节）不发气泡
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

    // 构建 MiniMax 对话 - 完整提示词 + markdown + 评分 + 历史记录20条
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
      `- 年龄：${['18岁以下','18-25岁','26-35岁','36-45岁','45岁以上'][(this.data.userProfile?.age || 3)-1] || '26-35岁'}`,
      '',
      '# 格式说明',
      '你可以使用以下标签组织回复：',
      '- [概念]核心概念[/概念] → 用于定义和解释核心概念',
      '- [例子]具体例子[/例子] → 用于生活或工作中举例说明',
      '- [总结]内容总结[/总结] → 用于归纳要点或回顾',
      '- [评价]分析评价[/评价] → 用于点评用户的回答',
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
        isAutoMessage: !!isAutoMessage,
      },
      success: res => {
        if (res.result && res.result.success && res.result.aiReply) {
          // 剥离 `<think>...</think>` 推理内容
          let aiReply = res.result.aiReply.replace(/<think>[\s\S]*?<\/think>/g, '').trim()

          // 使用云函数返回的结构化字段
          const isCompleted = !!res.result.isCompleted
          const score = res.result.score || null

          const aiMsg = {
            id: 'ai_' + Date.now(),
            role: 'ai',
            content: aiReply,
            blocks: parseMessageBlocks(aiReply),
            createdAt: Date.now(),
            timeStr: formatTime(Date.now()),
            score: score,
          }
          this.setData({
            messages: [...this.data.messages, aiMsg],
            isCompleted,
            // 完成时显示「下一节」按钮，让用户自己决定何时进入
            isPendingTransition: isCompleted,
            canSend: false,
            isLoading: false,
          })
          this.scrollToBottom()
        } else {
          this.setData({ isLoading: false, canSend: true })
          wx.showToast({ title: 'AI 服务暂时不可用，请重试', icon: 'none' })
        }
      },
      fail: err => {
        this.setData({ isLoading: false, canSend: true })
        wx.showToast({ title: 'AI 服务暂时不可用，请重试', icon: 'none' })
      }
    })
  },

  onInputChange(e) {
    this.setData({ inputValue: e.detail.value, canSend: e.detail.value.trim().length > 0 && !this.data.isLoading })
  },

  onInputFocus() {
  },

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
    const answer = `${option.label}. ${option.text}`
    this.sendMessage(answer)
  },

  onQuestionSubmit(e) {
    const { answer } = e.detail
    if (answer && answer.trim()) {
      this.sendMessage(answer.trim())
    }
  },

  // 手动进入下一节
  manualAdvance() {
    const { theme, node } = this.data
    if (!theme || !node || !theme.nodes) return
    const nodeIndex = theme.nodes.findIndex(n => n._id === node._id)
    if (nodeIndex < 0 || nodeIndex >= theme.nodes.length - 1) return

    const nextNode = theme.nodes[nodeIndex + 1]
    if (!nextNode) {
      wx.showToast({ title: '🎉 已学完全部课时！', icon: 'none' })
      return
    }
    this.setData({ isCompleted: false, isPendingTransition: false })
    wx.showLoading({ title: '进入下一节' })
    this.switchToNode(nextNode._id, () => {
      wx.hideLoading()
      this.sendMessage(`请开始介绍"${nextNode.title}"这个课时要学习的内容，用通俗易懂的语言`, true)
    })
  },

  switchToNode(nodeId, callback) {
    // 先插入一个加载提示消息
    const loadingMsg = {
      id: 'loading_' + Date.now(),
      role: 'ai',
      content: '⏳ 正在加载下一节...',
      blocks: [{ type: 'text', text: '⏳ 正在加载下一节...' }],
      createdAt: Date.now(),
      timeStr: formatTime(Date.now()),
    }
    this.setData({
      messages: [...this.data.messages, loadingMsg],
      isLoading: true,
    })
    this.scrollToBottom()

    // 加载新节点数据，完成后执行回调
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

  // 开始课程生成进度动画
  startGenLoading() {
    const stages = [
      { text: '🎯 分析你的兴趣特点…', progress: 15 },
      { text: '📚 设计课程结构大纲…', progress: 35 },
      { text: '🧠 构建知识体系网络…', progress: 55 },
      { text: '✍️ 生成练习与互动…', progress: 75 },
      { text: '✨ 即将完成…', progress: 90 },
    ]
    let index = 0
    this.setData({ showGenLoading: true, genStageText: stages[0].text, genProgress: stages[0].progress })
    const interval = setInterval(() => {
      index++
      if (index < stages.length) {
        this.setData({ genStageText: stages[index].text, genProgress: stages[index].progress })
      }
    }, 5000)
    return interval
  },

  // 停止课程生成进度动画
  stopGenLoading(interval) {
    clearInterval(interval)
    this.setData({ showGenLoading: false, genStageText: '', genProgress: 100 })
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

    const genInterval = this.startGenLoading()

    wx.cloud.callFunction({
      name: 'generateTheme',
      data: { openid: app.globalData.openid, profile },
      success: genRes => {
        this.stopGenLoading(genInterval)
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
        this.stopGenLoading(genInterval)
        wx.showToast({ title: '网络错误，请重试', icon: 'none' })
      }
    })
  },

  onConfirmTheme() {
    const { pendingTheme } = this.data
    if (!pendingTheme) return
    this.setData({ pendingTheme: null })
    // 显示加载中的消息
    const loadingMsg = {
      id: 'loading_' + Date.now(),
      role: 'ai',
      content: '⏳ AI 正在准备课程内容...',
      blocks: [{ type: 'text', text: '⏳ AI 正在准备课程内容...' }],
      createdAt: Date.now(),
      timeStr: formatTime(Date.now()),
    }
    this.setData({ messages: [loadingMsg] })
    wx.showLoading({ title: '加载课程...', mask: true })
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
            hasNextNode: (res.result.currentNode?.order || 0) < (res.result.currentTheme?.totalNodes || 0),
          }, () => {
            // setData 完成后才发消息，确保 node 已经更新
            this.sendMessage('请开始介绍这个课时要学习的内容，用通俗易懂的语言', true)
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

请生成一个适合该用户的全新学习主题，不要和之前推荐的重叠。课时数量由AI根据内容复杂度自行决定，不设上限。

严格以 JSON 格式输出（不要用 markdown 代码块）：
{"name":"主题名称","description":"主题描述","tags":["标签"],"nodes":[{"title":"课时标题","learningObjective":"学习目标","completionSignal":"完成标准"}]}`

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

  onGardenTap() {
    wx.navigateTo({ url: '/pages/garden/garden' })
  },

  showCourseSwitcher() {
    const { theme, learningThemes } = this.data
    if (!theme) return

    // 如果还没加载课程列表或列表为空，先加载
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
        this.setData({
          theme: null,
          node: null,
          messages: [],
          isCompleted: false,
          isPendingTransition: false,
        })
        this.loadHomeData({ themeId: picked._id })
      },
    })
  },
})
