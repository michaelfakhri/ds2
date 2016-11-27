<h1 align="center">UP2P in the browser</h1>
<h2>API</h2>
<h3>connectTo(userHash)</h3>
long term: return a promise
<h3>disconnectFrom(userHash)</h3>
long term: return a promise
<h3>PublishFile(file)</h3>
long term: return a promise
<h3>deletePublishedFile(fileHash)</h3>
long term: maybe return a promise
<h3>copyFilePublishedOverNetwork(fileHash, userHash)</h3>
returns promise that resolves when file is downloaded
<h3>query(queryObject)</h3>
returns promise that resolves when query responses are back
