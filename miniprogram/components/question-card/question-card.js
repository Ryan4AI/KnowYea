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
        // 先尝试 pipe 分隔格式：问题|选项A|选项B
        let parts = content.split('|').map(s => s.trim()).filter(Boolean)
        let options = parts.slice(1).map((text, i) => ({
          label: String.fromCharCode(65 + i),
          text,
        }))

        // 如果 pipe 方式没拿到选项，尝试从换行解析字母前缀选项
        if (options.length === 0) {
          const lines = content.split('\n').map(s => s.trim()).filter(Boolean)
          if (lines.length >= 2) {
            // 检查是否有像 "A. " 或 "A、 " 的选项前缀
            const optionLines = lines.filter(l => /^[A-D][.、）)]?\s/.test(l))
            if (optionLines.length >= 2) {
              options = optionLines.map((text, i) => ({
                label: String.fromCharCode(65 + i),
                text: text.replace(/^[A-D][.、）)]?\s*/, ''),
              }))
              const nonOptionLines = lines.filter(l => !/^[A-D][.、）)]?\s/.test(l))
              parts = nonOptionLines.length > 0 ? nonOptionLines : lines
            }
          }
        }

        const questionText = parts[0] || content.substring(0, 60)
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
