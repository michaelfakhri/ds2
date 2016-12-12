/* eslint-env mocha */
'use strict'

const assert = require('chai').assert
const PeerId = require('peer-id')
const UP2P = require('../src/index')

let peers = []

describe('Query', () => {
  let nrOfNodes = 3
  beforeEach((done) => {
    var count = 0
    var incrementDoneCount = () => ++count === nrOfNodes ? done() : undefined
    for (var i = 0; i < nrOfNodes; i++) {
      PeerId.create((err, id) => { // eslint-disable-line no-loop-func
        if (err) throw err
        new UP2P(id)
        .then((peer) => {
          peers.push({id: id.toB58String(), peer: peer})
          return peer.start()
        })
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

  it('query between two nodes', (done) => {
    peers[0].peer.connectTo(peers[1].id)
    .then(() => peers[0].peer.query({}))
      .then((result) => assert.deepEqual(parseQueryResult(result), [peers[1].id]))
    .then(() => peers[0].peer.disconnectFrom(peers[1].id))
    .then(done)
  })
  it('query between three nodes', (done) => {
    peers[0].peer.connectTo(peers[1].id)
      .then(() => peers[1].peer.connectTo(peers[2].id))
      .then(() => peers[0].peer.query({}))
      .then((result) => assert.deepEqual(parseQueryResult(result), [peers[1].id, peers[2].id]))
      .then(() => peers[0].peer.disconnectFrom(peers[1].id))
      .then(() => peers[2].peer.disconnectFrom(peers[1].id))
      .then(done)
  })
  it('query between three nodes with error', (done) => {
    peers[0].peer.connectTo(peers[1].id)
      .then(() => peers[0].peer.connectTo(peers[2].id))
      .then(() => peers[1].peer.connectTo(peers[2].id))
      .then(() => peers[0].peer.query({}))
      .then((result) => console.log(result))//assert.deepEqual(parseQueryResult(result), [peers[1].id, peers[2].id]))
      .then(() => peers[0].peer.disconnectFrom(peers[1].id))
      .then(() => peers[0].peer.disconnectFrom(peers[2].id))
      .then(() => peers[1].peer.disconnectFrom(peers[2].id))
      .then(done)
  })
  function parseQueryResult(responses) {
    return responses.map((response) => response.id)
  }
})
