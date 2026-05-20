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
  // 表格 — 先做 HTML 转换（保留原始 | 格式），再清理残留管道
  html = html.replace(/((?:\|[^\n]+\|\n?)+)/g, (tableBlock) => {
    const rows = tableBlock.trim().split('\n').filter(r => r.trim())
    if (rows.length < 2) return tableBlock
    const dataRows = rows.filter((r, i) => i !== 1 || !/^[\s|:-]+$/.test(r))
    const headerRow = dataRows[0]
    const headers = headerRow.slice(1, -1).split('|').map(h => h.trim()).filter(h => h)
    let htmlTable = '<table style="width:100%;border-collapse:collapse;font-size:26rpx;margin:8px 0;">'
    htmlTable += '<thead><tr>' + headers.map(h => `<th style="background:#f0f2f5;padding:8px 12px;text-align:left;font-weight:500;border-bottom:2rpx solid #e8e8e8;">${h}</th>`).join('') + '</tr></thead>'
    htmlTable += '<tbody>'
    for (let i = 1; i < dataRows.length; i++) {
      const rowData = dataRows[i].slice(1, -1).split('|').map(c => c.trim())
      htmlTable += '<tr>' + rowData.map((c, ci) => `<td style="padding:8px 12px;border-bottom:1rpx solid #e0e0e0;${ci === 0 ? 'font-weight:500;' : ''}">${c}</td>`).join('') + '</tr>'
    }
    htmlTable += '</tbody></table>'
    return htmlTable
  })
  // 清理残留的管道线（非表格的行内 | 标记）
  html = html.replace(/^\|(.+)\|$/gm, (m, inner) => inner.trim())
  html = html.replace(/^[-| :]+$/gm, '')
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
  // 概念/例子/总结/评价：段首标记，自动延续到下一个标签或结尾
  // 题目：成对标签，必须 [/题目] 闭合
  // 评分：单行标记
  const pattern = /\[(概念|例子|总结|评价)\]([\s\S]*?)(?=\[|$)|\[题目\s+type\s*=\s*["']?(choice|open)["']?\]([\s\S]*?)\[\/题目\]|\[评分\]\s*(\d+)/g
  let lastIndex = 0
  let match

  while ((match = pattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const plain = content.slice(lastIndex, match.index).replace(/\[完成\]/g, '').replace(/\[\/(概念|例子|总结|评价)\]/g, '').trim()
      if (plain) splitTextWithTables(blocks, plain)
    }
    if (match[1]) {
      blocks.push({ type: match[1], text: match[2].trim(), html: mdToHtml(match[2].trim()) })
    } else if (match[3]) {
      const qContent = match[4].trim()
      if (match[3] === 'choice') {
        // 解析选择题选项：支持 A. A) A、A A- 及数字 1. 1)
        const lines = qContent.split('\n')
        const optionRe = /^[A-Za-z1-4][.、\)\-\s]\s*/m
        const questionText = lines.filter(l => !optionRe.test(l) && !/^-\s/m.test(l)).join('\n').trim()
        const options = lines.filter(l => optionRe.test(l) || /^-\s/m.test(l)).map(l => l.replace(optionRe, '').replace(/^-\s*/, '').trim()).filter(o => o.length > 1)
        if (options.length > 0) {
          blocks.push({
            type: 'choice',
            content: questionText,
            html: mdToHtml(questionText),
            options: options.filter(o => o),
          })
        } else {
          // 声明了 choice 但无有效选项 → 按问答题处理
          blocks.push({
            type: 'open',
            content: qContent,
            html: mdToHtml(qContent),
          })
        }
      } else {
        blocks.push({
          type: 'open',
          content: qContent,
          html: mdToHtml(qContent),
        })
      }
    } else if (match[5]) {
      blocks.push({ type: '评分', score: parseInt(match[5]), text: '' })
    }
    lastIndex = pattern.lastIndex
  }

  const rest = content.slice(lastIndex).replace(/\[完成\]/g, '').replace(/\[\/(概念|例子|总结|评价)\]/g, '').trim()
  if (rest) splitTextWithTables(blocks, rest)
  if (blocks.length === 0) {
    splitTextWithTables(blocks, content.replace(/\[完成\]/g, '').trim())
  }
  return blocks
}

/**
 * 将文本按 markdown 表格拆分成 text + table 交替块
 */
function splitTextWithTables(blocks, text) {
  // 匹配连续表格行（至少2行，以 | 开头）
  const tableRegex = /((?:\|[^\n]+\|\n?)+)/g
  let lastIdx = 0, m
  while ((m = tableRegex.exec(text)) !== null) {
    const rows = m[1].trim().split('\n').filter(r => r.trim().startsWith('|') && r.trim().endsWith('|'))
    if (rows.length >= 2) {
      // 前面的纯文本
      if (m.index > lastIdx) {
        const txt = text.slice(lastIdx, m.index).trim()
        if (txt) blocks.push({ type: 'text', text: txt, html: mdToHtml(txt) })
      }
      // 解析表格数据
      const tableData = parseMarkdownTable(rows)
      blocks.push({ type: 'table', text: m[1].trim(), html: mdToHtml(m[1].trim()), headers: tableData.headers, rows: tableData.rows })
      lastIdx = m.index + m[0].length
    }
  }
  // 剩余文本
  if (lastIdx < text.length) {
    const txt = text.slice(lastIdx).trim()
    if (txt) blocks.push({ type: 'text', text: txt, html: mdToHtml(txt) })
  }
}

/**
 * 解析 markdown 表格行数组为 headers + rows
 */
function parseMarkdownTable(rows) {
  // 跳过分隔行（只含 | 和 -）
  const dataRows = rows.filter((r, i) => i !== 1 || !/^[\s|:-]+$/.test(r.trim()))
  if (dataRows.length < 1) return { headers: [], rows: [] }
  const headers = dataRows[0].slice(1, -1).split('|').map(h => h.trim())
  const rowsData = []
  for (let i = 1; i < dataRows.length; i++) {
    const cells = dataRows[i].slice(1, -1).split('|').map(c => c.trim())
    rowsData.push(cells)
  }
  return { headers, rows: rowsData }
}

module.exports = { formatTime, parseMessageBlocks }
