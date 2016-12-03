pusher = new stream.pullPushable();

stream.pull(
	pusher,
	stream.log()
)

// OverWrite a stream
stream.pull(pusher,
			stream.drain(function(d){console.log("data"+d)})
)

pusher.push("1la");
pusher.push("2");
pusher.push("3");
pusher.push("4");
pusher.push("5");