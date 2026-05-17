// miniprogram/utils/helpers.js

/**
 * 简易 markdown → HTML 转换（供 rich-text 组件使用）
 */
function mdToHtml(text) {
  if (!text) return ''
  // 标题 (##)
  let html = text.replace(/^(#{1,4})\s+(.+)$/gm, (m, hashes, content) => {
    const level = hashes.length
    return `<h${level} style="font-size:${18 - level}px;font-weight:600;margin:10px 0 6px;color:#333;">${content}</h${level}>`
  })
  // 代码块 (```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre style="background:#f5f5f7;padding:12px;border-radius:8px;overflow-x:auto;font-size:13px;"><code>$2</code></pre>')
  // 行内代码
  html = html.replace(/`([^`]+)`/g, '<code style="background:#f0f0f2;padding:2px 6px;border-radius:4px;font-size:13px;color:#e74c3c;">$1</code>')
  // 粗体
  html = html.replace(/\*\*([^*]+)\*\*/g, '<b style="font-weight:600;">$1</b>')
  // 无序列表 - 先标记
  html = html.split('\n').map(line => {
    if (/^- /.test(line)) return '__LI__' + line.slice(2)
    return line
  }).join('\n')
  // 相邻的列表项包裹在 <ul> 中
  html = html.replace(/((?:__LI__[^\n]*\n?)+)/g, '<ul>$1</ul>').replace(/__LI__/g, '<li>')
  // 段落换行
  html = html.replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br/>')
  // 清理标签间的 <br/>
  html = html.replace(/<\/li><br\/>/g, '</li>').replace(/<br\/><li>/g, '<li>').replace(/<\/ul><br\/>/g, '</ul>').replace(/<br\/><ul>/g, '<ul>')
  // 用 <p> 包裹纯文本段落
  if (!html.startsWith('<')) {
    html = '<p style="margin:6px 0;line-height:1.6;">' + html + '</p>'
  }
  return html
}

/**
 * 格式化时间戳为 HH:mm
 * @param {number} timestamp - 毫秒级时间戳
 * @returns {string}
 */
function formatTime(timestamp) {
  const date = new Date(timestamp)
  const h = date.getHours().toString().padStart(2, '0')
  const m = date.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

/**
 * 解析消息内容中的标签块（概念、例子、总结、评价、题目、评分）
 * @param {string} content
 * @returns {Array<{type: string, text?: string, html?: string, content?: string, score?: number}>}
 */
function parseMessageBlocks(content) {
  if (!content) return [{ type: 'text', text: '' }]

  const blocks = []
  // 匹配标签块
  const pattern = /\[(概念|例子|总结|评价)\]([\s\S]*?)\[\/\1\]|\[题目\s+type\s*=\s*["']?(choice|open)["']?\]([\s\S]*?)\[\/题目\]|\[评分\]\s*(\d+)/g
  let lastIndex = 0
  let match

  while ((match = pattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const plain = content.slice(lastIndex, match.index).replace(/\[完成\]/g, '').trim()
      if (plain) blocks.push({ type: 'text', text: plain, html: mdToHtml(plain) })
    }
    if (match[1]) {
      blocks.push({ type: match[1], text: match[2].trim(), html: mdToHtml(match[2].trim()) })
    } else if (match[3]) {
      blocks.push({
        type: match[3],
        content: match[4].trim(),
      })
    } else if (match[5]) {
      blocks.push({ type: '评分', score: parseInt(match[5]), text: '' })
    }
    lastIndex = pattern.lastIndex
  }

  const rest = content.slice(lastIndex).replace(/\[完成\]/g, '').trim()
  if (rest) blocks.push({ type: 'text', text: rest, html: mdToHtml(rest) })
  if (blocks.length === 0) {
    blocks.push({ type: 'text', text: content.replace(/\[完成\]/g, '').trim(), html: mdToHtml(content.replace(/\[完成\]/g, '').trim()) })
  }
  return blocks
}

module.exports = { formatTime, parseMessageBlocks }
