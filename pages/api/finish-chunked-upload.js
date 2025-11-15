// ========================================
// 📂 /api/finish-chunked-upload.js
// ========================================
import fetch from "node-fetch";

const B2_BUCKET_NAME = "malika-memory";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { fileId, partSha1Array, apiUrl, authToken } = req.body;

    if (!fileId || !partSha1Array || !apiUrl || !authToken) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const response = await fetch(`${apiUrl}/b2api/v2/b2_finish_large_file`, {
      method: "POST",
      headers: {
        Authorization: authToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileId,
        partSha1Array,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Finish upload failed: ${error}`);
    }

    const data = await response.json();
    const downloadUrl = `https://f005.backblazeb2.com/file/${B2_BUCKET_NAME}/${data.fileName}`;

    return res.status(200).json({
      fileId: data.fileId,
      fileName: data.fileName,
      downloadUrl: downloadUrl,
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: error.message });
  }
}