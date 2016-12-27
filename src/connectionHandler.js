'use strict'
const RequestHandler = require('./queryHandler')
const deferred = require('deferred')
module.exports = class ConnectionHandler {
  constructor (node, dbManager) {
    let self = this
    this.node = node
    this.requestHandler = new RequestHandler(dbManager, node)
    node.handle('/UP2P/queryTransfer', (protocol, conn) => self.requestHandler.initQueryStream(conn))
    node.handle('/UP2P/fileTransfer', (protocol, conn) => self.requestHandler.initFtpStream(conn))
  }
  connect (ma) {
    let self = this
    return deferred.promisify(self.node.dialByMultiaddr.bind(self.node))(ma, '/UP2P/queryTransfer')
      .then((conn) => self.requestHandler.initQueryStream(conn))
      .then(() => deferred.promisify(self.node.dialByMultiaddr.bind(self.node))(ma, '/UP2P/fileTransfer'))
      .then((conn) => self.requestHandler.initFtpStream(conn))
  }

  disconnect (userHash) {
    var ma = '/libp2p-webrtc-star/ip4/127.0.0.1/tcp/15555/ws/ipfs/' + userHash
    // TODO: REMOVE THE FOLLOWING LINE WHEN HANGUP BUG IS INVESTIGATED/FIXED
    this.requestHandler.disconnectConnection(userHash)
    return deferred.promisify(this.node.hangUpByMultiaddr.bind(this.node))(ma)
  }
  sendQuery (aQuery) {
    return this.requestHandler.buildAndSendQuery(aQuery)
  }
  sendFileRequest (file, user) {
    return this.requestHandler.buildAndSendFileRequest(file, user)
  }
}
