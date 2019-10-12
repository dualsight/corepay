const config = require('./config')
const BigNumber = require('bignumber.js')

module.exports = {
  getAppInfoById: (appId) => {
    const slug = Object
      .keys(config.apps)
      .find(key => BigNumber(config.apps[key].id).isEqualTo(appId))
    const app = config.apps[slug]
    return {
      id: parseInt(app.id),
      slug
    }
  }
}
