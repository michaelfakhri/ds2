'use strict'
var db;
var entries;
window.onload= function(){
	db = new Dexie("bufferDexie5");
	db.version(1).stores({
		files3: '++,key,data'
	});

	db.open().catch(function (e) {
			alert ("Open failed: " + e);
		});
	db.files3.clear();
	
	var key = "buffered";
	entries = [	new TextEncoder("utf-8").encode(JSON.stringify({identity:1,fileName:"bla1",content:"bla1"})),
					new TextEncoder("utf-8").encode(JSON.stringify({identity:1,fileName:"bla2",content:"bla2"})) ];
	//entries=["hey1","hey2"]
	const blobs = entries.map((data) => ({
					key,
					data}));
					console.log("",blobs);
	db.files3.bulkPut(blobs).then(function(){
			executeGet()
	}).catch(function(e){console.error(e)});
}

function executeGet(){
		var buffered = db.files3
			.where('key')
			.equals('buffered').each((val) => console.log("entry",val))
        .catch((err) => console.log(err))
}