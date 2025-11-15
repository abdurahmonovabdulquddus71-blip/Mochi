
// ========================================
// 📂 /api/start-chunked-upload.js
// ========================================
import formidable from "formidable";
import fs from "fs";
import fetch from "node-fetch";

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

const B2_KEY_ID = "005388ef1432aec000000000f";
const B2_APPLICATION_KEY = "K005ChhVWS9ULMO2oxsQwcZzJCZw6tk";
const B2_BUCKET_ID = "5388d88e9fc174c3929a0e1c";
const B2_BUCKET_NAME = "malika-memory";

async function authenticateB2() {
  const auth = Buffer.from(`${B2_KEY_ID}:${B2_APPLICATION_KEY}`).toString("base64");
  const response = await fetch("https://api.backblazeb2.com/b2api/v2/b2_authorize_account", {
    method: "GET",
    headers: { Authorization: `Basic ${auth}` },
  });
  
  if (!response.ok) throw new Error("B2 auth failed");
  return response.json();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Formni parse qilish (faqat metadata)
    const form = formidable({ maxFileSize: 5000 * 1024 * 1024 }); // 5GB
    const [fields] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const fileName = fields.fileName?.[0];
    const contentType = fields.contentType?.[0];

    if (!fileName) {
      return res.status(400).json({ error: "fileName required" });
    }

    // B2 auth
    const b2Auth = await authenticateB2();

    // Start large file
    const startResponse = await fetch(`${b2Auth.apiUrl}/b2api/v2/b2_start_large_file`, {
      method: "POST",
      headers: {
        Authorization: b2Auth.authorizationToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bucketId: B2_BUCKET_ID,
        fileName: fileName,
        contentType: contentType || "video/mp4",
      }),
    });

    if (!startResponse.ok) {
      const error = await startResponse.text();
      throw new Error(`Start large file failed: ${error}`);
    }

    const startData = await startResponse.json();

    return res.status(200).json({
      fileId: startData.fileId,
      fileName: fileName,
      apiUrl: b2Auth.apiUrl,
      authToken: b2Auth.authorizationToken,
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: error.message });
  }
}