// components/question-card/question-card.js
Component({
  properties: {
    question: {
      type: Object,
      value: {},
    },
  },

  data: {
    options: [],
    selectedIndex: -1,
    isOpenAnswer: false,
    openAnswer: '',
  },

  lifetimes: {
    attached() {
      this.parseQuestion()
    },
  },

  methods: {
    parseQuestion() {
      const content = this.properties.question.content || ''
      const type = this.properties.question.type || 'choice'

      this.setData({ isOpenAnswer: type === 'open' })

      if (type === 'choice') {
        const parts = content.split('|')
        this.setData({ options: parts.map((opt, i) => ({ label: String.fromCharCode(65 + i), text: opt.trim() })) })
      }
    },

    selectOption(e) {
      if (this.data.selectedIndex !== -1) return
      const index = e.currentTarget.dataset.index
      this.setData({ selectedIndex: index })
      this.triggerEvent('select', { index, option: this.data.options[index] })
    },

    bindOpenInput(e) {
      this.setData({ openAnswer: e.detail.value })
    },

    submitOpenAnswer() {
      if (!this.data.openAnswer.trim()) return
      this.triggerEvent('submit', { answer: this.data.openAnswer })
    },
  },
})