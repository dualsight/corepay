const debugnyan = require('debugnyan')
const screen = require('./screen')

module.exports = (namespace) => {
  if (process.env.PRINT_LOGS) return screen
  return debugnyan(namespace)
}
