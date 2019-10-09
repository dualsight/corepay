const path = require('path')
const fs = require('fs')
const screen = require('./lib/screen')
const configInit = require('./lib/config/init')
const configPath = path.join(__dirname, 'config.json')

if (fs.existsSync(configPath)) {
  screen.error('Failed to bootstrap corepay: Configuration file: config.json already exists!')
} else {
  fs.writeFileSync(configPath, JSON.stringify(configInit.generate(), null, 2), { encoding: 'UTF-8' })
  screen.success(`Configuration file generated: ${configPath}`)
  screen.info('Please inspect the file to obtain/backup auto-generated passphrases and mnemonics.')
}
