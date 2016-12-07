file = new IdbPullBlobStore("file");
pusher = new stream.pullPushable()
window.onload = function(){
document.getElementById('files').addEventListener('change', fileTester, false);}
file.exists("file",function(err,exists){console.log("existsAtStart="+exists)});
function fileTester(event){
	console.log(event.target.files[0])
		var reader = new FileReader();
		reader.onload =function (){
			entry = reader.result;
				stream.pull(
					stream.once(entry),
					//stream.log(),
					file.write("file",function(err){if(err)console.error(err);executeGet(event.target.files[0].name)}))
		}
		data = reader.readAsArrayBuffer(event.target.files[0])
	}

setTimeout(function(){file.exists("file",function(err,data){
	console.log(data)
	stream.pull(
		file.read("file",function(data,err){console.log(data)}),
		stream.drain()
	)
})},1000);

function executeGet(name){
		stream.pull(
		file.read("file",function(data,err){
			console.log(data)
			var blob = new Blob([entry.content],{type: "application/octet-stream"});
			var objectUrl = URL.createObjectURL(blob);
			saveToDisk(objectUrl,name)}),
		stream.log())
		//stream.drain())	
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