/* eslint-env mocha */
'use strict'
const Logger = require('logplease')
// const assert = require('chai').assert
const UP2P = require('../src/index')
Logger.setLogLevel(Logger.LogLevels.ERROR)

describe('new UP2P instance', () => {
  it('check configs', (done) => {
    new UP2P()
      .then(done)
  })
})
