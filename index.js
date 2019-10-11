#!/bin/sh 
":" //; exec /usr/bin/env node "$0" "$@"

const config = require('./lib/config')
const screen = require('./lib/screen')
const glob = require('glob')
const path = require('path')
const Loki = require('lokijs')
const lfsa = require('lokijs/src/loki-fs-structured-adapter')
const adapter = new lfsa()
const autosaveInterval = 1000
const loki = new Loki(
  path.join(__dirname, '.', 'storage', 'database', 'index.db'),
  {
    adapter,
    autoload: true,
    autoloadCallback: init,
    autosave: true,
    autosaveInterval
  }
)
const states = require('./lib/states')
const enabledCores = []
let server
let ready
let shuttingDown

function init () {
  if (!config) process.exit(1)

  server = require('./lib/server').server
  const sequence = []
  const files = glob.sync(path.join(__dirname, '.', 'core', '*', 'index.js'))

  require('./lib/db')(loki)
  screen.success('Initialized DB')
  screen.info('Loading asset cores...')

  for (const file of files) {
    const coreIdentifier = path.basename(path.dirname(file))
    const core = require(path.resolve(file))

    if (config.cores[coreIdentifier].enabled) {
      enabledCores.push(coreIdentifier)
      sequence.push(
        core.boot()
          .then(version => {
            if (version) {
              screen.success('[\u2714]', coreIdentifier, '->', version)
            } else {
              screen.error('[\u2757]', coreIdentifier, '->', version)
            }

            return version
          })
      )
    } else {
      screen.warn('[\u2718]', coreIdentifier)
    }
  }
  
  Promise.all(sequence)
    .then((results) => {
      if (results.some(r => !r)) {
        screen.error('Failed to boot some asset cores! Terminating...')
        process.exit(1)
      } else {
        screen.info('Done loading asset cores')
        server.listen(config.server.port, () => {
          screen.info('Bound HTTP server to port', config.server.port)

          for (const core of enabledCores) {
            states.running[core] = false
          }

          ready = true // allow graceful exit execution
          
          if (process.send) process.send('ready') // for PM2
        })
      }
    })
    .catch(err => {
      screen.error(err)
    })
}

function gracefulExit (signal) {
  if (shuttingDown) {
    return
  } else shuttingDown = true

  let retry = true

  // stall until `ready = true`
  setInterval(() => {
    if (retry && ready) {
      retry = false

      screen.warn('Exit sequence initiated by signal:', signal)

      server.close((err) => {
        screen.warn(
          `[1/2] ${err ? 'Ungracefully' : 'Gracefully'} killed HTTP server on port`,
          config.server.port
        )

        setTimeout(() => {
          for (const core of enabledCores) {
            states.shuttingDown[core] = true
          }

          setInterval(() => {
            if (
              !enabledCores
                .map(core => states.readyToShutdown[core])
                .includes(undefined)
            ) {
              screen.warn('[2/2] Shut down all asset cores')
              screen.warn('Exit.')
              process.exit(err ? 1 : 0)
            }
          }, 1000)
        }, 1000 + autosaveInterval)
      })
    }
  }, 1000)
}

process.on('SIGTERM', () => gracefulExit('SIGTERM'))
process.on('SIGINT', () => gracefulExit('SIGINT'))
process.on('message', (msg) => {
  if (msg === 'shutdown') gracefulExit('SIGINT')
})
