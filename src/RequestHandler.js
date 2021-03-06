'use strict'

const RequestFactory = require('./RequestFactory')

module.exports = class RequestHandler {
  constructor (EE) {
    this._activeRequests = []
    this._EE = EE
    this._myId
    this._recentRequestIds = []

    this._EE.on('IncomingRequest', this.onIncomingRequest.bind(this))
    this._EE.on('IncomingResponse', this.onIncomingResponse.bind(this))
  }
  start (aPeerId) {
    this._myId = aPeerId.toB58String()

    // return peer-id instance so other modules can use it
    return aPeerId
  }

  onIncomingRequest (request) {
    let self = this
    let requestId = request.getId()
    request.addToRoute(this._myId)

    if (this._recentRequestIds.indexOf(request.getId()) > -1) {
      request.setResult([])
      return this._EE.emit('IncomingResponse', request)
    }
    this._activeRequests[requestId] = request
    this._recentRequestIds.push(requestId)
    setTimeout(() => self._recentRequestIds.shift(), 5 * 1000)

    if (RequestFactory.isQuery(request)) {
      this._EE.emit('IncomingQueryRequest', request)
    } else if (RequestFactory.isFile(request)) {
      this._EE.emit('IncomingFileRequest', request)
    }
  }

  onIncomingResponse (response) {
    let requestId = response.getId()
    if (RequestFactory.isFile(response)) {
      this._activeRequests.splice(requestId, 1)
      return this._EE.emit('IncomingFileResponse', response)
    }

    let activeRequest = this._activeRequests[requestId]
    activeRequest.incrementReceivedResponses()
    response.getResult().forEach((elementInArray) => activeRequest.addResponse(elementInArray))

    if (activeRequest.isDone()) {
      if (!activeRequest.isRequestOriginThisNode()) {
        activeRequest.setResult(activeRequest.getResponses())
        this._EE.emit('ReturnToSender', activeRequest)
      } else {
        activeRequest.getDeferred().resolve(activeRequest.getResponses())
      }
    }
  }
}
