/**
 * 工具函数测试
 * 测试纯函数逻辑，无需模拟微信环境
 */

const { formatTime, parseMessageBlocks } = require('../miniprogram/utils/helpers')

// ============================================
// 测试用例
// ============================================

describe('formatTime', () => {
  test('应该正确格式化时间戳', () => {
    // 2026-05-17 14:30:00 UTC+8
    const ts = new Date('2026-05-17T06:30:00Z').getTime()
    expect(formatTime(ts)).toBe('14:30')
  })

  test('应该处理零点', () => {
    const ts = new Date('2026-05-17T16:00:00Z').getTime()
    expect(formatTime(ts)).toBe('00:00')
  })
})

describe('parseMessageBlocks', () => {
  test('空输入应该返回空文本块', () => {
    const blocks = parseMessageBlocks('')
    expect(blocks).toHaveLength(1)
    expect(blocks[0].type).toBe('text')
  })

  test('应该解析概念标签', () => {
    const blocks = parseMessageBlocks('[概念]核心概念内容[/概念]')
    expect(blocks).toHaveLength(1)
    expect(blocks[0].type).toBe('概念')
    expect(blocks[0].text).toBe('核心概念内容')
  })

  test('应该解析例子标签', () => {
    const blocks = parseMessageBlocks('[例子]这是一个例子[/例子]')
    expect(blocks).toHaveLength(1)
    expect(blocks[0].type).toBe('例子')
  })

  test('应该解析总结标签', () => {
    const blocks = parseMessageBlocks('[总结]总结内容[/总结]')
    expect(blocks).toHaveLength(1)
    expect(blocks[0].type).toBe('总结')
  })

  test('应该解析选择题', () => {
    const input = '[题目 type="choice"]\n以下哪个是苹果？\nA. 香蕉\nB. 苹果\nC. 橙子\n[/题目]'
    const blocks = parseMessageBlocks(input)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].type).toBe('choice')
    expect(blocks[0].content).toBe('以下哪个是苹果？')
    expect(blocks[0].options).toEqual(['香蕉', '苹果', '橙子'])
  })

  test('应该解析问答题', () => {
    const input = '[题目 type="open"]\n请解释相对论[/题目]'
    const blocks = parseMessageBlocks(input)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].type).toBe('open')
    expect(blocks[0].content).toBe('请解释相对论')
  })

  test('应该解析评分', () => {
    const blocks = parseMessageBlocks('[评分] 85')
    expect(blocks).toHaveLength(1)
    expect(blocks[0].type).toBe('评分')
    expect(blocks[0].score).toBe(85)
  })

  test('应该解析不带引号的选择题', () => {
    const input = '[题目 type=choice]\n以下哪个选项正确反映了光的传播方式？\nA. 直线传播\nB. 曲线传播\nC. 螺旋传播\nD. 随机传播\n[/题目]'
    const blocks = parseMessageBlocks(input)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].type).toBe('choice')
    expect(blocks[0].content).toBe('以下哪个选项正确反映了光的传播方式？')
    expect(blocks[0].options).toContain('直线传播')
  })

  test('应该解析带单引号的选择题', () => {
    const input = "[题目 type='choice']\n以下哪个是水果？\nA. 苹果\nB. 桌子\nC. 石头\nD. 水\n[/题目]"
    const blocks = parseMessageBlocks(input)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].type).toBe('choice')
    expect(blocks[0].content).toBe('以下哪个是水果？')
    expect(blocks[0].options).toContain('苹果')
  })

  test('应该混合解析多种标签', () => {
    const input = '前面的话[概念]概念内容[/概念]中间的话[例子]例子内容[/例子]结束'
    const blocks = parseMessageBlocks(input)
    expect(blocks.length).toBeGreaterThanOrEqual(4)
    expect(blocks[0].type).toBe('text')
    expect(blocks[1].type).toBe('概念')
    expect(blocks[2].type).toBe('text')
    expect(blocks[3].type).toBe('例子')
  })
})
