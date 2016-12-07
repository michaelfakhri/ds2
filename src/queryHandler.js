'use strict'

const stream = require('pull-stream')
const pullPushable = require('pull-pushable')
const pullDecode = require('pull-utf8-decoder')

const Request = require('./request')

module.exports = class RequestHandler {
  constructor (aDbManager, aNode) {
    this.MAXIMUM_QUERY_TIME_PRIMARY = 15
    this.MAXIMUM_QUERY_TIME_SECONDARY = 5
    this.MAXIMUM_FILE_REQUEST_TIME = 20

    this.dbManager = aDbManager
    this.myId = aNode.peerInfo.id.toB58String()
    this.activeQueryConnections = {}
    this.activeFtpConnections = {}
    this.activeQueries = []
    this.activeFileRequests = []
    this.node = aNode
  }

  buildAndSendQuery (query) {
    var self = this
    var cryptoSafeRandomNumber = window.crypto.getRandomValues(new Uint32Array(1))[0]

    var queryToSend = new Request(this.myId, cryptoSafeRandomNumber, query)

    var nrOfExpectedResponses = this.sendRequestToAll(queryToSend)
    this.activeQueries[cryptoSafeRandomNumber.toString()] = {
      originalRequest: queryToSend,
      expectedResponses: nrOfExpectedResponses,
      receivedResponses: 0,
      resolve: undefined,
      reject: undefined,
      responses: []
    }
    return new Promise(function (resolveF, rejectF) {
      var activeQuery = self.activeQueries[cryptoSafeRandomNumber.toString()]
      if (activeQuery.expectedResponses === activeQuery.receivedResponses) {
        resolveF(activeQuery.responses)
      } else {
        activeQuery.resolve = resolveF
        activeQuery.reject = rejectF
        setTimeout(function () {
          var timedOutQuery = self.activeQueries[cryptoSafeRandomNumber.toString()]
// could have been resolved by the transfer protocol
          if (timedOutQuery) {
            timedOutQuery.resolve(timedOutQuery.responses)
            delete self.activeQueries[cryptoSafeRandomNumber.toString()]
          }
        }, self.MAXIMUM_QUERY_TIME_PRIMARY * 1000)
      }
    })
  }
  requestProcessor (nrOfExpectedResponses, request) {
    var self = this
    var requestId = request.id.toString()
    request.response = true
    if (request.queryRequest) {
      var response = 'dummyResponse ' + self.myId // TODO: ADD real response
      self.activeQueries[requestId] = {
        originalRequest: request,
        expectedResponses: (nrOfExpectedResponses + 1), // +1 is my node
        receivedResponses: 0,
        resolve: undefined,
        reject: undefined,
        responses: []
      }
      self.activeQueries[requestId].responses.push(response)
      self.activeQueries[requestId].receivedResponses++

      new Promise(function (resolveF, rejectF) {
        var activeQuery = self.activeQueries[requestId]
        if (activeQuery.expectedResponses === activeQuery.receivedResponses) {
          var result = activeQuery.originalRequest
          result.queryRequest.response = activeQuery.responses
          resolveF(result)
        } else {
          activeQuery.resolve = resolveF
          activeQuery.reject = rejectF
          setTimeout(function () {
            var timedOutQuery = self.activeQueries[requestId]
// could have been resolved by the transfer protocol
            if (timedOutQuery) {
              var result = timedOutQuery.originalRequest
              result.queryRequest.response = timedOutQuery.responses
              timedOutQuery.resolve(result)
              delete self.activeQueries[requestId]
            }
          }, self.MAXIMUM_QUERY_TIME_SECONDARY * 1000)
        }
      })
.then(function (queryResult) {
  var myIndex = queryResult.route.indexOf(self.myId)
  if (self.activeQueryConnections[queryResult.route[myIndex - 1]]) {
    self.activeQueryConnections[queryResult.route[myIndex - 1]].push(JSON.stringify(queryResult))
  }
})
    } else {
      this.dbManager.fileExists(request.ftpRequest.file).then(function (exists) {
        request.ftpRequest.response = {}
        if (exists) {
          request.ftpRequest.response.accepted = true
// add fileInfo
          console.log('initiating read')
          stream(
self.dbManager.getFileReader(request.ftpRequest.file),
self.activeFtpConnections[request.route[0]].connection
)
        } else {
          request.ftpRequest.response.accepted = false
          request.ftpRequest.response.error = 'file NOT found'
        }
        self.activeQueryConnections[request.route[0]].push(JSON.stringify(request))
      })
    }
  }

  sendRequestToAll (query) {
    var count = 0
    for (var userHash in this.activeQueryConnections) {
      if (query.route.indexOf(userHash) < 0) {
        this.activeQueryConnections[userHash].push(JSON.stringify(query))
        count++
      }
    }
    return count
  }
  sendRequestToUser (userHash, ftpRequest) {
    this.activeQueryConnections[userHash].push(JSON.stringify(ftpRequest))
  }

  initQueryStream (connection) {
    var self = this
    var queryPusher = pullPushable()
    stream(queryPusher, // data pusher
connection, // p2p connection
pullDecode(), // convert uint8 to utf8
stream.drain(self.queryTransferProtocolHandler.bind(self), // function called when data arrives
function (err) {
  if (err)console.error(err)
  connection.getObservedAddrs(function (err, data) {
    if (err)console.error(err)
    self.node.hangUpByMultiaddr(data[0].toString(), function (err) {
      if (err)console.error(err)
    })
    var addr = data[0].toString().split('/')
    self.disconnectConnection(addr[addr.length - 1])
  })
}) // function called when stream is done
)
    connection.getObservedAddrs(function (err, data) { var addr = data[0].toString().split('/'); self.activeQueryConnections[addr[addr.length - 1]] = queryPusher })
  }
  initFtpStream (conn) {
    var self = this
    conn.getObservedAddrs(function (err, data) { var addr = data[0].toString().split('/'); self.activeFtpConnections[addr[addr.length - 1]] = {connection: conn, activeIncoming: false} })
  }
  queryTransferProtocolHandler (request) {
    var self = this
    var parsedRequest = JSON.parse(request)
    if (!parsedRequest.response) {
// new query handling
      parsedRequest.timeToLive--
      var expectedNumberOfResponses = 0
      if (parsedRequest.timeToLive > 0) {
        parsedRequest.route.push(this.myId)
        expectedNumberOfResponses = this.sendRequestToAll(parsedRequest)
      }
      console.log('received request', JSON.stringify(parsedRequest))
      this.requestProcessor(expectedNumberOfResponses, parsedRequest)
    } else {
      if (parsedRequest.queryRequest) {
        console.log('received a query result, which I am about to process', parsedRequest)
// response propagation handling
        var activeQuery = this.activeQueries[parsedRequest.id.toString()]
        if (activeQuery) {
          parsedRequest.queryRequest.response.forEach((elementInArray) => activeQuery.responses.push(elementInArray))
          activeQuery.receivedResponses++
          if (activeQuery.receivedResponses === activeQuery.expectedResponses) {
            var result = activeQuery.originalRequest
// special handling if its me
            if (result.route[0] === this.myId) {
              result = activeQuery.responses
            } else {
              result.queryRequest.response = activeQuery.responses
            }
            if (activeQuery.resolve) {
              activeQuery.resolve(result)
              delete this.activeQueries[parsedRequest.id.toString()]
            }
          }
        }
      } else if (parsedRequest.ftpRequest) {
        console.log(self)
        self.activeFileRequests[parsedRequest.id.toString()].responseReceived = true
        if (!parsedRequest.ftpRequest.response.accepted) {
          self.activeFileRequests[parsedRequest.id.toString()].reject(parsedRequest.ftpRequest.response.error)
          delete self.activeFileRequests[parsedRequest.id.toString()]
        } else {
// store parsedRequest.ftpRequest.response.fileInfo
        }
      }
    }
  }
  disconnectConnection (userHash) {
    if (this.activeQueryConnections[userHash]) this.activeQueryConnections[userHash].end()
    delete this.activeQueryConnections[userHash]
  }
  buildAndSendFileRequest (fileHash, userHash) {
    var self = this
    if (!self.activeFtpConnections[userHash] || !self.activeQueryConnections[userHash]) {
      throw new Error('user is not connected')
    }
    if (self.activeFtpConnections[userHash].activeIncoming) {
      throw new Error('There is a currently active connection')
    }
    self.activeFtpConnections[userHash].activeIncoming = true

    var cryptoSafeRandomNumber = window.crypto.getRandomValues(new Uint32Array(1))[0]
    console.log('initiating write')
    stream(
self.activeFtpConnections[userHash].connection,
self.dbManager.getFileWriter(fileHash, function (err) {
  if (err)console.error(err)
  console.log('done')
  self.activeFtpConnections[userHash].activeIncoming = false
  self.activeFileRequests[cryptoSafeRandomNumber.toString()].resolve()
  delete self.activeFileRequests[cryptoSafeRandomNumber.toString()]
})
)
    var ftpRequestToSend = new Request(self.myId, cryptoSafeRandomNumber, undefined, {file: fileHash})

    self.activeFileRequests[cryptoSafeRandomNumber.toString()] = {
      originalRequest: ftpRequestToSend,
      resolve: undefined,
      reject: undefined,
      responseReceived: false
    }
    return new Promise(function (resolveF, rejectF) {
      self.sendRequestToUser(userHash, ftpRequestToSend)
      var activeFileRequest = self.activeFileRequests[cryptoSafeRandomNumber.toString()]
      activeFileRequest.resolve = resolveF
      activeFileRequest.reject = rejectF
      setTimeout(function () {
        if (!self.activeFileRequests[cryptoSafeRandomNumber.toString()].responseReceived) {
          rejectF('Request TIMED OUT')
          delete self.activeFileRequests[cryptoSafeRandomNumber.toString()]
        }
      }, self.MAXIMUM_FILE_REQUEST_TIME * 1000)
    })
  }
}
