class Request{
	constructor(myId, requestId, queryRequest, ftpRequest){
		const MAXIMUM_TIME_TO_LIVE_QUERY = 5;
		const MAXIMUM_TIME_TO_LIVE_FTP = 1;
		var request = {}		

		if(queryRequest && ftpRequest){
			throw new Error("A request cannot contain both a query and a ftp request");
		} else if(queryRequest){
			request.queryRequest = queryRequest;
			request.ftpRequest = undefined;
			request.timeToLive = MAXIMUM_TIME_TO_LIVE_QUERY;			
		} else if(ftpRequest){
			request.queryRequest = undefined;
			request.ftpRequest = ftpRequest;
			request.timeToLive = MAXIMUM_TIME_TO_LIVE_FTP;				
		}
		request.id = requestId;
		request.response = false;
		request.route = [myId];
		
		return request;
	}
}