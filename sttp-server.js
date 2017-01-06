"use strict";

const Base64 = require("./base64.js").Base64;

const sttp = require("sttp");

module.exports = function() {


	function stringToBytes(str) {
		let bytes = [];
		for (let i = 0; i < str.length; i++) {
			bytes.push(str.charCodeAt(i));
		}
		return bytes;
	}

	let server = {};
	server.handshakeUrl = "/handshake";
	server.returnRSAForRequest = () => { throw new Error("returnRSAForRequest not set"); };
	server.setAESForRequest = () => { throw new Error("setAESForRequest not set"); };

	server.setupSetAESForRequest = (setAESForRequest) => {
		server.setAESForRequest = setAESForRequest;
		return server;
	};
	
	server.setupGetAESForRequest = (getAESForRequest) => {
		server.getAESForRequest = getAESForRequest;
		return server;
	};

	server.setupGetRSAForRequest = (returnRSAForRequest) => {
		server.returnRSAForRequest = returnRSAForRequest;
		return server;	
	};

	server.setupApp = (app) =>{

		app.use((req, res, next) => {
			console.log("middleware for sttp:" + req.url);
			if (req.url.indexOf(server.handshakeUrl) >= 0) {
				return next();
			}
			let aes = server.getAESForRequest(req);
			let packer = new sttp.DataPacker(aes);
			
			let pack = req.method === "GET" 
				? req.query.pack 
				: req.body.pack;
			pack = Base64.decode(pack);
			let decrypted = packer.unpack(pack);
			req.decrypted = JSON.parse(decrypted);
			
			if (req.method === "GET") {
				req.query = req.decrypted;
			} else {
				req.body = req.decrypted;
			}
			req.prepare = (data) => { return Base64.encode(packer.pack(data)); };
			return next();
		});

		app.get(server.handshakeUrl, (req, res) => {
			let rsaKey = server.returnRSAForRequest(req);
			res.status(200).json({ rsa: rsaKey.public });
		});

		app.post(server.handshakeUrl, (req, res) => {
			let rsaKey = server.returnRSAForRequest(req);
			let packer = new sttp.AuthKeyPacker(rsaKey.private);
			let aesKey = stringToBytes(packer.unpack(req.body.authkey));
			server.setAESForRequest(req, aesKey);
			res.status(200).json({ message:"ok" });
		});

		return server;
	};

	return server;
}();
