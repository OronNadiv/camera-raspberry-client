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
const exit = require('./exit')

const events = [
  {
    system: 'CAMERAS',
    type: 'TAKE_PHOTO',
    callback: data => {
      info('TAKE_PHOTO called.  data:', data)
      const photographer = new Photographer(data.count, moment().add(moment.duration(data.duration)))
      photographer.takePhotos()
        .catch(err => {
          error('at TAKE_PHOTO->photographer.takePhotos():', err)
          return exit(3)
        })
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
        .catch(err => {
          error('at Photographer.stop():', err)
          return exit(4)
        })
    }
  },
  {
    system: 'ALARM',
    type: 'MOTION_CREATED',
    callback: data => {
      info('MOTION_CREATED called.  data:', data)

      const photographer = new Photographer(0, moment().add(1, 'hours'))
      photographer.takePhotos()
        .catch(err => {
          error('at MOTION_CREATED->photographer.takePhotos():', err)
          return exit(5)
        })
    }
  }]

class Client {
  constructor () {
    this.ledClientUp = config.pins.clientUp < 0
      ? null
      : new LED({name: 'PIN_CLIENT_UP', pin: config.pins.clientUp})
    this.ledConnectedToServer = config.pins.connectedToServer < 0
      ? null
      : new LED({name: 'PIN_CONNECTED_TO_SERVER', pin: config.pins.connectedToServer})
    this.ledTakingPictures = config.pins.takingPictures < 0
      ? null
      : new LED({name: 'PIN_TAKING_PICTURES', pin: config.pins.takingPictures})
  }

  run () {
    const self = this

    return Promise
      .try(() => self.ledClientUp && self.ledClientUp.initialize())
      .then(() => self.ledClientUp && self.ledClientUp.turnOn())
      .then(() => self.ledConnectedToServer && self.ledConnectedToServer.initialize())
      .then(() => self.ledConnectedToServer && self.ledConnectedToServer.turnOff())
      .then(() => self.ledTakingPictures && self.ledTakingPictures.initialize())
      .then(() => self.ledTakingPictures && self.ledTakingPictures.turnOff())
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
