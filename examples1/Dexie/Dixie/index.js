window.onload= function(){
	if (navigator.webkitPersistentStorage)
	{
		navigator.webkitTemporaryStorage.queryUsageAndQuota ( 
			function(usedBytes, grantedBytes) {  
				console.log('we are using ', usedBytes, ' of ', grantedBytes, 'bytes');
				navigator.webkitTemporaryStorage.requestQuota(grantedBytes,
					function(allocated){console.log("allocated= "+allocated)},
					function(err){console.error(err)});
    }, 
    function(e) { console.log('Error', e);  }
);
	}
	document.getElementById('files').addEventListener('change', fileTester, false);
	db = new Dexie("testDexie");
	db.version(1).stores({
		files: 'id,fileName,content'
	});
	db.open().catch(function (e) {
			alert ("Open failed: " + e);
		});
	//setTimeout(function(){executeGet()},5000);

	function fileTester(event){
		console.log(JSON.stringify(event.target.files[0]));
		var reader = new FileReader();
		reader.onload =function (){
			entry = {id: 1,
					 fileName: event.target.files[0].fileName,
					 content: reader.result};
					 a = event.target.files[0];
			
				db.files.clear();
				db.files.put(entry).then (function(){
					executeGet()
				});
		}
		//data = reader.readAsText(event.target.files[0],'utf8');
		data = reader.readAsArrayBuffer(event.target.files[0])
	}
}

function executeGet(){
		db.files.get(1).then(function(entry){// Do something with the request.result!
		//console.log("success read")
		//console.log("",entry);
		var blob = new Blob([entry.content],{type: "application/octet-stream"});
        var objectUrl = URL.createObjectURL(blob);
		saveToDisk(objectUrl,"lala.exe");
		})
			  
}

function saveToDisk(fileUrl, fileName) {

	var save = document.createElement('a');
    save.href = fileUrl;
    save.target = '_blank';
    save.download = fileName || fileUrl;

    var download = document.createTextNode("Download");
    save.appendChild(download);

    document.getElementById("downloadFile").appendChild(save);
}