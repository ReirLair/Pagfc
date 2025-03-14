const https = require("https");
const http = require("http");

// Your actual hosted domain (change this to match your deployed URL)
const SELF_URL = "https://pagfc.onrender.com";

// Random User-Agents to mimic different browsers
const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/115.0",
    "Mozilla/5.0 (Linux; Android 11; SM-G998U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 15_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Firefox/91.0"
];

// List of websites to ping (including self)
const websites = [
    "https://reaperxxxx-shgsaga.hf.space",
    "https://reaperxxxx-shgsaga.hf.space",
    SELF_URL // Self-ping to keep alive
];

// Function to send a GET request with a random User-Agent
function pingWebsite(url) {
    const { hostname, path } = new URL(url);

    const options = {
        hostname,
        path,
        method: "GET",
        headers: {
            "User-Agent": userAgents[Math.floor(Math.random() * userAgents.length)]
        }
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

    req.end();
}

// Function to schedule pings at random intervals (1-5 seconds)
function schedulePings() {
    websites.forEach(url => {
        const randomInterval = Math.floor(Math.random() * 4000) + 1000; // Random 1000-5000ms (1-5s)
        setTimeout(() => {
            pingWebsite(url);
            schedulePings(); // Schedule next ping recursively
        }, randomInterval);
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

// Start pinging
schedulePings();
