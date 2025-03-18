const express = require("express");
const axios = require("axios");
const puppeteer = require("puppeteer");
const fs = require("fs");
const UserAgent = require("user-agents");

const app = express();
const port = 3000;
let activeIntervals = new Map();
let failedAttempts = new Map();

app.use(express.json());

// **Proxy List**
const proxyList = [
    "http://51.158.68.26:8811",  // France
    "http://103.152.232.90:3125", // Indonesia
    "http://165.227.220.35:80",  // USA
    "http://134.209.29.120:3128", // UK
    "http://95.217.19.194:3128",  // Germany
    "http://168.119.138.128:3128" // Netherlands
];

// **Load URLs**
function loadUrls() {
    try {
        const data = fs.readFileSync("urls.json", "utf8");
        return JSON.parse(data).urls || [];
    } catch (error) {
        console.error("Error reading urls.json:", error);
        return [];
    }
}

// **Save URLs**
function saveUrls(urls) {
    try {
        fs.writeFileSync("urls.json", JSON.stringify({ urls }, null, 4));
    } catch (error) {
        console.error("Error saving urls.json:", error);
    }
}

// **Generate Headers**
function getHeaders(url) {
    return {
        "User-Agent": new UserAgent().toString(),
        "Referer": url,
        "Cache-Control": "no-cache",
        "Accept-Language": "en-US,en;q=0.9",
    };
}

// **Get Random Interval (5-15 sec)**
function getRandomInterval() {
    return Math.floor(Math.random() * (15000 - 5000 + 1)) + 5000;
}

// **Ping URL with Proxy & No-Proxy Fallback**
async function pingUrl(url) {
    let proxy = proxyList[Math.floor(Math.random() * proxyList.length)];
    let failCount = failedAttempts.get(url) || 0;

    if (failCount >= 5) {
        console.log(`⏳ Skipping ${url} (Too many failures)`);
        return;
    }

    try {
        await axios({
            method: "GET",
            url: url,
            headers: getHeaders(url),
            proxy: {
                host: proxy.split(":")[1].replace("//", ""),
                port: proxy.split(":")[2]
            },
            timeout: 5000
        });
        console.log(`[✔] GET ${url} via ${proxy}`);
        failedAttempts.set(url, 0);
    } catch (error) {
        console.log(`[❌] Failed GET ${url} via ${proxy}, trying No-Proxy...`);
        try {
            await axios.get(url, { headers: getHeaders(url), timeout: 5000 });
            console.log(`[✔] GET ${url} (No Proxy)`);
            failedAttempts.set(url, 0);
        } catch (err) {
            failedAttempts.set(url, failCount + 1);
            console.log(`[❌] Total Failures: ${failCount + 1}. Retrying in 5 sec...`);
            setTimeout(() => pingUrl(url), 5000);
        }
    }
}

// **Puppeteer Browser Simulation**
async function visitSite(url) {
    try {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.setUserAgent(new UserAgent().toString());
        await page.goto(url, { waitUntil: "networkidle2", timeout: 10000 });
        console.log(`[✔] Visited ${url} via Puppeteer`);
        await browser.close();
    } catch (error) {
        console.log(`[❌] Failed to visit ${url} via Puppeteer.`);
    }
}

// **Start Pinging**
function startPinging() {
    const urls = loadUrls();
    activeIntervals.forEach(clearInterval);
    activeIntervals.clear();

    urls.forEach((url) => {
        const intervalTime = getRandomInterval();
        const interval = setInterval(async () => {
            await pingUrl(url);
            if (Math.random() > 0.5) await visitSite(url); // 50% chance to simulate user
        }, intervalTime);
        activeIntervals.set(url, interval);
        console.log(`[⚡] Started pinging ${url} every ${intervalTime / 1000} sec`);
    });

    console.log("✅ Ping system started!");
}

// **Routes**
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

// **Add URL**
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

// **Remove URL**
app.post("/remove", (req, res) => {
    const { url } = req.body;

    if (!url || typeof url !== "string") {
        return res.status(400).json({ error: "Invalid URL" });
    }

    let urls = loadUrls();
    if (!urls.includes(url)) {
        return res.status(404).json({ error: "URL not found" });
    }

    urls = urls.filter((u) => u !== url);
    saveUrls(urls);

    if (activeIntervals.has(url)) {
        clearInterval(activeIntervals.get(url));
        activeIntervals.delete(url);
    }

    res.json({ message: `✅ Removed and stopped pinging ${url}` });
});

process.on("SIGINT", () => {
    activeIntervals.forEach(clearInterval);
    console.log("❌ Stopped all pings.");
    process.exit();
});

startPinging();
app.listen(port, () => console.log(`🚀 Server running at http://localhost:${port}`));
