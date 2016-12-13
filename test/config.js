/* eslint-env mocha */
'use strict'
const Logger = require('logplease')
const assert = require('chai').assert
const UP2P = require('../src/index')
Logger.setLogLevel(Logger.LogLevels.ERROR)

describe('Config storage in db Manager', () => {
  it('check configs', (done) => {
    let peer1, peer2
    let config1, config2

    new UP2P()
      .then((peer) => { peer1 = peer })
      .then(() => peer1.dbManager.getConfig())
      .then((config) => { config1 = config })
      .then(() => new UP2P())
      .then((peer) => { peer2 = peer })
      .then(() => peer2.dbManager.getConfig())
      .then((config) => { config2 = config })
      .then(() => assert.deepEqual(config1, config2)) // they equal each other since they share the same dB
      .then(done)
  })
})
