// stores/conversation.ts - 对话状态
import { makeAutoObservable } from 'mobx-miniprogram'

export const conversationStore = makeAutoObservable({
  messages: [],           // 当前对话消息列表
  isLoading: false,        // AI正在回复
  hasMore: false,          // 是否有更多历史消息
  offset: 0,               // 历史消息偏移

  addMessage(msg) {
    this.messages.push({
      id: Date.now().toString(),
      role: msg.role || 'user',
      content: msg.content,
      createdAt: Date.now(),
    })
  },

  setMessages(messages) {
    this.messages = messages
  },

  prependMessages(messages) {
    this.messages = [...messages, ...this.messages]
  },

  setLoading(loading) {
    this.isLoading = loading
  },

  setHasMore(hasMore) {
    this.hasMore = hasMore
  },

  clearConversation() {
    this.messages = []
    this.offset = 0
    this.hasMore = false
  },
})