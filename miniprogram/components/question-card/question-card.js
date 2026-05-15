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
    questionText: '',
    selectedIndex: -1,
    isOpenAnswer: false,
    openAnswer: '',
  },

  observers: {
    question() {
      this.parseQuestion()
    },
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

      this.setData({ isOpenAnswer: type === 'open', selectedIndex: -1, openAnswer: '' })

      if (type === 'choice') {
        const parts = content.split('|').map(s => s.trim()).filter(Boolean)
        const questionText = parts[0] || ''
        const options = parts.slice(1).map((text, i) => ({
          label: String.fromCharCode(65 + i),
          text,
        }))
        this.setData({ questionText, options })
      } else {
        this.setData({ questionText: content, options: [] })
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
