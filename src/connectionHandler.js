'use strict'
const RequestHandler = require('./queryHandler')
module.exports = class ConnectionHandler {
  constructor (node, dbManager) {
    let self = this
    this.node = node
    this.requestHandler = new RequestHandler(dbManager, node)
    node.handle('/UP2P/queryTransfer', (protocol, conn) => {
      self.requestHandler.initQueryStream(conn)
    })
    node.handle('/UP2P/fileTransfer', (protocol, conn) => {
      self.requestHandler.initFtpStream(conn)
    })
  }
  connectTo (ma) {
    let self = this
    return new Promise((resolve, reject) => {
      self.node.dialByMultiaddr(ma, '/UP2P/queryTransfer', (err, conn) => {
        if (err) return reject(err)
        self.requestHandler.initQueryStream(conn)
        self.node.dialByMultiaddr(ma, '/UP2P/fileTransfer', (err, conn) => {
          if (err) return reject(err)
          self.requestHandler.initFtpStream(conn)
          resolve()
        })
      })
    })
  }

  disconnectFrom (userHash) {
    var self = this
    var ma = '/libp2p-webrtc-star/ip4/127.0.0.1/tcp/15555/ws/ipfs/' + userHash
    // TODO: REMOVE THE FOLLOWING TWO LINES WHEN HANGUP BUG IS INVESTIGATED/FIXED
    self.requestHandler.disconnectConnection(userHash)
    return new Promise((resolve, reject) => {
      self.node.hangUpByMultiaddr(ma, function (err) {
        if (err) return reject(err)
        resolve()
      })
    })
    //
  }
  sendQuery (query) {
    return this.requestHandler.buildAndSendQuery(query)
  }
  sendFileRequest (file, user) {
    return this.requestHandler.buildAndSendFileRequest(file, user)
  }
}

// var activeFtpConnections = {};
// protocol='/UP2P/fileTransfer'+fileHash;
// node.handle(protocol, (proto, conn) => {
// var filePusher = stream.pullPushable();
// initFileStream(filePusher, conn, fileTransferProtocolHandler, streamEndCallback);
// conn.getObservedAddrs(function(err,data){var addr = data[0].toString().split("/");activeFtpConnections[addr[addr.length - 1]]={push:filePusher.push,currentlyActiveProtocol:protocol}});
// });
// node.dialByMultiaddr(ma, protocol, function(err,conn){
// if(err)console.error(err);
// var filePusher = stream.pullPushable();
// initFileStream(filePusher, conn, fileTransferProtocolHandler, streamEndCallback);
// conn.getObservedAddrs(function(err,data){var addr = data[0].toString().split("/");activeFtpConnections[addr[addr.length - 1]]={push:filePusher.push,currentlyActiveProtocol:protocol}});
// });
// node.hangUpByMultiaddr(ma, (err)=>{
// if(err)console.error(err);
// });
// function fileTransferProtocolHandler(data){
// TODO: IMPLEMENT FILE TRANSFER PROTOCOL HANDLER 1.RECEIVE FILE 2.STORE FILE
// console.log(data);
// }
// function disconnectFtpConnecttion(userHash){
// if(activeFtpConnections[userHash])activeFtpConnections[userHash].end();
// delete activeFtpConnections[userHash];
// }
