# Puppeteer2

Puppeteer2 is a complete rewrite of the original Puppeteer project, now purely in Node.js. This version introduces a more streamlined and efficient approach to web scraping by running an HTTP server that listens on a free port continuously.

## Features

- HTTP server that accepts JSON input for scraping requests.
- Processes scraping requests and returns structured data with text and links.
- Runs as a service under the `puppeteer` user, eliminating the need for SSH sessions and PHP-Node.js interoperation.

## Usage

To use Puppeteer2, send a JSON object with the scraping parameters to the server's endpoint. The server will process the request, perform the scraping, and return a JSON response containing the extracted text and links from the target webpage.

## Installation

Instructions for setting up Puppeteer2 as a service will be provided, ensuring it starts automatically and runs under the `puppeteer` user.

## Security

Puppeteer2 is designed with security in mind, running with limited privileges to minimize potential risks.

Stay tuned for further updates and documentation on how to deploy and utilize Puppeteer2 for your web scraping needs.