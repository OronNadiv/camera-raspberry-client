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

config.serverUrl = process.env.SERVER_URL || (config.production ? null : 'http://localhost:3007')
if (!config.serverUrl) {
  error('Server URL could not be found in the environment variable.  Please set \'SERVER_URL\'.')
  process.exit(1)
}

config.delayBetweenPhotos = parseInt(process.env.DELAY_BETWEEN_PHOTOS || 5000, 10)

config.verticalFlip = process.env.VERTICAL_FLIP_IMAGE === 'true'
config.horizontalFlip = process.env.HORIZONTAL_FLIP_IMAGE === 'true'

module.exports = config
