const { utils } = require('ethers')

module.exports = {
  stringEquals (...strArr) {
    let result = true

    const first = String(strArr.shift())

    for (const str of strArr) {
      result = result && (first.localeCompare(str, undefined, { sensitivity: 'base' }) === 0)

      if (!result) break
    }

    return result
  },

  lowerCaseObjectKeys (obj) {
    let newObj = {}
  
    Object.keys(obj).forEach(key => {
      newObj = {...newObj, [key.toLowerCase()]: obj[key]}
    })

    return newObj
  }
}
