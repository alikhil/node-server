"use strict";

const fs = require("fs");
const express = require("express");
const app = express();
const sttp = require("sttp");
const readline = require('readline');

const sttp_server = require("./sttp-server");
const bodyParser = require("body-parser");

let ipToRSA = {};
let ipToAES = {};
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.get("/sttp.js", function(req, res) {
	res.sendFile(__dirname + "/node_modules/sttp/bundle.sttp.js");
});

app.use("/base64", express.static(__dirname + "/node_modules/js-base64/"));
app.use("/bootstrap", express.static(__dirname + "/node_modules/bootstrap/dist/"));
app.use("/public", express.static(__dirname + "/public/"));

app.get("/", function (req, res) {
	res.sendFile(__dirname + "/public/index.html");
});

function getIP(req) {
	return req.headers["x-forwarded-for"] || req.connection.remoteAddress;
}

// setup STTP middleware

sttp_server.setupGetRSAForRequest((req) => {
	let ip = getIP(req);
	if (ipToRSA[ip] === undefined) {
		ipToRSA[ip] = sttp.keys.generateRSAKey();
	}
	return ipToRSA[ip];
}).setupSetAESForRequest((req, aes) => {
	let ip = getIP(req);
	ipToAES[ip] = aes;	
}).setupGetAESForRequest((req) => {
	let ip = getIP(req);
	return ipToAES[ip];
}).setupApp(app);

     
app.use("/search", function (req, res) {

	let query = req.decrypted.search_query; // instead of req.query.search_query || req.body.search_query;

	const rl = readline.createInterface({
		input: fs.createReadStream("data.txt")
	});
 
	let results = ["used:" + req.method];

	rl.on("line", function (line) {
		if (line.indexOf(query) >= 0) {
			results.push(line);
		}
	});
	rl.on("close", () => {
		if (results.length === 1) {
			results = ["Nothing found or some shit happen"];
		}
		// encrypt sending data
		let resToSend = req.prepare(results);
			
		res.send({data:resToSend});
	});
	
});


app.listen(3000, function () {
	console.log("Example app listening on port 3000!");
});