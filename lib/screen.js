const util = require('util')
const chalk = require('chalk')
const log = msg => {
  console.log(chalk.black.bgWhite(`[${new Date().toISOString()}]`), msg)
}

module.exports = {
  success (...msg) { log(chalk.greenBright(util.format(...msg))) },
  info (...msg) { log(chalk.blueBright(util.format(...msg))) },
  warn (...msg) { log(chalk.yellowBright(util.format(...msg))) },
  error (...msg) { log(chalk.redBright(util.format(...msg))) }
}
