// pages/profile/edit/edit.js — 个人画像编辑 / 新用户引导
const app = getApp()

const AGE_RANGES = ['18岁以下', '18-25岁', '26-35岁', '36-45岁', '46岁以上']

const OCCUPATIONS = [
  '学生', '教师/教育', '产品经理', '设计师', '前端工程师',
  '后端工程师', 'AI与算法工程师', '其他技术岗位', '市场/运营',
  '销售/商务', '管理/高管', '金融/投资', '医疗/健康',
  '法律/合规', '自由职业者', '创业者', '其他',
]

const ALL_TAGS = [
  '职场技能', '项目管理', '沟通表达', '领导力',
  '思维模型', '逻辑思考', '决策判断',
  'AI入门', '编程开发', '科技前沿',
  '投资理财', '商业分析', '创业知识',
  '心理学', '哲学思辨', '历史文化',
  '学习方法', '时间管理', '情绪管理',
]

const TAGS_BY_CAT = [
  { cat: '💼 职业成长', items: ['职场技能', '项目管理', '沟通表达', '领导力'] },
  { cat: '🧠 思维认知', items: ['思维模型', '逻辑思考', '决策判断'] },
  { cat: '🤖 科技AI', items: ['AI入门', '编程开发', '科技前沿'] },
  { cat: '💰 商业财经', items: ['投资理财', '商业分析', '创业知识'] },
  { cat: '📚 人文科学', items: ['心理学', '哲学思辨', '历史文化'] },
  { cat: '🌱 个人成长', items: ['学习方法', '时间管理', '情绪管理'] },
]

// 职业 → 推荐学习标签
const TAG_RECOMMEND = {
  '学生':           ['学习方法', '时间管理', '思维模型', '心理学'],
  '教师/教育':      ['心理学', '沟通表达', '学习方法', '逻辑思考'],
  '产品经理':       ['思维模型', '项目管理', '商业分析', '决策判断'],
  '设计师':         ['思维模型', '心理学', '沟通表达', '科技前沿'],
  '前端工程师':     ['编程开发', 'AI入门', '科技前沿', '学习方法'],
  '后端工程师':     ['AI入门', '编程开发', '科技前沿', '逻辑思考'],
  'AI与算法工程师': ['AI入门', '编程开发', '科技前沿', '决策判断'],
  '其他技术岗位':   ['科技前沿', '编程开发', 'AI入门', '逻辑思考'],
  '市场/运营':      ['沟通表达', '心理学', '商业分析', '思维模型'],
  '销售/商务':      ['沟通表达', '心理学', '决策判断', '情绪管理'],
  '管理/高管':      ['领导力', '决策判断', '商业分析', '思维模型'],
  '金融/投资':      ['投资理财', '商业分析', '逻辑思考', '决策判断'],
  '医疗/健康':      ['心理学', '情绪管理', '沟通表达', '学习方法'],
  '法律/合规':      ['逻辑思考', '沟通表达', '决策判断', '哲学思辨'],
  '自由职业者':     ['时间管理', '学习方法', '沟通表达', '投资理财'],
  '创业者':         ['创业知识', '商业分析', '领导力', '思维模型'],
  '其他':           ['学习方法', '思维模型', '时间管理', '沟通表达'],
}

Page({
  data: {
    ageRanges: AGE_RANGES,
    occupations: OCCUPATIONS,
    interestCategories: TAGS_BY_CAT,
    formData: { ageIndex: -1, occIndex: -1, selectedTags: [], customTags: [] },
    recommendedTagSet: {}, // { tagName: true }
    canSave: false,
    isSaving: false,
    isEditing: false,
    customInput: '',
  },

  onLoad(opts) {
    if (opts.edit === '1') {
      this.setData({ isEditing: true })
      this._loadExisting()
    }
  },

  _loadExisting() {
    wx.cloud.callFunction({
      name: 'getUserProfile',
      data: { openid: app.globalData.openid },
      success: res => {
        const prof = res.result?.user?.profile
        if (prof) {
          const interests = prof.interests || []
          // 区分预置标签和自定义标签
          const presetTags = interests.filter(t => ALL_TAGS.indexOf(t) >= 0)
          const customTags = interests.filter(t => ALL_TAGS.indexOf(t) < 0)
          const fd = {
            ageIndex: AGE_RANGES.indexOf(prof.ageRange),
            occIndex: OCCUPATIONS.indexOf(prof.occupation),
            selectedTags: presetTags,
            customTags,
          }
          this.setData({ formData: fd })
          this._updateRecommended(fd.occIndex)
          this._checkForm()
        }
      },
    })
  },

  // === 表单操作 ===

  onAgeChange(e) {
    this.setData({ 'formData.ageIndex': e.detail.value * 1 }, this._checkForm)
  },

  onOccChange(e) {
    const idx = e.detail.value * 1
    this.setData({ 'formData.occIndex': idx })
    this._updateRecommended(idx)
    this._checkForm()
  },

  _updateRecommended(occIndex) {
    if (occIndex < 0) {
      this.setData({ recommendedTagSet: {} })
      return
    }
    const occ = OCCUPATIONS[occIndex]
    const tags = TAG_RECOMMEND[occ] || []
    const set = {}
    tags.forEach(t => { set[t] = true })
    this.setData({ recommendedTagSet: set })
  },

  onToggleTag(e) {
    const tag = e.currentTarget.dataset.tag
    const { selectedTags } = this.data.formData
    const idx = selectedTags.indexOf(tag)
    const next = idx >= 0
      ? [...selectedTags.slice(0, idx), ...selectedTags.slice(idx + 1)]
      : [...selectedTags, tag]
    this.setData({ 'formData.selectedTags': next }, this._checkForm)
  },

  // === 自定义标签 ===

  onCustomInput(e) {
    this.setData({ customInput: e.detail.value })
  },

  onAddCustom() {
    const val = (this.data.customInput || '').trim()
    if (!val) return
    // 不超过 8 个字
    if (val.length > 8) {
      wx.showToast({ title: '标签最多8个字', icon: 'none' })
      return
    }
    // 不重复
    const all = [...this.data.formData.selectedTags, ...this.data.formData.customTags]
    if (all.indexOf(val) >= 0) {
      wx.showToast({ title: '该标签已存在', icon: 'none' })
      return
    }
    this.setData({
      customInput: '',
      'formData.customTags': [...this.data.formData.customTags, val],
    }, this._checkForm)
  },

  onRemoveCustom(e) {
    const tag = e.currentTarget.dataset.tag
    const c = this.data.formData.customTags
    const idx = c.indexOf(tag)
    if (idx < 0) return
    this.setData({
      'formData.customTags': [...c.slice(0, idx), ...c.slice(idx + 1)],
    }, this._checkForm)
  },

  // === 保存 ===

  _checkForm() {
    const { ageIndex, occIndex, selectedTags, customTags } = this.data.formData
    this.setData({
      canSave: ageIndex >= 0 && occIndex >= 0 && (selectedTags.length + customTags.length > 0),
    })
  },

  onSave() {
    const { ageIndex, occIndex, selectedTags, customTags } = this.data.formData
    if (ageIndex < 0 || occIndex < 0 || (selectedTags.length === 0 && customTags.length === 0)) return
    this.setData({ isSaving: true })

    const profile = {
      ageRange: AGE_RANGES[ageIndex],
      occupation: OCCUPATIONS[occIndex],
      interests: [...selectedTags, ...customTags],
    }

    wx.cloud.callFunction({
      name: 'updateUserProfile',
      data: { openid: app.globalData.openid, profile },
      success: res => {
        if (res.result?.success) {
          app.globalData.profileUpdated = Date.now()
          wx.navigateBack({ delta: 1 })
        } else {
          wx.showToast({ title: '保存失败', icon: 'none' })
          this.setData({ isSaving: false })
        }
      },
      fail: () => {
        wx.showToast({ title: '网络错误', icon: 'none' })
        this.setData({ isSaving: false })
      },
    })
  },
})
