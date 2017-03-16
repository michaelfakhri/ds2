'use strict'

const Libp2p = require('libp2p')
const Secio = require('libp2p-secio')
const SPDY = require('libp2p-spdy')
const WebRTCStar = require('libp2p-webrtc-star')

class Node extends Libp2p {
  constructor (peerInfo, options) {
    let encryption
    const webRTCStar = new WebRTCStar()

    if (options.useEncryption) {
      encryption = [Secio]
    } else {
      encryption = []
    }

    const modules = {
      transport: [
        webRTCStar
      ],
      connection: {
        muxer: [
          SPDY
        ],
        crypto: encryption
      },
      discovery: []
    }

    super(modules, peerInfo, undefined, {})
  }
}

module.exports = Node
