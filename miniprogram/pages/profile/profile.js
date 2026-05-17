// pages/profile/profile.js
const app = getApp()

const AGE_RANGES = ['18岁以下', '18-25岁', '26-35岁', '36-45岁', '46岁以上']
const OCCUPATIONS = [
  '学生', '教师/教育', '产品经理', '设计师', '前端工程师',
  '后端工程师', 'AI与算法工程师', '其他技术岗位', '市场/运营',
  '销售/商务', '管理/高管', '金融/投资', '医疗/健康',
  '法律/合规', '自由职业者', '创业者', '其他',
]
const INTEREST_CATEGORIES = [
  { name: '💼 职业成长', tags: ['职场技能', '项目管理', '沟通表达', '领导力'] },
  { name: '🧠 思维认知', tags: ['思维模型', '逻辑思考', '决策判断'] },
  { name: '🤖 科技AI', tags: ['AI入门', '编程开发', '科技前沿'] },
  { name: '💰 商业财经', tags: ['投资理财', '商业分析', '创业知识'] },
  { name: '📚 人文科学', tags: ['心理学', '哲学思辨', '历史文化'] },
  { name: '🌱 个人成长', tags: ['学习方法', '时间管理', '情绪管理'] },
]

Page({
  data: {
    user: null,
    userProfile: null,
    stats: {
      completedNodes: 0,
      completedThemes: 0,
      totalPoints: 0,
      streak: 0,
    },
    achievements: [],
    recentThemes: [],
    profileSlogan: '',

    // 表单数据
    ageRanges: AGE_RANGES,
    occupations: OCCUPATIONS,
    interestCategories: INTEREST_CATEGORIES,
    formData: {
      ageIndex: -1,
      occIndex: -1,
      selectedTags: [],
    },
    canSave: false,
    isSaving: false,
    needToRefresh: false,
  },

  onLoad() {
    this.loadProfile()
  },

  onShow() {
    if (this.data.needToRefresh) {
      this.loadProfile()
      this.setData({ needToRefresh: false })
    }
  },

  loadProfile() {
    if (!app.globalData.openid) return

    wx.cloud.callFunction({
      name: 'getUserProfile',
      data: { openid: app.globalData.openid },
      success: res => {
        if (res.result && res.result.success) {
          const profile = res.result.user?.profile
          const stats = res.result.stats || { completedNodes: 0, completedThemes: 0, totalPoints: 0, streak: 0 }
          const interests = profile?.interests || []
          const slogan = profile ? `${profile.occupation || ''}${interests.length > 0 ? ' · ' + interests.join('、') : ''}` : ''
          this.setData({
            user: res.result.user,
            userProfile: profile || null,
            stats,
            achievements: res.result.achievements || [],
            profileSlogan: slogan,
          })
        }
      },
      fail: err => {
        console.error('加载个人中心失败', err)
      }
    })
  },

  // === 表单操作 ===

  onAgeChange(e) {
    const ageIndex = e.detail.value
    this.setData({ 'formData.ageIndex': ageIndex }, this._checkForm)
  },

  onOccChange(e) {
    const occIndex = e.detail.value
    this.setData({ 'formData.occIndex': occIndex }, this._checkForm)
  },

  onTagToggle(e) {
    const tag = e.currentTarget.dataset.tag
    const { selectedTags } = this.data.formData
    const idx = selectedTags.indexOf(tag)
    let newTags
    if (idx >= 0) {
      newTags = [...selectedTags]
      newTags.splice(idx, 1)
    } else {
      newTags = [...selectedTags, tag]
    }
    this.setData({ 'formData.selectedTags': newTags }, this._checkForm)
  },

  _checkForm() {
    const { ageIndex, occIndex, selectedTags } = this.data.formData
    this.setData({
      canSave: ageIndex >= 0 && occIndex >= 0 && selectedTags.length > 0
    })
  },

  onSaveProfile() {
    const { ageIndex, occIndex, selectedTags } = this.data.formData
    if (ageIndex < 0 || occIndex < 0 || selectedTags.length === 0) {
      wx.showToast({ title: '请完整填写画像', icon: 'none' })
      return
    }

    this.setData({ isSaving: true })

    const profile = {
      ageRange: AGE_RANGES[ageIndex],
      occupation: OCCUPATIONS[occIndex],
      interests: selectedTags,
    }

    wx.cloud.callFunction({
      name: 'updateUserProfile',
      data: { openid: app.globalData.openid, profile },
      success: res => {
        if (res.result?.success) {
          wx.showToast({ title: '画像保存成功', icon: 'success' })
          const interests = profile.interests || []
          const slogan = `${profile.occupation || ''}${interests.length > 0 ? ' · ' + interests.join('、') : ''}`
          this.setData({
            userProfile: profile,
            profileSlogan: slogan,
            isSaving: false,
          })
          // 通知其他页面画像已更新
          app.globalData.profileUpdated = Date.now()
        } else {
          wx.showToast({ title: '保存失败', icon: 'none' })
          this.setData({ isSaving: false })
        }
      },
      fail: err => {
        wx.showToast({ title: '网络错误', icon: 'none' })
        this.setData({ isSaving: false })
      }
    })
  },

  // 编辑已有画像
  onGoEditProfile() {
    const { userProfile } = this.data
    if (!userProfile) return
    const ageIndex = AGE_RANGES.indexOf(userProfile.ageRange)
    const occIndex = OCCUPATIONS.indexOf(userProfile.occupation)
    this.setData({
      formData: {
        ageIndex: ageIndex >= 0 ? ageIndex : -1,
        occIndex: occIndex >= 0 ? occIndex : -1,
        selectedTags: userProfile.interests || [],
      },
      canSave: true,
      userProfile: null,
    })
  },

  // 跳转到各子页面
  onNavigateTo(e) {
    const page = e.currentTarget.dataset.page
    const routes = {
      history: '/pages/history/history',
      favorites: '/pages/favorites/favorites',
      achievements: '/pages/achievements/achievements',
      garden: '/pages/garden/garden',
      settings: '/pages/settings/settings',
    }
    if (routes[page]) {
      wx.navigateTo({ url: routes[page] })
    }
  },
})
