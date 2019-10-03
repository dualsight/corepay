let storage = null

module.exports = (dbObj) => {
  if (dbObj) {
    storage = dbObj
  }

  return storage
}
