const fs = require('fs')
const screen = require('./lib/screen')
const configInit = require('./lib/config/init')

if (fs.existsSync('config.json')) {
  screen.error('Failed to bootstrap corepay: Configuration file: config.json already exists!')
} else {
  fs.writeFileSync('config.json', JSON.stringify(configInit.generate(), null, 2), { encoding: 'UTF-8' })
  screen.success('Configuration file generated: config.json')
  screen.info('Please inspect the file to obtain auto-generated passphrases and mnemonics.')
}
