import fetch from "node-fetch";

const B2_KEY_ID = "005388ef1432aec000000000f";
const B2_APPLICATION_KEY = "K005ChhVWS9ULMO2oxsQwcZzJCZw6tk";

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
    const url = req.query.fileName;
    if (!url) return res.status(400).json({ error: "fileName required" });

    const b2 = await authenticateB2();

    // HEAD metadata
    const head = await fetch(url, {
      method: "HEAD",
      headers: { Authorization: b2.authorizationToken }
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

    // DEFAULT: 2MB chunk
    const CHUNK = 2 * 1024 * 1024;

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

    const stream = await fetch(url, {
      headers: {
        Authorization: b2.authorizationToken,
        Range: `bytes=${start}-${end}`
      }
    });

    stream.body.pipe(res);
  } catch (err) {
    console.error("STREAM ERROR:", err.message);
    res.status(500).json({ error: "stream error" });
  }
}
