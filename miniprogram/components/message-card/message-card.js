// components/message-card/message-card.js
Component({
  properties: {
    message: {
      type: Object,
      value: {},
    },
  },

  data: {
    parsedContent: null,
  },

  lifetimes: {
    attached() {
      this.parseContent()
    },
  },

  methods: {
    parseContent() {
      const content = this.data.message.content || ''
      const role = this.data.message.role

      if (role === 'user') {
        this.setData({ parsedContent: [{ type: 'text', text: content }] })
        return
      }

      // AI消息：解析结构化标签
      const parts = []
      let remaining = content

      // 解析[概念]
      const conceptRegex = /\[概念\]([\s\S]*?)\[\/概念\]/
      let match
      while ((match = remaining.match(conceptRegex))) {
        if (match.index > 0) {
          parts.push({ type: 'text', text: remaining.substring(0, match.index) })
        }
        parts.push({ type: 'concept', text: match[1] })
        remaining = remaining.substring(match.index + match[0].length)
      }
      if (remaining) {
        parts.push({ type: 'text', text: remaining })
      }

      this.setData({ parsedContent: parts.length > 0 ? parts : [{ type: 'text', text: content }] })
    },
  },
})