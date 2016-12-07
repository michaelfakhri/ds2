window.onload= function(){
	setTimeout('executeGet()',7000);
	document.getElementById('files').addEventListener('change', fileTester, false);
	//indexedDB.deleteDatabase("testingDatabase",{ storage: "persistent" });
	request = indexedDB.open("testingDatabase", { version: 1, storage: "persistent" });
	request.onupgradeneeded = function(event) { 
		var db = event.target.result;
		console.log("adding object store")
		// Create an objectStore for this database
		objectStore = db.createObjectStore("testingObjectStore", { keyPath: "id"});
		objectStore.createIndex("fileName", "fileName", { unique: false});
};
	request.onsuccess=function(event){
		console.log("success");
		db=event.target.result;
		db.onerror = function(event) {alert("Database error: " + event.target.errorCode);};
	}
	request.onerror = function(event) {console.log("error",event);};
	function fileTester(event){
		var reader = new FileReader();
		reader.onload =function (){
			entry = {id: 1,
					 fileName: event.target.files[0].fileName,
					 content: reader.result}
			writeAction = db.transaction("testingObjectStore", "readwrite").objectStore("testingObjectStore");
			request=writeAction.put(entry);
			request.onsuccess = function(event) {
				console.log("success write")
				executeGet()
			}
		}
		//data = reader.readAsText(event.target.files[0],'utf8');
		data = reader.readAsDataURL(event.target.files[0])
	}
}

function executeGet(){
	var transaction = db.transaction("testingObjectStore");
	var objectStore = transaction.objectStore("testingObjectStore");
	readAction = objectStore.getAll();
	readAction.onerror = function(event) {
	  console.error(event);
	};
	readAction.onsuccess = function(event) {
	  // Do something with the request.result!
	  console.log("success read")
	  console.log("",readAction);
	  saveToDisk(readAction.result[0].content,"lala.zip");
	};
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