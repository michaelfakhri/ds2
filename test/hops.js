/* eslint-env mocha */
'use strict'
const Logger = require('logplease')
const assert = require('chai').assert
const PeerId = require('peer-id')
const UP2P = require('../src/index')
const MockMetadataHandler = require('./mockMetadataHandler')

Logger.setLogLevel(Logger.LogLevels.ERROR)

let peers = []

describe('Query hops', () => {
  let nrOfNodes = 3
  beforeEach((done) => {
    var count = 0
    var incrementDoneCount = () => ++count === nrOfNodes ? done() : undefined
    for (var i = 0; i < nrOfNodes; i++) {
      PeerId.create((err, id) => { // eslint-disable-line no-loop-func
        if (err) throw err
        let peer = new UP2P(new MockMetadataHandler())
        peers.push({id: id.toB58String(), peer: peer})
        peer.start(id)
          .then(incrementDoneCount)
          .catch((err) => console.error(err))
      })
    }
  })

  afterEach((done) => {
    var count = 0
    var incrementDoneCount = () => ++count === nrOfNodes ? done() : undefined
    peers.forEach((peer) => {
      peer.peer.stop()
        .then(incrementDoneCount)
        .catch((err) => console.error(err.stack))
    })
    peers.splice(0, peers.length)
  })

  it('local query (0 hops away)', (done) => {
    peers[0].peer.connect(peers[1].id)
      .then(() => peers[0].peer.query('{}', 0))
      .then((result) => assert.sameDeepMembers(parseQueryResult(result), ['local']))
      .then(() => peers[0].peer.disconnect(peers[1].id))
      .then(done)
      .catch((err) => console.error(err.stack))
  })

  it('local query and 1 hop away', (done) => {
    peers[0].peer.connect(peers[1].id)
      .then(() => peers[1].peer.connect(peers[2].id))
      .then(() => peers[0].peer.query('{}', 1))
      .then((result) => assert.sameDeepMembers(parseQueryResult(result), ['local', peers[1].id]))
      .then(() => peers[0].peer.disconnect(peers[1].id))
      .then(done)
      .catch((err) => console.error(err.stack))
  })

  it('local query and 2 hops away', (done) => {
    peers[0].peer.connect(peers[1].id)
      .then(() => peers[1].peer.connect(peers[2].id))
      .then(() => peers[0].peer.query('{}', 2))
      .then((result) => assert.sameDeepMembers(parseQueryResult(result), ['local', peers[1].id, peers[2].id]))
      .then(() => peers[0].peer.disconnect(peers[1].id))
      .then(() => peers[2].peer.disconnect(peers[1].id))
      .then(done)
      .catch((err) => console.error(err.stack))
  })

  function parseQueryResult (responses) {
    return responses.map((response) => response.id)
  }
})
