// components/plant/plant.js
Component({
  properties: {
    level: {
      type: Number,
      value: 1,
    },
    points: {
      type: Number,
      value: 0,
    },
    themeId: {
      type: String,
      value: '',
    },
    size: {
      type: String,
      value: 'medium', // small, medium, large
    },
  },

  data: {
    emoji: '🌱',
    levelName: '种子',
    descriptions: {
      1: '刚刚种下，等待发芽',
      2: '小芽冒头，继续加油',
      3: '叶子展开，茁壮成长',
      4: '开花中，快要结果',
      5: '果实成熟，恭喜你！',
    },
  },

  observers: {
    level(newLevel) {
      this.updatePlantState(newLevel)
    },
  },

  lifetimes: {
    attached() {
      this.updatePlantState(this.data.level)
    },
  },

  methods: {
    updatePlantState(level) {
      const states = {
        1: { emoji: '🌱', levelName: '种子' },
        2: { emoji: '🌿', levelName: '幼苗' },
        3: { emoji: '🌾', levelName: '成长' },
        4: { emoji: '🌸', levelName: '开花' },
        5: { emoji: '🍎', levelName: '果实' },
      }
      const state = states[level] || states[1]
      this.setData({
        emoji: state.emoji,
        levelName: state.levelName,
      })
    },
  },
})