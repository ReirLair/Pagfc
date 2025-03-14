const https = require("https");
const http = require("http");

// Your actual hosted domain (change this to match your deployment URL)
const SELF_URL = "https://pagfc.onrender.com";

// List of websites to ping (including self)
const websites = [
    { 
        url: "https://reaperxxxx-shgsaga.hf.space", 
        method: "POST", 
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "Content-Type": "application/json",
            "Authorization": "Bearer YOUR_API_TOKEN"
        },
        body: JSON.stringify({ action: "ping", time: new Date().toISOString() })
    },
    { 
        url: "https://reaperxxxx-shgsaga.hf.space", 
        method: "POST", 
        headers: {
            "User-Agent": "Mozilla/5.0 (Linux; Android 11)",
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "status=active&timestamp=" + encodeURIComponent(new Date().toISOString())
    },
    { 
        url: SELF_URL,  // Self-ping to keep alive
        method: "GET",
        headers: {
            "User-Agent": "KeepAliveBot/1.0"
        }
    }
];

// Function to ping websites
function pingWebsites() {
    websites.forEach(({ url, method, headers, body }) => {
        const { hostname, path } = new URL(url);
        
        const options = {
            hostname,
            path,
            method,
            headers
        };

        const req = https.request(options, res => {
            console.log(`[${new Date().toISOString()}] Pinged ${url} - Status: ${res.statusCode}`);

            res.on("data", chunk => {
                console.log(`Response: ${chunk.toString()}`);
            });
        });

        req.on("error", err => {
            console.error(`[${new Date().toISOString()}] Error pinging ${url}:`, err.message);
        });

        if (body) req.write(body); // Send body if necessary
        req.end();
    });
}

// Start HTTP server on port 3000
const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Hello");
});

server.listen(3000, () => {
    console.log("Server running on port 3000...");
});

// Ping every 3 seconds
setInterval(pingWebsites, 3000);
