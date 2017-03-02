/* eslint-env mocha */
'use strict'
const Logger = require('logplease')
const assert = require('chai').assert
const PeerId = require('peer-id')
const UP2P = require('../src/index')
const MockMetadataHandler = require('./mockMetadataHandler')

Logger.setLogLevel(Logger.LogLevels.ERROR)

let peers = []

describe('data propagation across nodes', () => {
  let nrOfNodes = 2
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
      })
    }
  })

  afterEach((done) => {
    var count = 0
    var incrementDoneCount = () => ++count === nrOfNodes ? done() : undefined
    peers.forEach((peer) => {
      peer.peer.stop()
        .then(incrementDoneCount)
    })
    peers.splice(0, peers.length)
  })

  it('file request - 5 MB', (done) => {
    let sent = Buffer(5000000).fill('abcd') // 5 MB of abcd
    let hashOfFile
    peers[0].peer.connect(peers[1].id)
      .then(() => peers[0].peer.publish(sent, '{}'))
      .then((hash) => { hashOfFile = hash })
      .then(() => peers[1].peer.copy(hashOfFile, peers[0].id))
      .then(() => peers[1].peer.view(hashOfFile))
      .then((received) => assert.deepEqual(sent, Buffer(received)))
      .then(() => peers[0].peer.disconnect(peers[1].id))
      .then(done)
      .catch((err) => console.error(err.stack))
  })
  it('2 file requests - 5 MB total (2 MB => 3 MB)', (done) => {
    let sent1 = Buffer(2000000).fill('abcd') // 2 MB of abcd
    let sent2 = Buffer(3000000).fill('abcd') // 3 MB of abcd
    let hashOfFile1, hashOfFile2
    peers[0].peer.connect(peers[1].id)
      .then(() => peers[0].peer.publish(sent1, '{}'))
      .then((hash) => { hashOfFile1 = hash })
      .then(() => peers[0].peer.publish(sent2, '{}'))
      .then((hash) => { hashOfFile2 = hash })
      .then(() => peers[1].peer.copy(hashOfFile1, peers[0].id))
      .then(() => peers[1].peer.view(hashOfFile1))
      .then((received) => assert.deepEqual(sent1, Buffer(received)))
      .then(() => peers[1].peer.copy(hashOfFile2, peers[0].id))
      .then(() => peers[1].peer.view(hashOfFile2))
      .then((received) => assert.deepEqual(sent2, Buffer(received)))
      .then(() => peers[0].peer.disconnect(peers[1].id))
      .then(done)
      .catch((err) => console.error(err.stack))
  })
})
