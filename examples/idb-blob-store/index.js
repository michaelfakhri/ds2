config = new IdbPullBlobStore("config");
pusher = new stream.pullPushable()

config.db.config.clear();
config.exists("config",function(err,data){console.log(data)});
stream.pull(
	stream.once(JSON.stringify({id:"1",priv:"2",pub:"3"})),
	config.write('config',function(err){if(err)console.log(err)}))
//stream.once(JSON.stringify({id:"1",priv:"2",pub:"3"}));
setTimeout(function(){config.exists("config",function(err,data){
	console.log(data)
	stream.pull(
		config.read("config",function(data,err){console.log(data)}),
		stream.pullDecode(),
		stream.drain()
	)
})},1000);