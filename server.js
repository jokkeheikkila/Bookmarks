// Tiny zero-dependency local server & auto-save endpoint for bookmarks.md
// Usage: node server.js
// Works both when viewing http://localhost:17380 AND when viewing file:///.../index.html!

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 17380;
const DIR = __dirname;
const BOOKMARKS_FILE = path.join(DIR, "bookmarks.md");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".md": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

const server = http.createServer((req, res) => {
  // Allow requests from file:// (null origin) and localhost
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/api/ping") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.method === "POST" && req.url === "/api/save") {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
      try {
        if (!body || !body.includes("window.BOOKMARKS_MD")) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: "Invalid content" }));
          return;
        }
        fs.writeFileSync(BOOKMARKS_FILE, body, "utf8");
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  if (req.method === "GET") {
    const reqPath = req.url.split("?")[0];
    const relPath = reqPath === "/" ? "index.html" : reqPath.replace(/^\/+/, "");
    const fullPath = path.resolve(DIR, relPath);

    // Prevent path traversal outside workspace
    if ((fullPath !== DIR && !fullPath.startsWith(DIR + path.sep)) || !fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const ext = path.extname(fullPath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "text/plain; charset=utf-8",
      "Cache-Control": "no-store"
    });
    res.end(fs.readFileSync(fullPath));
    return;
  }

  res.writeHead(405);
  res.end("Method not allowed");
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Bookmarks server running at http://localhost:${PORT}`);
  console.log(`Auto-saving directly to: ${BOOKMARKS_FILE}`);
});
