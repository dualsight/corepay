const pm2 = require('pm2')
const path = require('path')
const screen = require('./screen')
let processTag

try {
  const { id } = require('../config.json')
  processTag = `corepay-${id}`
} catch (error) {
  processTag = null
}

module.exports = {
  status () {
    return new Promise((resolve, reject) => {
      if (!processTag) {
        return reject(new Error('Please configure Corepay first!'))
      }

      pm2.connect(function(err) {
        if (err) {
          screen.error(err)
          return reject(new Error('Could not connect to process manager!'))
        }

        pm2.describe(processTag, (err, processes) => {
          if (err) {
            return reject(new Error('Failed to read daemon status!'))
          }

          for (const proc of processes) {
            if (
              proc.pm2_env.pm_exec_path === path.join(__dirname, '..', 'index.js') &&
              proc.pm2_env.status === 'online'
            ) {
              return resolve('Daemon is running.')
            }
          }

          return resolve('Daemon is not running.')
        })
      })
    })
  },

  start () {
    return new Promise((resolve, reject) => {
      if (!processTag) {
        return reject(new Error('Please configure Corepay first!'))
      }

      pm2.connect(function(err) {
        if (err) {
          screen.error(err)
          return reject(new Error('Could not connect to process manager!'))
        }

        pm2.describe(processTag, (err, processes) => {
          if (err) {
            return reject(new Error('Failed to read daemon status!'))
          }

          for (const proc of processes) {
            if (
              proc.pm2_env.pm_exec_path === path.join(__dirname, '..', 'index.js') &&
              proc.pm2_env.status === 'online'
            ) {
              return reject(new Error('Daemon is already running!'))
            }
          }
          
          pm2.start(
            path.join(__dirname, '..', 'ecosystem.config.js'),
            (err, processes) => {
              pm2.disconnect()

              if (err) {
                screen.error(err)
                reject(new Error('Daemon could not be started!'))
              }

              resolve('Started daemon successfully!')
            }
          )
        })
      })
    })
  },

  reload () {
    return new Promise((resolve, reject) => {
      if (!processTag) {
        return reject(new Error('Please configure Corepay first!'))
      }

      pm2.connect(function(err) {
        if (err) {
          screen.error(err)
          return reject(new Error('Could not connect to process manager!'))
        }

        pm2.describe(processTag, (err, processes) => {
          if (err) {
            return reject(new Error('Failed to read daemon status!'))
          }

          for (const proc of processes) {
            if (
              proc.pm2_env.pm_exec_path === path.join(__dirname, '..', 'index.js') &&
              proc.pm2_env.status === 'online'
            ) {
              return pm2.reload(processTag, (err, proc) => {
                if (err) {
                  screen.error(err)
                  reject(new Error('Daemon could not be reloaded!'))
                }
        
                resolve('Reloaded daemon successfully!')
              })
            }
          }

          reject(new Error('Daemon is not running!'))
        })
      })
    })
  },

  restart () {
    return new Promise((resolve, reject) => {
      if (!processTag) {
        return reject(new Error('Please configure Corepay first!'))
      }

      pm2.connect(function(err) {
        if (err) {
          screen.error(err)
          return reject(new Error('Could not connect to process manager!'))
        }

        pm2.describe(processTag, (err, processes) => {
          if (err) {
            return reject(new Error('Failed to read daemon status!'))
          }

          for (const proc of processes) {
            if (
              proc.pm2_env.pm_exec_path === path.join(__dirname, '..', 'index.js') &&
              proc.pm2_env.status === 'online'
            ) {
              return pm2.restart(processTag, (err, proc) => {
                if (err) {
                  screen.error(err)
                  reject(new Error('Daemon could not be restarted!'))
                }
        
                resolve('Restarted daemon successfully!')
              })
            }
          }

          reject(new Error('Daemon is not running!'))
        })
      })
    })
  },

  stop () {
    return new Promise((resolve, reject) => {
      if (!processTag) {
        return reject(new Error('Please configure Corepay first!'))
      }

      pm2.connect(function(err) {
        if (err) {
          screen.error(err)
          return reject(new Error('Could not connect to process manager!'))
        }

        pm2.describe(processTag, (err, processes) => {
          if (err) {
            return reject(new Error('Failed to read daemon status!'))
          }

          for (const proc of processes) {
            if (
              proc.pm2_env.pm_exec_path === path.join(__dirname, '..', 'index.js') &&
              proc.pm2_env.status === 'online'
            ) {
              return pm2.delete(processTag, (err, proc) => {
                if (err) {
                  screen.error(err)
                  reject(new Error('Daemon could not be stopped!'))
                }

                resolve('Daemon successfully stopped!')
              })
            }
          }

          reject(new Error('Daemon is not running!'))
        })
      })
    })
  }
}