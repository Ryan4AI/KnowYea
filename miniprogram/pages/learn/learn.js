// pages/learn/learn.js
const app = getApp()

const AGE_OPTIONS = ['18岁以下', '18-25岁', '26-35岁', '36-45岁', '45岁以上']

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
    profileForm: {
      ageIndex: 2,
      occupation: '',
      interestsText: '',
    },
    ageOptions: AGE_OPTIONS,
    scrollIntoView: '',
  },

  onShow() {
    this.bootstrap()
  },

  async bootstrap() {
    await app.waitForLogin()
    this.setData({ openid: app.globalData.openid })

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

        if (currentNode && processedMessages.length === 0 && !isReviewMode) {
          this.sendFirstMessage()
        }

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

  sendFirstMessage() {
    const { node } = this.data
    if (!node) return

    const content = `[概念]欢迎来到"${node.title}"的学习！[/概念]\n\n今天我们将学习：${node.learningObjective}\n\n[总结]准备好了吗？我们可以开始了！[/总结]`
    const guideMessage = {
      id: 'ai_guide_' + Date.now(),
      role: 'ai',
      content,
      createdAt: Date.now(),
      blocks: parseMessageBlocks(content),
      timeStr: formatTime(Date.now()),
    }
    this.setData({ messages: [guideMessage] })
  },

  sendMessage(contentOverride) {
    const content = (typeof contentOverride === 'string' ? contentOverride : this.data.inputValue || '').trim()
    const { node, theme, isLoading, reviewMode } = this.data
    if (!content || isLoading || !node) return

    const userMsg = {
      id: 'user_' + Date.now(),
      role: 'user',
      content,
      createdAt: Date.now(),
      blocks: parseMessageBlocks(content),
      timeStr: formatTime(Date.now()),
    }

    this.setData({
      messages: [...this.data.messages, userMsg],
      inputValue: '',
      isLoading: true,
    })

    wx.cloud.callFunction({
      name: 'sendMessage',
      data: {
        openid: app.globalData.openid,
        themeId: theme._id,
        nodeId: node._id,
        content,
        reviewMode,
      },
      success: res => {
        this.setData({ isLoading: false })

        if (res.result && res.result.success) {
          const { message, isCompleted } = res.result
          lightVibrate()
          const aiMsg = {
            ...message,
            blocks: parseMessageBlocks(message.content),
            timeStr: formatTime(message.createdAt || Date.now()),
          }
          this.setData({
            messages: [...this.data.messages, aiMsg],
            isCompleted,
            showCompleteBtn: isCompleted && !reviewMode,
          })
          this.scrollToBottom()
        } else {
          wx.showToast({ title: res.result?.error || '发送失败', icon: 'none' })
        }
      },
      fail: err => {
        this.setData({ isLoading: false })
        console.error('发送消息失败', err)
        wx.showToast({ title: '网络错误', icon: 'none' })
      },
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

  onSubmitProfile() {
    const { profileForm } = this.data
    if (!profileForm.occupation.trim()) {
      wx.showToast({ title: '请填写职业', icon: 'none' })
      return
    }

    const profile = {
      age: profileForm.ageIndex + 1,
      occupation: profileForm.occupation.trim(),
      interests: profileForm.interestsText
        .split(/[,，、]/)
        .map(s => s.trim())
        .filter(Boolean),
    }

    wx.showLoading({ title: '正在为你定制主题...' })

    wx.cloud.callFunction({
      name: 'updateUserProfile',
      data: { openid: app.globalData.openid, profile },
      success: res => {
        if (!res.result || !res.result.success) {
          wx.hideLoading()
          wx.showToast({ title: res.result?.error || '保存失败', icon: 'none' })
          return
        }

        wx.cloud.callFunction({
          name: 'generateTheme',
          data: { openid: app.globalData.openid, profile },
          success: genRes => {
            wx.hideLoading()
            if (genRes.result && genRes.result.success) {
              this.setData({ showProfileSetup: false })
              wx.showToast({ title: '推荐主题已生成', icon: 'success' })
              this.loadHomeData()
            } else {
              wx.showToast({ title: genRes.result?.error || '生成失败', icon: 'none' })
            }
          },
          fail: () => {
            wx.hideLoading()
            wx.showToast({ title: '生成主题失败', icon: 'none' })
          },
        })
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({ title: '保存失败', icon: 'none' })
      },
    })
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
