# DS2 API

## Constructor
### `DS2(metadataHandler, options)`
> returns an instance of this module.

Where:
* `metadataHandler :`[`MetadataHandler`](https://github.com/michaelfakhri/metadata-handler-interface) - Any object that implements the Metadata Handler interface.
* `options : Object` - The available options are listed below:
  * `useEcncryption : Boolean` - true/false default: false 
  * `signalling : String` - default: '/libp2p-webrtc-star/ip4/127.0.0.1/tcp/15555/ws/ipfs/' The address of the signalling server (libp2p-webrtc-star) in [Multiaddr](https://github.com/multiformats/multiaddr) format. Another example is ‘/libp2p-webrtc-star/dns/blooming-atoll-60728.herokuapp.com/wss/ipfs/'.

## Methods
#### `Promise start([peerId])`
> returns a promise that resolves when network layer and storage modules are started.

Where:
- `peerId :`[`PeerId`](https://github.com/libp2p/js-peer-id) - An optional parameter that is used to instantiate the libp2p networking layer with a custom peer identity. This is mainly used for testing.

#### `Promise stop()`
> returns a promise that resolves when network layer and storage modules are stopped.

#### `Promise connect(user)`
> returns a promise that resolves when the peer is connected.

Where:
- `user : String` – The identity of the user that the networking layer should connect to.

#### `Promise disconnect(user)`
> returns a promise that resolves when the peer is disconnected.

Where:
- `user : String` – The identity of the user that the networking layer should disconnect from.

#### `Promise publish(file, metadata)`
> returns promise that resolves to the hash of the file after the file and metadata are stored in their respective storage units.

Where:
- `file : Array` - The file contents to store in storage so that other users can request this file contents.
- `metadata : Object` – The metadata of the file contents provided, which will also be stored using metadata storage provided in the constructor.

#### `Promise delete(hash)`
> returns a promise that resolves when the file and its metadata are deleted from the data storage unit.

Where:
- `hash : String` – The hash of the file contents to delete from data storage unit.

#### `Promise copy(hash, user)`
> returns a promise that resolves when file is downloaded. A user must be connected using connect(user) before calling this function.

Where:
- `hash : String` – The hash of the file contents to download from another peer.
- `User : String` - The identity (public key) of the user to download the data from

#### `Promise view(hash)`
> returns a promise that resolves to the file stored in the data storage unit. The promise is rejected if hash does not exist in the data storage unit.

Where:
- `hash : String` – The hash of the file contents to view from the data storage unit.

#### `Promise query(query, hops)`
> returns promise that resolves when query responses are received from all connected peers. This query string is sent to all connected peers. Each peer will do three things: 
1) Pass it to the MetadataHandler object passed to the `constructor` when this class was instantiated. 
2) Decrement hops and forward the query to all connected peers if the number of hops left is greater than 0. 
3) collect all responses that come in from the peers that received this query from this node. Send back the responses once the last response is received.

Where:
- `query : String` – A query of the metadata storage unit.
- `hops : Integer` – The number of hops this query should make away from this node.

#### `Array getConnectedPeers()`
> returns a list of the connected peer.

#### `String getIdentity()`
> returns the identity of a node.
