'use strict'
class RequestTracker {
  constructor () {
    this.activeQueries = {}
    this.activeFileRequests = {}
    this.recentQueries = {}
  }
}
module.exports = RequestTracker
