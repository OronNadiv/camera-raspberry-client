const error = require('debug')('ha:config:error')

const fs = require('fs')
const path = require('path')

const config = {production: process.env.NODE_ENV && process.env.NODE_ENV.toUpperCase() === 'PRODUCTION'}

config.loginUrl = process.env.LOGIN_URL || (config.production ? null : 'http://localhost:3001')
if (!config.loginUrl) {
  error('Login URL could not be found in the environment variable.  Please set \'LOGIN_URL\'.')
  process.exit(1)
}

config.pins = {
  clientUp: parseInt(process.env.PINS_CLIENT_UP || -1, 10),
  connectedToServer: parseInt(process.env.PINS_CONNECTED_TO_SERVER || -1, 10),
  takingPictures: parseInt(process.env.PINS_TAKING_PICTURES || -1, 10)
}

config.privateKey = process.env.PRIVATE_KEY || (config.production ? null : fs.readFileSync(path.join(__dirname, '../test/private_key.pem')))
if (!config.privateKey) {
  error('Private key could not be found in the environment variable.  Please set \'PRIVATE_KEY\'.')
  process.exit(1)
}

config.pushUrl = process.env.PUSH_URL || (config.production ? null : 'http://localhost:3005')
if (!config.pushUrl) {
  error('Push URL could not be found in the environment variable.  Please set \'PUSH_URL\'.')
  process.exit(1)
}

config.storageUrl = process.env.STORAGE_URL || (config.production ? null : 'http://localhost:3006')
if (!config.storageUrl) {
  error('Storage URL could not be found in the environment variable.  Please set \'STORAGE_URL\'.')
  process.exit(1)
}

config.delayBetweenPhotos = parseInt(process.env.DELAY_BETWEEN_PHOTOS || 5000, 10)

module.exports = config
