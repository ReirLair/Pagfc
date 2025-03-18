const express = require("express");
const axios = require("axios");
const fs = require("fs");
const UserAgent = require("user-agents");

const app = express();
const port = 3000;
let activeIntervals = new Map();

app.use(express.json()); // Middleware to parse JSON request bodies

const proxyList = [
    "http://51.158.68.26:8811", // France
    "http://103.152.232.90:3125", // Indonesia
    "http://165.227.220.35:80", // USA
    "http://134.209.29.120:3128", // UK
    "http://95.217.19.194:3128", // Germany
    "http://168.119.138.128:3128" // Netherlands
];

function loadUrls() {
    try {
        const data = fs.readFileSync("urls.json", "utf8");
        return JSON.parse(data).urls || [];
    } catch (error) {
        console.error("Error reading urls.json:", error);
        return [];
    }
}

function saveUrls(urls) {
    try {
        fs.writeFileSync("urls.json", JSON.stringify({ urls }, null, 4));
    } catch (error) {
        console.error("Error saving urls.json:", error);
    }
}

function getHeaders(url) {
    return {
        "User-Agent": new UserAgent().toString(),
        "Referer": url,
        "Cache-Control": "no-cache",
        "Accept-Language": "en-US,en;q=0.9",
    };
}

function getRandomInterval() {
    return Math.floor(Math.random() * (7000 - 3000 + 1)) + 3000;
}

const requestMethods = ["GET", "HEAD", "OPTIONS"];

async function pingUrl(url) {
    const method = requestMethods[Math.floor(Math.random() * requestMethods.length)];
    const proxy = proxyList[Math.floor(Math.random() * proxyList.length)];

    try {
        await axios({
            method: method,
            url: url,
            headers: getHeaders(url),
            proxy: {
                host: proxy.split(":")[1].replace("//", ""),
                port: proxy.split(":")[2]
            }
        });
        console.log(`[✔] ${method} ${url} via ${proxy}`);
    } catch (error) {
        console.log(`[❌] Failed ${method} ${url} via ${proxy}, retrying in 5 sec...`);
        setTimeout(() => pingUrl(url), 5000);
    }
}

function startPinging() {
    const urls = loadUrls();
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

app.get("/", (req, res) => {
    res.send(`
        <html>
            <head>
                <title>Ping Server</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                    h1 { color: #333; }
                </style>
            </head>
            <body>
                <h1>Ping Server is Running 🚀</h1>
                <p>Keeping your sites awake from multiple locations...</p>
                <a href="/list">View Active URLs</a> | <a href="/reload">Reload URLs</a>
            </body>
        </html>
    `);
});

app.get("/reload", (req, res) => {
    startPinging();
    res.json({ message: "✅ Reloaded URLs from urls.json" });
});

app.get("/list", (req, res) => {
    res.json({ urls: Array.from(activeIntervals.keys()) });
});

// **New Route: Add URL**
app.post("/add", (req, res) => {
    const { url } = req.body;

    if (!url || typeof url !== "string") {
        return res.status(400).json({ error: "Invalid URL" });
    }

    const urls = loadUrls();
    if (urls.includes(url)) {
        return res.json({ message: "URL already exists" });
    }

    urls.push(url);
    saveUrls(urls);
    startPinging();

    res.json({ message: `✅ Added and started pinging ${url}` });
});

process.on("SIGINT", () => {
    activeIntervals.forEach(clearInterval);
    console.log("❌ Stopped all pings.");
    process.exit();
});

startPinging();
app.listen(port, () => console.log(`🚀 Server running at http://localhost:${port}`));
