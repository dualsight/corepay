const fs = require('fs')
const path = require('path')

module.exports = {
  get (symbol, standard) {
    const abiPath = path.join(__dirname, 'ABIs', standard, `${symbol}.json`)

    if (fs.existsSync(abiPath)) {
      return require(abiPath)
    } else {
      return require(`./ABIs/${standard}/default.json`)
    }
  }
}
