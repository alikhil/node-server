"use strict";

var Base64 = function (){

// private property
	var my = {};
	my._keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

	// public method for encoding
	my.encode = function (input) {
		var output = "";
		var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
		var i = 0;

		input = my.utf8Encode(input);

		while (i < input.length) {

			chr1 = input.charCodeAt(i++);
			chr2 = input.charCodeAt(i++);
			chr3 = input.charCodeAt(i++);

			enc1 = chr1 >> 2;
			enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
			enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
			enc4 = chr3 & 63;

			if (isNaN(chr2)) {
				enc3 = enc4 = 64;
			} else if (isNaN(chr3)) {
				enc4 = 64;
			}

			output = output +
			my._keyStr.charAt(enc1) + my._keyStr.charAt(enc2) +
			my._keyStr.charAt(enc3) + my._keyStr.charAt(enc4);

		}

		return output;
	};

	// public method for decoding
	my.decode = function (input) {
		var output = "";
		var chr1, chr2, chr3;
		var enc1, enc2, enc3, enc4;
		var i = 0;

		input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

		while (i < input.length) {

			enc1 = my._keyStr.indexOf(input.charAt(i++));
			enc2 = my._keyStr.indexOf(input.charAt(i++));
			enc3 = my._keyStr.indexOf(input.charAt(i++));
			enc4 = my._keyStr.indexOf(input.charAt(i++));

			chr1 = (enc1 << 2) | (enc2 >> 4);
			chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
			chr3 = ((enc3 & 3) << 6) | enc4;

			output = output + String.fromCharCode(chr1);

			if (enc3 !== 64) {
				output = output + String.fromCharCode(chr2);
			}
			if (enc4 !== 64) {
				output = output + String.fromCharCode(chr3);
			}

		}

		output = my.utf8Decode(output);

		return output;

	};

	// private method for UTF-8 encoding
	my.utf8Encode = function (string) {
		string = string.replace(/\r\n/g,"\n");
		var utftext = "";

		for (var n = 0; n < string.length; n++) {

			var c = string.charCodeAt(n);

			if (c < 128) {
				utftext += String.fromCharCode(c);
			}
			else if((c > 127) && (c < 2048)) {
				utftext += String.fromCharCode((c >> 6) | 192);
				utftext += String.fromCharCode((c & 63) | 128);
			}
			else {
				utftext += String.fromCharCode((c >> 12) | 224);
				utftext += String.fromCharCode(((c >> 6) & 63) | 128);
				utftext += String.fromCharCode((c & 63) | 128);
			}

		}

		return utftext;
	};

		// private method for UTF-8 decoding
	my.utf8Decode = function (utftext) {
		var string = "";
		var i = 0;
		var c = 0, c2 = 0, c3 = 0;

		while ( i < utftext.length ) {

			c = utftext.charCodeAt(i);

			if (c < 128) {
				string += String.fromCharCode(c);
				i++;
			}
			else if((c > 191) && (c < 224)) {
				c2 = utftext.charCodeAt(i+1);
				string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
				i += 2;
			}
			else {
				c2 = utftext.charCodeAt(i+1);
				c3 = utftext.charCodeAt(i+2);
				string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
				i += 3;
			}

		}
		return string;
	};
	return my;
}();

const client = function(handshakeUrl = "/handshake"){
	
	function stringToBytes(str) {
		var bytes = [];
		for (var i = 0; i < str.length; i++) {
			bytes.push(str.charCodeAt(i));
		}
		return bytes;
	}

	var my = {};
	my.handshake = function() {
		return new Promise((resolve, reject) => {
			$.ajax(handshakeUrl, {
				method:"GET"
			}).done((data) => {
				console.log(`handshake: get ok: ${JSON.stringify(data)}`);
				my.rsaKey = data.rsa;
				var packer = new sttp.AuthKeyPacker(my.rsaKey);
				var aesKey = sttp.keys.generateAESKey(24);
				my.aesKey = stringToBytes(aesKey);
				$.ajax(handshakeUrl, {
					method: "POST",
					data: {authkey: packer.pack(aesKey)}
				}).done((data) => {
					console.log("handshake success: " + JSON.stringify(data));
					resolve();
				}).fail((err) => {
					console.log("handshake failed:" + JSON.stringify(err));
					reject("handshake failed:" + JSON.stringify(err));
				}) ;
			}).fail((err) => {
				console.log("handshake: get failed:" + JSON.stringify(err));
				reject("handshake failed:" + JSON.stringify(err));
			});
			
		});
	};
	
	my.pack = (data) => {
		return new sttp.DataPacker(my.aesKey).pack(data);
	};

	my.unpack = (data) => {
		var packer = new sttp.DataPacker(my.aesKey);
		return packer.unpack(Base64.decode(data));
	};

	my.makeRequest = function(method, url, data) {
		var sent = data;
		var pack = my.pack(sent);
		console.log(pack.length);
		console.log(pack);
		console.log(my.unpack(pack));
		
		return new Promise(function(resolve, reject){
			$.ajax(url, {
				method: method,
				data: {pack: Base64.encode(pack)}
			}).done((data) => {
				console.log(method + ":" +url + " succeeded");
				var dec = my.unpack(data.data);
				resolve(dec);
			}).fail((err) => {
				console.log(method + ":" +url + " failed:"+err);
				reject(err);
			});
		});
		
	};

	return my;
}();