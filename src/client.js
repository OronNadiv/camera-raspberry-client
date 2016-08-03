const path = require('path')
const LOG_PREFIX = `"${path.basename(__filename)}":`
const log = require('./logger')
const info = log.info.bind(log, LOG_PREFIX)
const error = log.error.bind(log, LOG_PREFIX)

const config = require('./config')
const diehard = require('diehard')
const LED = require('./led')
const moment = require('moment')
const Photographer = require('./photographer')
const Promise = require('bluebird')
const SocketIO = require('./socket-io')
const Uploader = require('./uploader')

class Client {
  constructor () {
    this.ledClientUp = new LED('PIN_CLIENT_UP', config.pins.clientUp)
    this.ledConnectedToServer = new LED('PIN_CONNECTED_TO_SERVER', config.pins.connectedToServer)
    this.ledTakingPictures = new LED('PIN_CONNECTED_TO_SERVER', config.pins.takingPictures)
    this.socketIO = new SocketIO(this.ledConnectedToServer)
  }

  run () {
    const self = this

    return Promise
      .resolve(self.ledClientUp.initialize())
      .then(() => self.ledClientUp.turnOn())
      .then(() => self.ledConnectedToServer.initialize())
      .then(() => self.ledConnectedToServer.turnOff())
      .then(() => self.ledTakingPictures.initialize())
      .then(() => self.ledTakingPictures.turnOff())
      .then(() => {
        setInterval(() => {
          Uploader.uploadAll()
            .catch(err => error('#8', err))
        }, 1000 * 60 * 60) // 1 hour

        Uploader.uploadAll() // async.  No point holding the client until everything is uploaded.
          .catch(err => error('#9', err))
      })
      .then(() => {
        const options = {
          subject: '/files',
          audience: 'urn:home-automation/storage',
          rooms: ['sirens', 'alarm-sensors', 'cameras'],
          events: [
            {
              name: 'TAKE_PHOTO',
              callback: data => {
                info('TAKE_PHOTO called.  data:', data)
                const photographer = new Photographer(data.count, moment().add(moment.duration(data.duration)))
                photographer.takePhotos()
                  .catch(err => error('at TAKE_PHOTO->photographer.takePhotos():', err))
              }
            },
            {
              name: 'TOGGLE_CREATED',
              callback: data => {
                info('TOGGLE_CREATED called.  data:', data)
                if (data.is_armed) {
                  return
                }
                info('Stopping camera.')
                Photographer.stop()
                  .catch(err => error('at Photographer.stop():', err))
              }
            },
            {
              name: 'MOTION_CREATED',
              callback: data => {
                info('MOTION_CREATED called.  data:', data)

                const photographer = new Photographer(0, moment().add(1, 'hours'))
                photographer.takePhotos()
                  .catch(err => error('at MOTION_CREATED->photographer.takePhotos():', err))
              }
            }]
        }
        info('calling socket-io')
        return self.socketIO.connect(options)
      })
      .then(() => diehard.listen()) // diehard uses 'this' context.  That is why we have to call it this way.
  }
}

module.exports = Client
