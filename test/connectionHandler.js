/* eslint-env mocha */
'use strict'
const Logger = require('logplease')
const assert = require('chai').assert
const PeerId = require('peer-id')
const UP2P = require('../src/index')
const MockMetadataHandler = require('./mockMetadataHandler')

Logger.setLogLevel(Logger.LogLevels.ERROR)

let peers = []

describe('Connection Handler', () => {
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

  it('Connect', (done) => {
    peers[0].peer.connect(peers[1].id)
      .then(() => assert.strictEqual(peers[0].peer.getConnectedPeers().length, 1))
      .then(() => assert.strictEqual(peers[1].peer.getConnectedPeers().length, 1))
      .then(() => assert.strictEqual(Object.keys(peers[0].peer._connectionHandler._node.swarm.muxedConns).length, 1))
      .then(() => assert.strictEqual(Object.keys(peers[1].peer._connectionHandler._node.swarm.muxedConns).length, 1))
      .then(done)
      .catch((err) => console.error(err.stack))
  })

  it('Disconnect from initiator side', (done) => {
    peers[0].peer.connect(peers[1].id)
      .then(() => peers[0].peer.disconnect(peers[1].id))
      .then(() => {
        setTimeout(() => {
          assert.strictEqual(peers[0].peer.getConnectedPeers().length, 0)
          assert.strictEqual(peers[1].peer.getConnectedPeers().length, 0)
          assert.strictEqual(Object.keys(peers[0].peer._connectionHandler._node.swarm.muxedConns).length, 0)
          assert.strictEqual(Object.keys(peers[1].peer._connectionHandler._node.swarm.muxedConns).length, 0)
          done()
        }, 1000)
      })
      .catch((err) => console.error(err.stack))
  })

  it('Disconnect from receiver side', (done) => {
    peers[0].peer.connect(peers[1].id)
      .then(() => peers[1].peer.disconnect(peers[0].id))
      .then(() => {
        setTimeout(() => {
          assert.strictEqual(peers[0].peer.getConnectedPeers().length, 0)
          assert.strictEqual(peers[1].peer.getConnectedPeers().length, 0)
          assert.strictEqual(Object.keys(peers[0].peer._connectionHandler._node.swarm.muxedConns).length, 0)
          assert.strictEqual(Object.keys(peers[1].peer._connectionHandler._node.swarm.muxedConns).length, 0)
          done()
        }, 1000)
      })
      .catch((err) => console.error(err.stack))
  })
})
