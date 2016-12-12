<h1 align="center">UP2P in the browser</h1>
<h2>API</h2>
<BS><h3>constructor([peerId], queryProcessor)</h3>
returns a promise that resolves to an instance of this module
<h3>connectTo(userHash)</h3>
returns a promise that resolves when peer is connected
<h3>disconnectFrom(userHash)</h3>
returns a promise that resolves when peer is disconnected
<h3>PublishFile(file, metadata)</h3>
returns promise that resolves to the file hash of the file. Also stores the metadata
<h3>deletePublishedFile(fileHash)</h3>
returns a promise that resolves 
<h3>copyFilePublishedOverNetwork(fileHash, userHash)</h3>
returns promise that resolves when file is downloaded
<h3>query(queryObject)</h3>
returns promise that resolves when query responses are back
