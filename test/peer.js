'use strict'

const PeerId = require('peer-id')
const PeerInfo = require('peer-info')
const Node = require('libp2p-ipfs-browser')
const Multiaddr = require('multiaddr')
const UP2P = require('../src/index')

module.exports = class Peer {
  constructor (pId) {
    var pInfo = new PeerInfo(pId)
    var ma = Multiaddr('/libp2p-webrtc-star/ip4/127.0.0.1/tcp/15555/ws/ipfs/' + pId.toB58String())
    pInfo.multiaddr.add(ma)
    var node = new Node(pInfo)
    return new UP2P(node)
  }
}
