window.onload= function(){
	db = new Dexie("testDexie");
	db.version(1).stores({
		config: '&key,&id,&priv,&pub'
	});
	db.open().catch(function (e) {
			alert ("Open failed: " + e);
		});
		
	db.config.clear();
	db.config.add({key:"config",id:"1",priv:"2",pub:"3"}).catch(function (e) {
			alert ("Open failed: " + e);
		});
	db.config
	.where('key')
    .equals("config")
	//.toArray()
	.each(function(config) {
        console.log("config:",config);
    }).catch(function (e) {
			alert ("Open failed: " + e);
		});
}