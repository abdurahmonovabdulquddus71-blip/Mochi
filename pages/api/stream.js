import fetch from "node-fetch";

// ⚙️ Backblaze B2 sozlamalari
const B2_KEY_ID = "005388ef1432aec000000000f";
const B2_APPLICATION_KEY = "K005ChhVWS9ULMO2oxsQwcZzJCZw6tk";

// 🔐 B2 Auth Cache
let cachedAuth = null;
let authExpiry = 0;

async function authenticateB2() {
  const now = Date.now();
  if (cachedAuth && authExpiry > now) return cachedAuth;

  const auth = Buffer.from(`${B2_KEY_ID}:${B2_APPLICATION_KEY}`).toString("base64");

  const response = await fetch("https://api.backblazeb2.com/b2api/v2/b2_authorize_account", {
    method: "GET",
    headers: { Authorization: `Basic ${auth}` },
  });

  if (!response.ok) throw new Error("B2 autentifikatsiya xatosi");

  const authData = await response.json();
  cachedAuth = authData;
  authExpiry = now + 23 * 60 * 60 * 1000; // 23 soat
  return authData;
}

export default async function handler(req, res) {
  const startTime = Date.now();

  // 🔒 Origin tekshirish
  const origin = req.headers.origin || req.headers.referer || '';
  const allowedOrigins = [
    'https://mochitv.uz',
    'https://www.mochitv.uz',
    'http://localhost:3000',
    'http://localhost:5173'
  ];

  const isAllowed = allowedOrigins.some(a => origin.includes(a.replace(/^https?:\/\//, '')));
  if (isAllowed) {
    const allowedOrigin = allowedOrigins.find(a => origin.includes(a.replace(/^https?:\/\//, '')));
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin || origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Authorization');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length, Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!isAllowed && req.method !== 'OPTIONS') return res.status(403).json({ error: 'Access denied' });
  if (!["GET","HEAD"].includes(req.method)) return res.status(405).json({ error: "Method not allowed" });

  try {
    const videoUrl = req.query.fileName;
    if (!videoUrl || !videoUrl.startsWith('https://')) return res.status(400).json({ error: "Invalid fileName" });

    // 🔐 B2 auth
    const b2Auth = await authenticateB2();

    // 📊 Video metadata
    const headResp = await fetch(videoUrl, { method: "HEAD", headers: { Authorization: b2Auth.authorizationToken } });
    if (!headResp.ok) return res.status(404).json({ error: "Video not found" });

    const fileSize = parseInt(headResp.headers.get("content-length") || "0");
    const contentType = headResp.headers.get("content-type") || "video/mp4";

    // HEAD request uchun
    if (req.method === "HEAD") {
      res.writeHead(200, {
        "Content-Type": contentType,
        "Content-Length": fileSize,
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=86400"
      });
      return res.end();
    }

    // 🎯 RANGE
    const range = req.headers.range;
    let start = 0;
    let end = fileSize - 1;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      start = parseInt(parts[0], 10);
      end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + 10 * 1024 * 1024 - 1, fileSize - 1); // 10MB chunk
    } else {
      end = Math.min(10 * 1024 * 1024 - 1, fileSize - 1);
    }

    if (start >= fileSize || start > end || end >= fileSize) {
      res.writeHead(416, { "Content-Range": `bytes */${fileSize}` });
      return res.end();
    }

    const chunkSize = end - start + 1;
    console.log(`📦 Streaming bytes ${start}-${end}/${fileSize}`);

    // 🎬 B2 stream
    const videoResponse = await fetch(videoUrl, {
      method: "GET",
      headers: {
        Authorization: b2Auth.authorizationToken,
        Range: `bytes=${start}-${end}`
      }
    });

    if (!videoResponse.ok) return res.status(videoResponse.status).json({ error: "B2 stream error" });

    const responseHeaders = {
      "Content-Type": contentType,
      "Content-Length": chunkSize,
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Connection": "keep-alive",
      "X-Content-Type-Options": "nosniff",
    };

    res.writeHead(206, responseHeaders);

    // 🚀 Direct pipe bilan tezroq
    videoResponse.body.pipe(res);

    videoResponse.body.on('end', () => {
      const duration = Date.now() - startTime;
      const speedMBps = (chunkSize / 1024 / 1024 / (duration / 1000)).toFixed(2);
      console.log(`✅ ${chunkSize/1024}KB in ${duration}ms (${speedMBps}MB/s)`);
    });

    videoResponse.body.on('error', err => {
      console.error("❌ Stream error:", err.message);
      if (!res.headersSent) res.status(500).end();
      else res.end();
    });

  } catch (err) {
    console.error("❌ Error:", err.message);
    if (!res.headersSent) res.status(500).json({ error: "Streaming error" });
    else res.end();
  }
}
