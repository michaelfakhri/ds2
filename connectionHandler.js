class ConnectionHandler{
	constructor(node, dbManager){
		this.node = node;
		this.requestHandler = new RequestHandler(dbManager, node);
		node.handle('/UP2P/queryTransfer', (protocol, conn) => {
			//conn.getObservedAddrs(function(err,data){var addr = data[0].toString().split("/");console.log("handling"+addr[addr.length - 1])});
			//console.log(conn);
			//a = conn
			this.requestHandler.initQueryStream(conn);
		});
		node.handle('/UP2P/fileTransfer', (protocol, conn) => {
			this.requestHandler.initFtpStream(conn);
		});
	}
	connectTo(userHash){
		console.log("here n")
		var ma = '/libp2p-webrtc-star/ip4/127.0.0.1/tcp/8134/ws/ipfs/' + userHash;
		this.node.dialByMultiaddr(ma, '/UP2P/queryTransfer', (err,conn) => {
			//conn.getObservedAddrs(function(err,data){var addr = data[0].toString().split("/");console.log("connectingTo"+addr[addr.length - 1])});
			//console.log(conn);
			//b = conn
			if(err){console.error(err);return;}
			//console.error("here2")
			conn.getObservedAddrs(function(err,data){var addr = data[0].toString().split("/");console.log("connectingTo"+addr[addr.length - 1])});
			this.requestHandler.initQueryStream(conn);
		});
		this.node.dialByMultiaddr(ma, '/UP2P/fileTransfer', (err,conn) => {
			if(err){
				console.error(err);
				return;
		//		console.log("here1")
			}
		//	console.log("here2")
		//	conn.getObservedAddrs(function(err,data){var addr = data[0].toString().split("/");console.log("connectingTo"+addr[addr.length - 1])});
			this.requestHandler.initFtpStream(conn);
		});
	}

	disconnectFrom(userHash){
		var self = this;
		var ma = '/libp2p-webrtc-star/ip4/127.0.0.1/tcp/8134/ws/ipfs/' + userHash;
		this.node.hangUpByMultiaddr(ma,function(err){
			if(err)console.error(err);

		});
		//TODO: REMOVE THE FOLLOWING TWO LINES WHEN HANGUP BUG IS FIXED
		delete this.node.swarm.muxedConns[userHash] 
		this.requestHandler.disconnectConnection(userHash);
	}
	sendQuery(query){
		return this.requestHandler.buildAndSendQuery(query);
	}
	sendFileRequest(file, user){
		return this.requestHandler.buildAndSendFileRequest(file, user);
	}
}


	//var activeFtpConnections = {};
	//protocol='/UP2P/fileTransfer'+fileHash;
	//node.handle(protocol, (proto, conn) => {
	//	var filePusher = stream.pullPushable();
	//	initFileStream(filePusher, conn, fileTransferProtocolHandler, streamEndCallback);
	//	conn.getObservedAddrs(function(err,data){var addr = data[0].toString().split("/");activeFtpConnections[addr[addr.length - 1]]={push:filePusher.push,currentlyActiveProtocol:protocol}});
	//});
	//	node.dialByMultiaddr(ma, protocol, function(err,conn){
	//	if(err)console.error(err);
	//	var filePusher = stream.pullPushable();
	//	initFileStream(filePusher, conn, fileTransferProtocolHandler, streamEndCallback);
	//	conn.getObservedAddrs(function(err,data){var addr = data[0].toString().split("/");activeFtpConnections[addr[addr.length - 1]]={push:filePusher.push,currentlyActiveProtocol:protocol}});
	//});
	//node.hangUpByMultiaddr(ma, (err)=>{
	//	if(err)console.error(err);
	//});
	//function fileTransferProtocolHandler(data){
	//TODO: IMPLEMENT FILE TRANSFER PROTOCOL HANDLER 1.RECEIVE FILE 2.STORE FILE
	//console.log(data);
	//}
	//function disconnectFtpConnecttion(userHash){
	//	if(activeFtpConnections[userHash])activeFtpConnections[userHash].end();
	//	delete activeFtpConnections[userHash];
	//}