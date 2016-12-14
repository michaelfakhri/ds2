<h1 align="center">UP2P in the browser</h1>
## API
<h3>constructor([peerId], queryProcessor)</h3>
returns a promise that resolves to an instance of this module
<h3>connect(userHash)</h3>
returns a promise that resolves when peer is connected
<h3>disconnectFrom(userHash)</h3>
returns a promise that resolves when peer is disconnected
<h3>Publish</h3>
(file, metadata)
returns promise that resolves to the file hash of the file once the file contents are stored and also stores the file metadata 
<h3>delete</h3>
(fileHash)
returns a promise that resolves 
<h3>copy</h3>
(fileHash, userHash)
returns promise that resolves when file is downloaded
<h3>query</h3>
(queryStr)
returns promise that resolves when query responses are back
