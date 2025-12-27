import { Buffer } from 'buffer';

const B2_KEY_ID = "005388ef1432aec000000000f";
const B2_APPLICATION_KEY = "K005ChhVWS9ULMO2oxsQwcZzJCZw6tk";

const ALLOWED_DOMAIN = "mochitv.uz";
const ALLOWED_B2_HOST = "backblazeb2.com";

let cachedAuth = null;
let authExpiry = 0;

async function authenticateB2() {
  const now = Date.now();
  if (cachedAuth && authExpiry > now) return cachedAuth;

  const auth = Buffer.from(`${B2_KEY_ID}:${B2_APPLICATION_KEY}`).toString("base64");

  const response = await fetch(
    "https://api.backblazeb2.com/b2api/v2/b2_authorize_account",
    {
      method: "GET",
      headers: { Authorization: `Basic ${auth}` },
    }
  );

  const data = await response.json();
  cachedAuth = data;
  authExpiry = now + 23 * 60 * 60 * 1000;
  return data;
}

export default {
  async fetch(req, env, ctx) {
    try {
      /* ================== DOMAIN HIMOYASI ================== */
      const referer = req.headers.get('referer') || "";
      const origin = req.headers.get('origin') || "";

      if (
        !referer.includes(ALLOWED_DOMAIN) &&
        !origin.includes(ALLOWED_DOMAIN)
      ) {
        return new Response(JSON.stringify({ error: "Access denied" }), { status: 403 });
      }

      /* ================== URL TEKSHIRUV ================== */
      const url = new URL(req.url);
      const fileName = url.searchParams.get('fileName');
      if (!fileName) {
        return new Response(JSON.stringify({ error: "fileName required" }), { status: 400 });
      }

      let parsedUrl;
      try {
        parsedUrl = new URL(fileName);
      } catch {
        return new Response(JSON.stringify({ error: "Invalid URL" }), { status: 400 });
      }

      if (!parsedUrl.hostname.includes(ALLOWED_B2_HOST)) {
        return new Response(JSON.stringify({ error: "Invalid video source" }), { status: 403 });
      }

      const b2 = await authenticateB2();

      /* ================== HEAD ================== */
      const head = await fetch(fileName, {
        method: "HEAD",
        headers: { Authorization: b2.authorizationToken },
      });

      const size = parseInt(head.headers.get("content-length"));
      const type = head.headers.get("content-type") || "video/mp4";

      if (req.method === "HEAD") {
        return new Response(null, {
          status: 200,
          headers: {
            "Content-Type": type,
            "Content-Length": size,
            "Accept-Ranges": "bytes",
          },
        });
      }

      const range = req.headers.get('range');
      const CHUNK = 2 * 1024 * 1024;

      let start = 0;
      let end = Math.min(CHUNK, size - 1);

      if (range) {
        const [s, e] = range.replace(/bytes=/, "").split("-");
        start = parseInt(s);
        end = e ? parseInt(e) : Math.min(start + CHUNK, size - 1);
      }

      if (start >= size) {
        return new Response(null, {
          status: 416,
          headers: {
            "Content-Range": `bytes */${size}`,
          },
        });
      }

      const chunkSize = end - start + 1;

      /* ================== RESPONSE ================== */
      const streamResponse = await fetch(fileName, {
        headers: {
          Authorization: b2.authorizationToken,
          Range: `bytes=${start}-${end}`,
        },
      });

      return new Response(streamResponse.body, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${size}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize,
          "Content-Type": type,

          // DOWNLOADNI CHEKLASH
          "Content-Disposition": "inline",

          // BOSHQA SAYTLARGA YOPIQ
          "Access-Control-Allow-Origin": `https://${ALLOWED_DOMAIN}`,

          // CLOUDFLARE CACHE INTEGRATSIYASI: CACHE NI YOQISH UCHUN NO-STORE O'RNIGA PUBLIC MAX-AGE
          "Cache-Control": "public, max-age=31536000, immutable", // 1 yil cache, o'zgarmas fayllar uchun
        },
      });
    } catch (err) {
      console.error("STREAM ERROR:", err.message);
      return new Response(JSON.stringify({ error: "stream error" }), { status: 500 });
    }
  }
};