const info = require('debug')('ha:exit:info')
const error = require('debug')('ha:exit:error')

const touch = require('touch')
const Promise = require('bluebird')
const moment = require('moment')

module.exports = (errorCode) => {
  return Promise
    .try(() => {
      info('touching')
    })
    .then(() => {
      return touch.sync(`/var/tmp/__ha-camera-${moment().format()}.exit`)
    })
    .then(() => {
      info('touched')
    })
    .catch((err) => {
      error('touch failed.', 'err:', err)
    })
    .finally(() => {
      error('Exiting process')
      process.exit(errorCode)
    })
}
