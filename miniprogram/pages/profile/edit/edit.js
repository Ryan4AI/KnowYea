// pages/profile/edit/edit.js — 个人画像编辑 / 新用户引导
const app = getApp()

const AGE_RANGES = ['18岁以下', '18-25岁', '26-35岁', '36-45岁', '46岁以上']
const OCCUPATIONS = [
  '学生', '教师/教育', '产品经理', '设计师', '前端工程师',
  '后端工程师', 'AI与算法工程师', '其他技术岗位', '市场/运营',
  '销售/商务', '管理/高管', '金融/投资', '医疗/健康',
  '法律/合规', '自由职业者', '创业者', '其他',
]
const TAGS = [
  { cat: '💼 职业成长', items: ['职场技能', '项目管理', '沟通表达', '领导力'] },
  { cat: '🧠 思维认知', items: ['思维模型', '逻辑思考', '决策判断'] },
  { cat: '🤖 科技AI', items: ['AI入门', '编程开发', '科技前沿'] },
  { cat: '💰 商业财经', items: ['投资理财', '商业分析', '创业知识'] },
  { cat: '📚 人文科学', items: ['心理学', '哲学思辨', '历史文化'] },
  { cat: '🌱 个人成长', items: ['学习方法', '时间管理', '情绪管理'] },
]

Page({
  data: {
    ageRanges: AGE_RANGES,
    occupations: OCCUPATIONS,
    interestCategories: TAGS,
    formData: { ageIndex: -1, occIndex: -1, selectedTags: [] },
    canSave: false,
    isSaving: false,
    isEditing: false, // true = 编辑已有画像, false = 新用户引导
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
          this.setData({
            formData: {
              ageIndex: AGE_RANGES.indexOf(prof.ageRange),
              occIndex: OCCUPATIONS.indexOf(prof.occupation),
              selectedTags: prof.interests || [],
            },
          })
          this._checkForm()
        }
      },
    })
  },

  // === 表单 ===

  onAgeChange(e) {
    this.setData({ 'formData.ageIndex': e.detail.value * 1 }, this._checkForm)
  },

  onOccChange(e) {
    this.setData({ 'formData.occIndex': e.detail.value * 1 }, this._checkForm)
  },

  onToggleTag(e) {
    const { selectedTags } = this.data.formData
    const tag = e.currentTarget.dataset.tag
    const idx = selectedTags.indexOf(tag)
    const next = idx >= 0
      ? [...selectedTags.slice(0, idx), ...selectedTags.slice(idx + 1)]
      : [...selectedTags, tag]
    this.setData({ 'formData.selectedTags': next }, this._checkForm)
  },

  _checkForm() {
    this.setData({
      canSave: this.data.formData.ageIndex >= 0
        && this.data.formData.occIndex >= 0
        && this.data.formData.selectedTags.length > 0,
    })
  },

  onSave() {
    const { ageIndex, occIndex, selectedTags } = this.data.formData
    if (ageIndex < 0 || occIndex < 0 || selectedTags.length === 0) return
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
