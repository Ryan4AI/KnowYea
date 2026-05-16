module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  verbose: true,
  transform: {}, // 禁用 Babel，纯 Node.js 测试不需要
}
