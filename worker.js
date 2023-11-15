addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  if (request.method === 'POST' && request.headers.get('content-type') === 'application/json') {
    try {
      const requestData = await request.json();
      const url = requestData.url;
      if (!url) {
        return new Response(JSON.stringify({ error: 'URL is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      // Additional options (with defaults)
      const method = requestData.method || 'GET';
      const postData = requestData.postData || '';
      const contentType = requestData.contentType || 'application/x-www-form-urlencoded';
      const headers = new Headers(requestData.headers || {});
      const responseType = requestData.responseType || 'text'; // Default to 'text' if not specified

      // Set custom headers if provided
      if (headers) {
        for (let [key, value] of headers.entries()) {
          request.headers.set(key, value);
        }
      }

      // Fetch the target URL
      const fetchResponse = await fetch(url, { method, body: postData, headers: { 'Content-Type': contentType } });
      let data;

      // Extract data based on responseType
      switch (responseType) {
        case 'text':
          data = await fetchResponse.text();
          break;
        case 'html':
          data = await fetchResponse.text();
          break;
        // Add more cases as needed
      }

      // Send response
      return new Response(JSON.stringify({ data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  } else {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }
}