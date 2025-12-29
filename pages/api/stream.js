import fetch from "node-fetch";
import jwt from "jsonwebtoken";

const B2_KEY_ID = process.env.B2_KEY_ID || "005388ef1432aec0000000010";
const B2_APPLICATION_KEY = process.env.B2_APPLICATION_KEY || "K005f6tbx4UCFl2fhp1hEuQcB0kEefo";
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key-change-this";

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

  const data = await response.json();
  cachedAuth = data;
  authExpiry = now + 23 * 60 * 60 * 1000;
  return data;
}

export default async function handler(req, res) {
  try {
    // Token tekshirish
    const token = req.query.token;
    if (!token) {
      return res.status(401).json({ error: "token required" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: "invalid or expired token" });
    }

    const videoUrl = decoded.videoUrl;

    // URL ning qaysi service'ga tegishli ekanligini aniqlash
    const isB2 = videoUrl.includes('backblazeb2.com');

    let headers = {};

    // Agar B2 bo'lsa, authorization kerak
    if (isB2) {
      const b2 = await authenticateB2();
      headers.Authorization = b2.authorizationToken;
    }

    // HEAD metadata olish
    const head = await fetch(videoUrl, {
      method: "HEAD",
      headers
    });

    const size = parseInt(head.headers.get("content-length"));
    const type = head.headers.get("content-type") || "video/mp4";

    if (req.method === "HEAD") {
      res.writeHead(200, {
        "Content-Type": type,
        "Content-Length": size,
        "Accept-Ranges": "bytes"
      });
      return res.end();
    }

    const range = req.headers.range;
    const CHUNK = 5 * 1024 * 1024; // 5MB

    let start = 0;
    let end = Math.min(CHUNK, size - 1);

    if (range) {
      const [s, e] = range.replace(/bytes=/, "").split("-");
      start = parseInt(s);
      end = e ? parseInt(e) : Math.min(start + CHUNK, size - 1);
    }

    if (start >= size) {
      res.writeHead(416, { "Content-Range": `bytes */${size}` });
      return res.end();
    }

    const chunkSize = end - start + 1;

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": type,
      "Cache-Control": "public, max-age=31536000, immutable"
    });

    const streamHeaders = { Range: `bytes=${start}-${end}` };
    
    // B2 uchun authorization qo'shish
    if (isB2) {
      const b2 = await authenticateB2();
      streamHeaders.Authorization = b2.authorizationToken;
    }

    const stream = await fetch(videoUrl, { headers: streamHeaders });
    stream.body.pipe(res);

  } catch (err) {
    console.error("STREAM ERROR:", err.message);
    res.status(500).json({ error: "stream error" });
  }
}