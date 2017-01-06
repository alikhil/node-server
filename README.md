# Example of using [sttp](http://github.com/alikhil/sttp) protocol with [express.js](https://expressjs.com/)

### Example


```js
const sttp_server = require("./sttp-server");

// express `app` initialization here

sttp_server.setupGetRSAForRequest((req) => {
    // method for marching corresponding RSA key for request
	let ip = getIP(req);
	if (ipToRSA[ip] === undefined) {
		ipToRSA[ip] = sttp.keys.generateRSAKey();
	}
	return ipToRSA[ip];
}).setupSetAESForRequest((req, aes) => {
    // method for setting AES key to corresponding request
	let ip = getIP(req);
	ipToAES[ip] = aes;	
}).setupGetAESForRequest((req) => {
    // method for marching corresponding AES key for request
	let ip = getIP(req);
	return ipToAES[ip];
}).setupApp(app);

```

Look into `sttp-server.js` and `sttp_client.js` files and their usage in `app.js` and `index.html`.

More STTP documentation [here](http://github.com/alikhil/sttp).

### Quick start
```sh
git clone https://github.com/alikhil/sttp-example/
cd sttp-example
npm install
node app.js
```
