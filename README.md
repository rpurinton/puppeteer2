# Puppeteer2 Server

Puppeteer2 is a Node.js server that uses Puppeteer to provide a web scraping API. It allows users to send POST requests with JSON payloads to interact with web pages and retrieve data in various formats.

## Features

- Accepts POST requests with `application/json` content type.
- Supports navigation to URLs with optional custom HTTP methods, post data, content type, and headers.
- Returns data in different formats based on the `responseType` specified: `text`, `html`, `textWithLinks`, `textWithImages`, `textLinksImages`.

## Usage

Send a POST request to `http://<server-ip>:5469` with a JSON payload containing the `url` property and optional parameters. The server will process the request and return the extracted data from the web page.

Example request using curl:
```bash
curl -X POST http://<server-ip>:5469 -H "Content-Type: application/json" -d '{"url": "https://example.com", "responseType": "text"}'
```

## Installation

Clone the repository and navigate to the `puppeteer2` directory. Run `npm install` to install dependencies. Set up the `puppeteer2.service` file in `/etc/systemd/system/` to run the server as a service.

## Security

The server runs under the `puppeteer` user with limited privileges for security. It uses a headless Chromium browser to minimize exposure.

## Contributing

Contributions are welcome. Please submit pull requests to the master branch.

## License

Puppeteer2 is open-source software licensed under the MIT license.# Puppeteer2 Server

Puppeteer2 is a Node.js server that uses Puppeteer to provide a web scraping API. It allows users to send POST requests with JSON payloads to interact with web pages and retrieve data in various formats.

## Features

- Accepts POST requests with `application/json` content type.
- Supports navigation to URLs with optional custom HTTP methods, post data, content type, and headers.
- Returns data in different formats based on the `responseType` specified: `text`, `html`, `textWithLinks`, `textWithImages`, `textLinksImages`.

## Usage

Send a POST request to `http://<server-ip>:5469` with a JSON payload containing the `url` property and optional parameters. The server will process the request and return the extracted data from the web page.

Example request using curl:
```bash
curl -X POST http://<server-ip>:5469 -H "Content-Type: application/json" -d '{"url": "https://example.com", "responseType": "text"}'
```

### Examples

#### GET Request

To perform a GET request, simply omit the `method` and `postData` fields in the JSON payload:

```bash
curl -X POST http://<server-ip>:5469 -H "Content-Type: application/json" -d '{"url": "https://example.com", "responseType": "html"}'
```

#### POSTing JSON

To send a POST request with JSON data:

```bash
curl -X POST http://<server-ip>:5469 -H "Content-Type: application/json" -d '{"url": "https://api.example.com/data", "method": "POST", "postData": "{\"key\": \"value\"}", "responseType": "json"}'
```

#### POSTing www-encoded

To send a POST request with URL-encoded form data:

```bash
curl -X POST http://<server-ip>:5469 -H "Content-Type: application/json" -d '{"url": "https://api.example.com/submit", "method": "POST", "postData": "key=value&anotherKey=anotherValue", "contentType": "application/x-www-form-urlencoded", "responseType": "text"}'
```

#### Custom Headers

To include custom headers in the request:

```bash
curl -X POST http://<server-ip>:5469 -H "Content-Type: application/json" -d '{"url": "https://example.com", "headers": {"X-Custom-Header": "value"}, "responseType": "text"}'
```

#### Response Types

- `text`: Returns the text content of the page.
- `html`: Returns the full HTML content of the page.
- `textWithLinks`: Returns the text content along with an array of all links on the page.
- `textWithImages`: Returns the text content along with an array of all image sources on the page.
- `textLinksImages`: Returns the text content, an array of all links, and an array of all image sources on the page.

## Installation

Clone the repository and navigate to the `puppeteer2` directory. Run `npm install` to install dependencies. Set up the `puppeteer2.service` file in `/etc/systemd/system/` to run the server as a service.

## Security

The server runs under the `puppeteer` user with limited privileges for security. It uses a headless Chromium browser to minimize exposure.

## Contributing

Contributions are welcome. Please submit pull requests to the master branch.

## License

Puppeteer2 is open-source software licensed under the MIT license.