
const { lowerCaseObjectKeys } = require('../utils')
let config

try {
  config = require(`../../config.json`)
  config.cores.ethereum.tokens = lowerCaseObjectKeys(config.cores.ethereum.tokens)
} catch (error) {
  console.error(`Failed to parse config!`)
}

module.exports = config
