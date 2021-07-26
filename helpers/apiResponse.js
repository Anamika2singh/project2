exports.successResponse = function (res, msg) {
	var data = {
		status: 200,
		message: msg
	};
	return res.status(200).json(data);
};

exports.successResponseWithData = function (res, msg, data) {
	var resData = {
		status: 200,
		message: msg,
		data: data
	};
	return res.status(200).json(resData);
};

exports.successResponseWithExtraData = function(res, msg, extraData,data)
{
	var resData = {
		status: 200,
		message: msg,
		extraData,
		data: data
	};
	return res.status(200).json(resData);
}

exports.successResponseWithNoData = function (res, msg) {
	var resData = {
		status: 200,
		message: msg		
	};
	return res.status(200).json(resData);
};

exports.ErrorResponse = function (res, msg,data) {	
	var data = {
		status: 400,
		message: msg,
		data:data
	};
	return res.status(400).json(data);
};

exports.ErrorResponseWithExtraData = function (res, msg,extradata,data) {	
	var data = {
		status: 400,
		message: msg,
		extraData:extradata,
		data:data
	};
	return res.status(400).json(data);
};

exports.ErrorResponseWithoutData = function (res, msg) {	
	var data = {
		status: 400,
		message: msg		
	};
	return res.status(400).json(data);
};

exports.notFoundResponse = function (res, msg,data) {
	var data = {
		status: 404,
		message: msg,
		data:data
	};
	return res.status(404).json(data);
};

exports.notFoundResponseWithExtraData = function (res, msg,extradata,data) {
	var data = {
		status: 404,
		message: msg,
		extraData:extradata,
		data:data
	};
	return res.status(404).json(data);
};

exports.notFoundResponseWithNoData = function(res, msg)
{
	var data = {
		status: 404,
		message: msg		
	};
	return res.status(404).json(data);
}

exports.validationErrorWithData = function (res, msg, data) {
	var resData = {
		status: 422,
		message: msg,
		data: data
	};
	return res.status(422).json(resData);
};

exports.validationError = function (res, msg) {
	var resData = {
		status: 422,
		message: msg	
	};
	return res.status(422).json(resData);
};

exports.unauthorizedResponse = function (res, msg,data) {
	var data = {
		status: 401,
		message: msg,
		data:data
	};
	return res.status(401).json(data);
};

exports.unauthorizedResponseWithoutData = function (res, msg) {
	var data = {
		status: 401,
		message: msg		
	};
	return res.status(401).json(data);
};