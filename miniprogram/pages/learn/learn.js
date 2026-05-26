// pages/learn/learn.js — 纯学习页
const app = getApp()

const AGE_OPTIONS = ['18岁以下', '18-25岁', '26-35岁', '36-45岁', '46岁以上']

const { formatTime, parseMessageBlocks } = require('../../utils/helpers')

function mdToHtml(text) {
  if (!text) return ''
  return '<p style="margin:6px 0;line-height:1.6;font-size:14px;">' + text.replace(/\n/g, '<br/>') + '</p>'
}

function processMessages(messages) {
  return (messages || []).map(msg => {
    let content = (msg.content || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim()
    // 兜底清理：去掉 AI 回复末尾的 {"action":"complete",...} 元数据
    content = content.replace(/\s*\{[\s\S]*?"action"[\s\S]*?\}\s*/g, '').trim()
    const blocks = parseMessageBlocks(content)
    blocks.forEach(b => {
      b._msgId = msg._id || msg.id
      if (b.type === 'choice' && b.content) {
        const lines = b.content.split('\n').map(l => l.trim()).filter(l => l)
        b.question = lines[0]
        b.options = lines.slice(1)
        b.html = mdToHtml(b.question)
      }
      if (b.type === 'open' && b.content) {
        b.question = b.content
        b.html = mdToHtml(b.question)
      }
    })
    return { ...msg, blocks, timeStr: formatTime(msg.createdAt || Date.now()), completed: msg.completed || msg.isCompleted || false }
  })
}

function lightVibrate() {
  try { wx.vibrateShort({ type: 'light' }) } catch (e) {}
}

Page({
  data: {
    openid: '', course: null, lesson: null,
    messages: [], isLoading: false, loadingMore: false,
    inputValue: '', canSend: false,
    plantLevel: 1, isCompleted: false, isLearning: false,
    isPendingTransition: false, showCompleteBtn: false, reviewMode: false,
    showThemeSwitcher: false, learningCourses: [],
    hasMoreMessages: false, messageOffset: 0,
    showAchievementPopup: false, currentAchievement: null,
    userProfile: {}, showThemeInfo: false, hasNextLesson: false,
    scrollIntoView: '', navBarTop: 0, courseContext: '', showSplash: true,
  },

  onLoad(options) {
    if (options && options.courseId) {
      this._courseIdFromUrl = options.courseId
    }
    // 计算状态栏高度（避开刘海屏/灵动岛）
    try {
      const sysInfo = wx.getSystemInfoSync()
      this.setData({ navBarTop: sysInfo.statusBarHeight || 20 })
    } catch (e) {
      this.setData({ navBarTop: 20 })
    }
  },

  onShow() {
    // 在 openid 延迟检查前先存好 learnContext（避免递归消费丢失）
    const savedLearnCtx = app.consumeLearnContext()
    this._savedCourseId = savedLearnCtx?.courseId || ''
    this._savedLessonId = savedLearnCtx?.lessonId || ''

    if (!app.globalData.openid) {
      setTimeout(() => this.onShow(), 500)
      return
    }
    this.setData({ openid: app.globalData.openid, showSplash: false })
    this.loadPageData({
      courseId: this._courseIdFromUrl || this._savedCourseId,
      lessonId: this._savedLessonId,
      mode: this._savedLessonId ? 'review' : '',
    })
    delete this._courseIdFromUrl
    delete this._savedCourseId
    delete this._savedLessonId
  },

  loadPageData(context = {}) {
    if (!app.globalData.openid) return
    wx.showLoading({ title: '加载中...' })
    const openid = app.globalData.openid

    let userData, coursesData
    Promise.all([
      new Promise(resolve => {
        wx.cloud.callFunction({
          name: 'getUser', data: { openid },
          success: r => { userData = r.result?.data; resolve() },
          fail: () => resolve(),
        })
      }),
      new Promise(resolve => {
        wx.cloud.callFunction({
          name: 'getCourses', data: { openid },
          success: r => { coursesData = r.result?.data || []; resolve() },
          fail: () => resolve(),
        })
      }),
    ]).then(() => {
      wx.hideLoading()

      const user = userData?.user
      const profile = user?.profile || {}
      // 没画像 → 跳画像收集
      if (!profile.occupation && (!user?.interests || user.interests.length === 0)) {
        wx.redirectTo({ url: '/pages/profile/profile?forceForm=1' })
        return
      }

      const courses = coursesData || []
      const activeCourses = courses.filter(c => c.status === 'learning')

      // 如果指定了 courseId，直接在返回列表中找目标课程
      if (context.courseId) {
        const target = courses.find(c => c._id === context.courseId)
        if (target) {
          this._initCourse(target, context, user)
          return
        }
      }

      // 没在学课程 → 跳课程商店
      if (activeCourses.length === 0) {
        wx.redirectTo({ url: '/pages/theme-store/theme-store' })
        return
      }

      activeCourses.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      const currentCourse = activeCourses[0]
      this._initCourse(currentCourse, context, user)
    })
  },

  _initCourse(currentCourse, context, user) {
    const userData = user || {}
    const lessons = currentCourse.lessons || []
    let currentLesson
    if (context.lessonId) {
      currentLesson = lessons.find(l => l._id === context.lessonId)
    }
    if (!currentLesson) {
      currentLesson = lessons.find(l => !l.completedAt) || lessons[lessons.length - 1]
    }

    const lessonsList = currentCourse.lessons || []
    const lessonIdx = lessonsList.findIndex(l => l._id === currentLesson._id)
    const nextLesson = lessonIdx < lessonsList.length - 1

    this.setData({
      course: currentCourse,
      lesson: currentLesson,
      hasNextLesson: nextLesson,
      userProfile: {
        age: user?.age,
        ageIndex: AGE_OPTIONS.indexOf(user?.age),
        occupation: user?.occupation || '',
        interests: user?.interests || [],
      },
      courseContext: currentCourse.lessonSummary
        ? `课程学习进度摘要：${currentCourse.lessonSummary}`
        : '暂无历史学习记录。用户首次使用课程。',
      plantLevel: user?.plantLevel || 1,
      plantPoints: user?.points || 0,
      isLearning: !!currentLesson,
      isLoading: !!currentLesson,
      reviewMode: context.mode === 'review',
    })

    if (currentLesson) {
      this.loadMessages(currentCourse._id, currentLesson._id)
    }
    if (typeof context.callback === 'function') context.callback()

    // 不再在这里发 auto-message，改为 loadMessages 完成后判断
    // 新课时无消息 → 加载完成后自动触发 AI 开场白
  },

  loadMessages(courseId, lessonId, append = false) {
    const offset = append ? (this.data.messageOffset + 30) : 0
    this.setData({ loadingMore: append })
    wx.cloud.callFunction({
      name: 'getMessages',
      data: { openid: app.globalData.openid, courseId, lessonId, limit: 30, offset },
      success: res => {
        this.setData({ loadingMore: false })
        if (!res.result?.success) return
        const msgs = processMessages(res.result.data || [])
        if (append) {
          this.setData({ messages: [...msgs, ...this.data.messages], hasMoreMessages: res.result.hasMore, messageOffset: offset })
        } else {
          // 有历史消息 → 清除 loading，直接展示
          if (msgs.length > 0) {
            this.setData({ messages: msgs, hasMoreMessages: res.result.hasMore, messageOffset: 0, isLoading: false })
            this.scrollToBottom()
          } else {
            this.setData({ messages: msgs, hasMoreMessages: res.result.hasMore, messageOffset: 0 })
          }
          // 新课时无消息 → 自动发送 AI 开场白（只在首次加载时）
          if (msgs.length === 0 && this.data.lesson) {
            const lesson = this.data.lesson
            this.sendMessage(`请开始介绍"${lesson.title}"这个课时要学习的内容，用通俗易懂的语言`, true)
          }
        }
      },
      fail: () => this.setData({ loadingMore: false, isLoading: false }),
    })
  },

  loadLearningCourses() {
    wx.cloud.callFunction({
      name: 'getCourses', data: { openid: app.globalData.openid },
      success: res => {
        if (res.result?.success) {
          this.setData({ learningCourses: (res.result.data || []).filter(c => c.status === 'learning') })
        }
      },
      fail: () => console.warn('loadLearningCourses 云函数调用失败'),
    })
  },

  sendMessage(contentOverride, isAutoMessage) {
    const content = (typeof contentOverride === 'string' ? contentOverride : this.data.inputValue || '').trim()
    const { lesson, course, messages, isLoading, reviewMode } = this.data
    if (!content || (!isAutoMessage && isLoading) || !lesson) return

    const updatedMessages = isAutoMessage ? messages : [...messages, {
      id: 'user_' + Date.now(), role: 'user', content,
      createdAt: Date.now(), blocks: parseMessageBlocks(content),
      timeStr: formatTime(Date.now()),
    }]

    this.setData({
      messages: updatedMessages,
      inputValue: isAutoMessage ? this.data.inputValue : '',
      isLoading: true, canSend: false,
    })
    if (!isAutoMessage) this.scrollToBottom()

    const sysContent = [
      '你是一位专业、耐心、善于引导的AI导师。',
      '',
      '# 回复格式',
      `当前课程：${course?.name || ''}`,
      `当前课时：${lesson?.title || ''}`,
      `学习目标：${lesson?.objective || ''}`,
      '',
      '# 用户信息',
      `- 职业：${this.data.userProfile?.occupation || '未知'}`,
      `- 兴趣：${(this.data.userProfile?.interests || []).join('、') || '未知'}`,
      `- 年龄：${this.data.userProfile?.age || '26-35岁'}`,
      '',
      '# 学习档案',
      this.data.courseContext || '暂无历史学习记录。用户首次使用课程。',
      '',
      '# 格式说明（每次回复必须遵守）',
      '回复需包含讲解+出题：先用 [概念] [例子] [总结] 标记讲解，再出一道题检验。',
      '',
      '# 出题格式（每道题必须使用此格式）',
      '选择题：',
      '[题目 type="choice"]',
      '问题描述',
      'A. 选项A',
      'B. 选项B',
      'C. 选项C',
      'D. 选项D',
      '[/题目]',
      '问答题：',
      '[题目 type="open"]问题描述[/题目]',
      '',
      '# 课时完成标记',
      '当用户已理解内容（答对题/表达理解/多轮有意义的对话后）：',
      '1. 在回复末尾追加 {"action":"complete","score":N,"summary":"..."}',
      '2. 不要在文字中问"是否继续下一课时"等引导问题',
      '',
      '# 评分标准',
      '9-10分:完全正确 7-8分:基本正确 5-6分:部分正确 3-4分:理解不足 1-2分:完全不对',
      '',
      '# 教学流程',
      '概念讲解→例子辅助→出题检验→反馈评分→确认掌握',
      '注意：不要在回复中写"第X课"等序号，不要自创或开始下一课时。',
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
        courseId: course?._id || '', lessonId: lesson?._id || '',
        miniMaxMessages, userText: content, isAutoMessage: !!isAutoMessage,
      },
      success: res => {
        if (res.result?.success && res.result.aiReply) {
          let aiReply = res.result.aiReply.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
          const isCompleted = !!res.result.isCompleted
          const score = res.result.score || null
          const aiMsg = {
            id: 'ai_' + Date.now(), role: 'ai', content: aiReply,
            blocks: parseMessageBlocks(aiReply), createdAt: Date.now(),
            timeStr: formatTime(Date.now()), score, completed: isCompleted,
          }
          this.setData({
            messages: [...this.data.messages, aiMsg], isCompleted,
            canSend: this.data.inputValue.trim().length > 0, isLoading: false,
          })
          this.scrollToBottom()
        } else {
          this.setData({ isLoading: false, canSend: true })
          wx.showToast({ title: 'AI 服务暂时不可用', icon: 'none' })
        }
      },
      fail: () => {
        this.setData({ isLoading: false, canSend: true })
        wx.showToast({ title: 'AI 服务暂时不可用', icon: 'none' })
      },
    })
  },

  onInputChange(e) {
    this.setData({ inputValue: e.detail.value })
  },
  onInputBlur(e) { this.setData({ inputValue: e.detail.value }) },

  doSend() {
    const content = (this.data.inputValue || '').trim()
    if (!content || this.data.isLoading || !this.data.lesson) return
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
    if (answer && answer.trim()) this.sendMessage(answer.trim())
  },

  manualAdvance() {
    const { course, lesson, messages } = this.data
    if (!course || !lesson) return
    const lessons = course.lessons || []
    const currentIdx = lessons.findIndex(l => l._id === lesson._id)
    if (currentIdx >= lessons.length - 1) {
      wx.showToast({ title: '🎉 已学完全部课时！', icon: 'none' })
      return
    }
    const nextLesson = lessons[currentIdx + 1]
    this.setData({ isCompleted: false })
    wx.showLoading({ title: '进入下一节' })
    wx.cloud.callFunction({
      name: 'completeLesson',
      data: { openid: app.globalData.openid, courseId: course._id, lessonId: lesson._id, messages },
      success: () => {
        this.switchToLesson(nextLesson._id)
        wx.hideLoading()
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({ title: '进度同步失败，可继续学习', icon: 'none' })
        this.switchToLesson(nextLesson._id)
      },
    })
  },

  switchToLesson(lessonId, callback) {
    this.setData({
      messages: [...this.data.messages, {
        id: 'loading_' + Date.now(), role: 'ai',
        content: '⏳ AI 正在生成下一节内容...',
        blocks: [{ type: 'text', text: '⏳ AI 正在生成下一节内容…' }],
        createdAt: Date.now(), timeStr: formatTime(Date.now()),
      }],
      isLoading: true,
    })
    this.scrollToBottom()
    this.loadPageData({ lessonId, callback })
  },

  completeLesson() {
    const { course, lesson, messages, reviewMode } = this.data
    if (!course || !lesson) return
    if (reviewMode) { wx.showToast({ title: '复习模式不更新进度', icon: 'none' }); return }

    wx.showLoading({ title: '处理中...' })
    wx.cloud.callFunction({
      name: 'completeLesson',
      data: { openid: app.globalData.openid, courseId: course._id, lessonId: lesson._id, messages },
      success: res => {
        wx.hideLoading()
        const result = res.result
        if (result?.success) {
          const data = result.data || {}
          const { pointsEarned = 10, isCourseComplete } = data
          const achievements = data.achievements || []
          const ACH_NAMES = {
            first_lesson: { name: '初学乍道', desc: '完成第一个课时', icon: '🌱' },
            five_lessons: { name: '三心二意', desc: '完成 5 个课时', icon: '🎯' },
            ten_lessons: { name: '十全十美', desc: '完成 10 个课时', icon: '🏆' },
            streak_3: { name: '持之以恒', desc: '连续学习 3 天', icon: '🔥' },
            streak_7: { name: '连胜达人', desc: '连续学习 7 天', icon: '⚡' },
            first_course: { name: '有始有终', desc: '完成第一个课程', icon: '🎓' },
          }
          lightVibrate()
          wx.showModal({
            title: '🎉 课时完成！',
            content: `获得 ${pointsEarned} 积分${achievements.length ? '，解锁了新成就！' : ''}`,
            showCancel: false,
            success: () => {
              if (achievements.length > 0) {
                const ach = achievements[0]
                const meta = ACH_NAMES[ach.type] || { name: ach.type, desc: '', icon: '🏅' }
                this.setData({
                  showAchievementPopup: true,
                  currentAchievement: { id: ach.type, name: meta.name, description: meta.desc, icon: meta.icon },
                })
              }
              if (isCourseComplete) wx.showToast({ title: '🎊 课程完成！', icon: 'none' })
              this.loadPageData()
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

  onSwitchCourse() {
    lightVibrate()
    this.loadLearningCourses()
    this.setData({ showThemeSwitcher: true })
  },
  onCloseThemeSwitcher() { this.setData({ showThemeSwitcher: false }) },
  onCourseChange(e) {
    const { courseId } = e.detail
    wx.showLoading({ title: '切换中...' })
    this.setData({ showThemeSwitcher: false })
    wx.hideLoading()
    this.loadPageData({ courseId })
  },

  onLoadMoreMessages() {
    if (!this.data.hasMoreMessages || this.data.loadingMore) return
    const { course, lesson } = this.data
    if (!course || !lesson) return
    this.loadMessages(course._id, lesson._id, true)
  },
  onCloseAchievement() { this.setData({ showAchievementPopup: false, currentAchievement: null }) },

  scrollToBottom() {
    this.setData({ scrollIntoView: '' })
    setTimeout(() => this.setData({ scrollIntoView: 'msg-bottom' }), 80)
  },
  onGoThemeStoreFromEmpty() { wx.navigateTo({ url: '/pages/theme-store/theme-store' }) },
  onGardenTap() { wx.navigateTo({ url: '/pages/garden/garden' }) },

  showCourseSwitcher() {
    const { course, learningCourses } = this.data
    if (!course) return
    if (learningCourses.length === 0) {
      wx.showLoading({ title: '' })
      wx.cloud.callFunction({
        name: 'getCourses', data: { openid: app.globalData.openid },
        success: (res) => {
          wx.hideLoading()
          const courses = (res.result?.data || []).filter(c => c.status === 'learning')
          this.setData({ learningCourses: courses })
          this._pickCourse(courses)
        },
        fail: () => wx.hideLoading(),
      })
    } else {
      this._pickCourse(learningCourses)
    }
  },

  _pickCourse(courses) {
    const currentId = this.data.course?._id
    const names = courses.map(t => `${t._id === currentId ? '✓ ' : ''}${t.name || '未命名课程'}`)
    wx.showActionSheet({
      itemList: names,
      success: (r) => {
        const picked = courses[r.tapIndex]
        if (!picked || picked._id === currentId) return
        this.setData({ course: null, lesson: null, messages: [], isCompleted: false, isPendingTransition: false })
        this.loadPageData({ courseId: picked._id, skipAutoMessage: true })
      },
    })
  },

  onOptionTap(e) {
    const value = e.currentTarget.dataset.value
    if (!value) return
    this.setData({ inputValue: value, canSend: true })
    this.doSend()
  },
  onFinishCourse() {
    this.setData({ isCompleted: false })
    wx.showModal({
      title: '🎉 课程完成',
      content: '你已完成该课程的全部课时。可以去知识花园查看总结，或生成新课程继续学习。',
      confirmText: '去花园',
      success: res => { if (res.confirm) wx.navigateTo({ url: '/pages/garden/garden' }) }
    })
  },
})
