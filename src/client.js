const info = require('debug')('ha:client:info')
const error = require('debug')('ha:client:error')

const config = require('./config')
const diehard = require('diehard')
const LED = require('raspberry-pi-led')
const moment = require('moment')
const Photographer = require('./photographer')
const Promise = require('bluebird')
const Uploader = require('./uploader')
const pubnubConnect = require('./pubnub')

const events = [
  {
    system: 'CAMERAS',
    type: 'TAKE_PHOTO',
    callback: data => {
      info('TAKE_PHOTO called.  data:', data)
      const photographer = new Photographer(data.count, moment().add(moment.duration(data.duration)))
      photographer.takePhotos()
        .catch(err => error('at TAKE_PHOTO->photographer.takePhotos():', err))
    }
  },
  {
    system: 'ALARM',
    type: 'TOGGLE_CREATED',
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
    system: 'ALARM',
    type: 'MOTION_CREATED',
    callback: data => {
      info('MOTION_CREATED called.  data:', data)

      const photographer = new Photographer(0, moment().add(1, 'hours'))
      photographer.takePhotos()
        .catch(err => error('at MOTION_CREATED->photographer.takePhotos():', err))
    }
  }]

class Client {
  constructor () {
    this.ledClientUp = new LED('PIN_CLIENT_UP', config.pins.clientUp)
    this.ledConnectedToServer = new LED('PIN_CONNECTED_TO_SERVER', config.pins.connectedToServer)
    this.ledTakingPictures = new LED('PIN_CONNECTED_TO_SERVER', config.pins.takingPictures)
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
        info('calling pubnub')
        return pubnubConnect(
          self.ledConnectedToServer,
          events,
          {
            subject: '/files',
            audience: 'urn:home-automation/storage'
          }
        )
      })
      .then(() => diehard.listen()) // diehard uses 'this' context.  That is why we have to call it this way.
  }
}

module.exports = Client
