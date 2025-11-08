import fetch from "node-fetch";

// ⚙️ Backblaze B2 sozlamalari
const B2_KEY_ID = "005388ef1432aec000000000f";
const B2_APPLICATION_KEY = "K005ChhVWS9ULMO2oxsQwcZzJCZw6tk";

// 🚀 OPTIMALLASHTIRILGAN CHUNK SIZE
// YouTube kabi tez yuklash uchun kichikroq qismlar
const OPTIMAL_CHUNK_SIZE = 256 * 1024; // 256KB - tezkor boshlanish
const MAX_CHUNK_SIZE = 2 * 1024 * 1024; // 2MB - maksimal

// 🔐 B2 autentifikatsiya (cache bilan)
let cachedAuth = null;
let authExpiry = 0;

async function authenticateB2() {
  // Cache'dan foydalanish - har safar auth qilmaslik
  const now = Date.now();
  if (cachedAuth && authExpiry > now) {
    console.log("✅ Using cached B2 auth");
    return cachedAuth;
  }

  const auth = Buffer.from(`${B2_KEY_ID}:${B2_APPLICATION_KEY}`).toString("base64");
  
  const response = await fetch("https://api.backblazeb2.com/b2api/v2/b2_authorize_account", {
    method: "GET",
    headers: { Authorization: `Basic ${auth}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ B2 auth error:", errorText);
    throw new Error("B2 autentifikatsiya xatosi");
  }

  const authData = await response.json();
  
  // 23 soat cache (token 24 soat amal qiladi)
  cachedAuth = authData;
  authExpiry = now + (23 * 60 * 60 * 1000);
  
  console.log("✅ New B2 auth token obtained");
  return authData;
}

// 📹 ULTRA TEZ VIDEO STREAMING
export default async function handler(req, res) {
  const startTime = Date.now();
  
  // 🚀 CORS headers - barcha brauzerlarga ruxsat
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Authorization');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const videoUrl = req.query.fileName;

    if (!videoUrl) {
      console.error("❌ fileName parametri yo'q");
      return res.status(400).json({ error: "fileName parametri kerak" });
    }

    console.log("🎬 Video request:", videoUrl.substring(0, 80) + "...");

    // URL validatsiya
    if (!videoUrl.startsWith('https://')) {
      console.error("❌ Noto'g'ri URL format");
      return res.status(400).json({ error: "Video URL https:// bilan boshlanishi kerak" });
    }

    // 🔐 B2 autentifikatsiya (cached)
    const b2Auth = await authenticateB2();

    // 📊 Video meta ma'lumotlarini olish (HEAD request - juda tez)
    const headResponse = await fetch(videoUrl, {
      method: "HEAD",
      headers: {
        Authorization: b2Auth.authorizationToken,
      },
    });

    if (!headResponse.ok) {
      console.error("❌ Video topilmadi:", headResponse.status);
      return res.status(404).json({ error: "Video topilmadi" });
    }

    const contentLength = parseInt(headResponse.headers.get("content-length") || "0");
    const contentType = headResponse.headers.get("content-type") || "video/mp4";

    console.log(`📊 Video: ${(contentLength / 1024 / 1024).toFixed(2)}MB (${contentType})`);

    // HEAD request uchun
    if (req.method === "HEAD") {
      res.writeHead(200, {
        "Content-Type": contentType,
        "Content-Length": contentLength,
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=31536000", // 1 yil cache
      });
      return res.end();
    }

    // 🎯 Range parsing - video playerlar uchun
    const range = req.headers.range;
    let start = 0;
    let end = contentLength - 1;
    let statusCode = 200;

    if (range) {
      // 📦 PARTIAL CONTENT - qismlar bo'lib yuklash
      const parts = range.replace(/bytes=/, "").split("-");
      start = parseInt(parts[0], 10);
      
      // Agar end ko'rsatilgan bo'lsa
      if (parts[1]) {
        end = parseInt(parts[1], 10);
      } else {
        // Aks holda optimal chunk size
        end = Math.min(start + OPTIMAL_CHUNK_SIZE - 1, contentLength - 1);
      }

      // Validation
      if (start >= contentLength) {
        res.writeHead(416, {
          "Content-Range": `bytes */${contentLength}`,
        });
        return res.end();
      }

      if (end >= contentLength) {
        end = contentLength - 1;
      }

      if (start > end) {
        return res.status(416).end();
      }

      statusCode = 206;
      const chunkKB = ((end - start + 1) / 1024).toFixed(2);
      console.log(`📦 Chunk: ${start}-${end} (${chunkKB}KB)`);
    } else {
      // Range bo'lmasa ham kichik qism yuborish (tezroq boshlanish)
      end = Math.min(OPTIMAL_CHUNK_SIZE - 1, contentLength - 1);
      statusCode = 206;
      console.log(`🚀 Initial chunk: 0-${end} (${(end / 1024).toFixed(2)}KB)`);
    }

    const chunkSize = end - start + 1;

    // 🎬 B2 dan video qismini olish
    const videoResponse = await fetch(videoUrl, {
      method: "GET",
      headers: {
        Authorization: b2Auth.authorizationToken,
        Range: `bytes=${start}-${end}`,
      },
    });

    if (!videoResponse.ok) {
      console.error("❌ B2 stream error:", videoResponse.status);
      return res.status(500).json({ error: "Video stream xatosi" });
    }

    // 🚀 OPTIMAL RESPONSE HEADERS
    const headers = {
      "Content-Type": contentType,
      "Accept-Ranges": "bytes",
      "Content-Range": `bytes ${start}-${end}/${contentLength}`,
      "Content-Length": chunkSize,
      
      // Cache strategiyasi - tez yuklash uchun
      "Cache-Control": "public, max-age=31536000, immutable",
      "ETag": `"${contentLength}-${start}-${end}"`,
      
      // Connection optimizatsiyasi
      "Connection": "keep-alive",
      "Keep-Alive": "timeout=5, max=100",
      
      // Compression (agar kerak bo'lsa)
      "Vary": "Accept-Encoding",
    };

    res.writeHead(statusCode, headers);

    // 📺 STREAM QILISH - backpressure bilan
    if (videoResponse.body) {
      let bytesStreamed = 0;
      const reader = videoResponse.body;
      
      for await (const chunk of reader) {
        bytesStreamed += chunk.length;
        
        // Backpressure handling - buffer to'lsa kutish
        if (!res.write(chunk)) {
          await new Promise(resolve => res.once('drain', resolve));
        }
        
        // Progress log (har 100KB da)
        if (bytesStreamed % (100 * 1024) < chunk.length) {
          const progress = ((bytesStreamed / chunkSize) * 100).toFixed(1);
          console.log(`⚡ Streaming: ${progress}%`);
        }
      }
      
      const duration = Date.now() - startTime;
      const speed = (bytesStreamed / 1024 / (duration / 1000)).toFixed(2);
      console.log(`✅ Stream complete: ${(bytesStreamed / 1024).toFixed(2)}KB in ${duration}ms (${speed}KB/s)`);
    }

    res.end();

  } catch (error) {
    console.error("❌ Stream error:", error);
    if (!res.headersSent) {
      return res.status(500).json({ 
        error: "Video streaming xatosi", 
        details: error.message 
      });
    }
    res.end();
  }
}