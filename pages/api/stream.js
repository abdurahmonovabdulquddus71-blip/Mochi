import fetch from "node-fetch";

// ⚙️ Backblaze B2 sozlamalari
const B2_KEY_ID = "005388ef1432aec000000000f";
const B2_APPLICATION_KEY = "K005ChhVWS9ULMO2oxsQwcZzJCZw6tk";

// 🚀 STREAMING OPTIMIZATSIYA
// Katta chunk = tez stream (2MB - YouTube standart)
const DEFAULT_CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks
const INITIAL_CHUNK_SIZE = 512 * 1024; // 512KB - birinchi chunk tez yuklanish uchun

// 🔐 B2 Auth Cache
let cachedAuth = null;
let authExpiry = 0;

async function authenticateB2() {
  const now = Date.now();
  if (cachedAuth && authExpiry > now) {
    return cachedAuth;
  }

  const auth = Buffer.from(`${B2_KEY_ID}:${B2_APPLICATION_KEY}`).toString("base64");
  
  const response = await fetch("https://api.backblazeb2.com/b2api/v2/b2_authorize_account", {
    method: "GET",
    headers: { Authorization: `Basic ${auth}` },
  });

  if (!response.ok) {
    throw new Error("B2 autentifikatsiya xatosi");
  }

  const authData = await response.json();
  cachedAuth = authData;
  authExpiry = now + (23 * 60 * 60 * 1000); // 23 soat
  
  return authData;
}

// 🎬 ULTRA TEZ VIDEO STREAMING
export default async function handler(req, res) {
  const startTime = Date.now();
  
  // 🔒 FAQAT mochitv.uz dan ruxsat
  const origin = req.headers.origin || req.headers.referer || '';
  const allowedOrigins = [
    'https://mochitv.uz',
    'https://www.mochitv.uz',
    'http://localhost:3000', // Development uchun
    'http://localhost:5173'  // Vite dev server
  ];
  
  const isAllowed = allowedOrigins.some(allowed => origin.includes(allowed.replace(/^https?:\/\//, '')));
  
  // CORS headers
  if (isAllowed) {
    const allowedOrigin = allowedOrigins.find(allowed => origin.includes(allowed.replace(/^https?:\/\//, '')));
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin || origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Authorization');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 🚫 Origin tekshirish (OPTIONS dan tashqari)
  if (!isAllowed && req.method !== 'OPTIONS') {
    console.log('❌ Blocked origin:', origin);
    return res.status(403).json({ error: 'Access denied - only mochitv.uz allowed' });
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const videoUrl = req.query.fileName;

    if (!videoUrl || !videoUrl.startsWith('https://')) {
      return res.status(400).json({ error: "Invalid fileName parameter" });
    }

    // 🔐 B2 auth
    const b2Auth = await authenticateB2();

    // 📊 Video metadata (HEAD request)
    const headResponse = await fetch(videoUrl, {
      method: "HEAD",
      headers: { Authorization: b2Auth.authorizationToken },
    });

    if (!headResponse.ok) {
      return res.status(404).json({ error: "Video not found" });
    }

    const fileSize = parseInt(headResponse.headers.get("content-length") || "0");
    const contentType = headResponse.headers.get("content-type") || "video/mp4";

    // HEAD request uchun
    if (req.method === "HEAD") {
      res.writeHead(200, {
        "Content-Type": contentType,
        "Content-Length": fileSize,
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=86400", // 1 kun
      });
      return res.end();
    }

    // 🎯 RANGE HANDLING - brauzer nima so'rasa shuni berish
    const range = req.headers.range;
    let start = 0;
    let end = fileSize - 1;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      start = parseInt(parts[0], 10);
      
      if (parts[1]) {
        // Brauzer aniq range so'ragan - berish kerak
        end = parseInt(parts[1], 10);
      } else {
        // Brauzer faqat start bergan - oxirigacha yuborish (yoki katta chunk)
        // Agar birinchi request bo'lsa - kichik chunk
        if (start === 0) {
          end = Math.min(start + INITIAL_CHUNK_SIZE - 1, fileSize - 1);
        } else {
          // Keyingi requestlar - katta chunk (tezroq)
          end = Math.min(start + DEFAULT_CHUNK_SIZE - 1, fileSize - 1);
        }
      }
    } else {
      // Range yo'q - birinchi chunk yuborish
      end = Math.min(INITIAL_CHUNK_SIZE - 1, fileSize - 1);
    }

    // Validation
    if (start >= fileSize || start > end || end >= fileSize) {
      res.writeHead(416, { "Content-Range": `bytes */${fileSize}` });
      return res.end();
    }

    const chunkSize = end - start + 1;
    console.log(`📦 Range: ${start}-${end}/${fileSize} (${(chunkSize/1024).toFixed(0)}KB)`);

    // 🎬 B2 dan video chunk olish
    const videoResponse = await fetch(videoUrl, {
      method: "GET",
      headers: {
        Authorization: b2Auth.authorizationToken,
        Range: `bytes=${start}-${end}`,
      },
    });

    if (!videoResponse.ok) {
      return res.status(videoResponse.status).json({ error: "B2 stream error" });
    }

    // 🚀 RESPONSE HEADERS - Bunny.net style
    const responseHeaders = {
      "Content-Type": contentType,
      "Content-Length": chunkSize,
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      
      // Aggressive caching - har bir chunk cache
      "Cache-Control": "public, max-age=31536000, immutable",
      "ETag": `"${fileSize}-${start}-${end}"`,
      
      // Streaming optimizatsiya
      "Connection": "keep-alive",
      "Keep-Alive": "timeout=60, max=1000",
      
      // Additional headers
      "X-Content-Type-Options": "nosniff",
    };

    res.writeHead(206, responseHeaders); // Always 206 for range requests

    // 📺 STREAM - direct pipe (eng tez)
    if (videoResponse.body) {
      const reader = videoResponse.body;
      
      for await (const chunk of reader) {
        // Backpressure handling
        if (!res.write(chunk)) {
          await new Promise(resolve => res.once('drain', resolve));
        }
      }
      
      const duration = Date.now() - startTime;
      const speedMBps = (chunkSize / 1024 / 1024 / (duration / 1000)).toFixed(2);
      console.log(`✅ ${(chunkSize/1024).toFixed(0)}KB in ${duration}ms (${speedMBps}MB/s)`);
    }

    res.end();

  } catch (error) {
    console.error("❌ Error:", error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: "Streaming error" });
    } else {
      res.end();
    }
  }
}