const express = require("express");
const axios = require("axios");
const fs = require("fs");
const UserAgent = require("user-agents");

const app = express();
const port = 3000;
let activeIntervals = new Map();

function loadUrls() {
    try {
        const data = fs.readFileSync("urls.json", "utf8");
        return JSON.parse(data).urls || [];
    } catch (error) {
        console.error("Error reading urls.json:", error);
        return [];
    }
}

// Randomized request headers to simulate real users
function getHeaders(url) {
    return {
        "User-Agent": new UserAgent().toString(),
        "Referer": url,
        "Cache-Control": "no-cache",
        "Accept-Language": "en-US,en;q=0.9",
    };
}

// Random interval between requests (3-7 seconds)
function getRandomInterval() {
    return Math.floor(Math.random() * (7000 - 3000 + 1)) + 3000;
}

// Possible request methods to simulate user behavior
const requestMethods = ["GET", "HEAD", "OPTIONS"];

async function pingUrl(url) {
    const method = requestMethods[Math.floor(Math.random() * requestMethods.length)];

    try {
        await axios({
            method: method,
            url: url,
            headers: getHeaders(url),
        });
        console.log(`[✔] ${method} ${url}`);
    } catch (error) {
        console.log(`[❌] Failed ${method} ${url}, retrying in 5 sec...`);
        setTimeout(() => pingUrl(url), 5000); // Retry after 5 seconds
    }
}

function startPinging() {
    const urls = loadUrls();

    // Clear old intervals
    activeIntervals.forEach(clearInterval);
    activeIntervals.clear();

    urls.forEach((url) => {
        const intervalTime = getRandomInterval();
        const interval = setInterval(() => pingUrl(url), intervalTime);

        activeIntervals.set(url, interval);
        console.log(`[⚡] Started pinging ${url} every ${intervalTime / 1000} sec`);
    });

    console.log("✅ Ping system started!");
}

// Reload URLs from JSON
app.get("/reload", (req, res) => {
    startPinging();
    res.json({ message: "✅ Reloaded URLs from urls.json" });
});

// View active URLs
app.get("/list", (req, res) => {
    res.json({ urls: Array.from(activeIntervals.keys()) });
});

// Stop all pings when shutting down
process.on("SIGINT", () => {
    activeIntervals.forEach(clearInterval);
    console.log("❌ Stopped all pings.");
    process.exit();
});

// Start Pinging on Server Start
startPinging();

app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
