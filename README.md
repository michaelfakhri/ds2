<h1 align="center">UP2P in the browser</h1>
## API
<h3>constructor([PeerId], QueryProcessor)</h3>
returns a promise that resolves to an instance of this module
<h3>connect(userHash)</h3>
returns a promise that resolves when peer is connected
<h3>disconnect(userHash)</h3>
returns a promise that resolves when peer is disconnected
<h3>Publish(fileHash, metadata)</h3>
returns promise that resolves to the file hash of the file once the file contents are stored and also stores the file metadata.
<h3>delete(fileHash)</h3>
returns a promise that resolves when file is deleted.
<h3>copy(fileHash, userHash)</h3>
returns promise that resolves when file is downloaded.
<h3>query(queryString)</h3>
returns promise that resolves when query responses are back.
