/* eslint-env mocha */
'use strict'

const assert = require('chai').assert
const PeerId = require('peer-id')
const Peer = require('./peer')

let id1
let id2
let id3

let peer1
let peer2
let peer3

beforeEach(() => {
  PeerId.create((err, id) => {
    if(err)console.error(err)
    id1 = id.toB58String()
    peer1 = new Peer(id)

  })
  PeerId.create((err, id) => {
    if(err)console.error(err)
    id2 = id.toB58String()
    peer2 = new Peer(id)

  })
  PeerId.create((err, id) => {
    if(err)console.error(err)
    id3 = id.toB58String()
    peer3 = new Peer(id)

  })
})

describe('Query1', () => {
  it('query between two nodes', (done) => {
    setTimeout(() => {
      peer1.connectTo(id2)
      setTimeout(() => {
        peer1.query({})
        setTimeout(() => {
          done()
        }, 5000)
      }, 5000)
    }, 5000)
  })
})
