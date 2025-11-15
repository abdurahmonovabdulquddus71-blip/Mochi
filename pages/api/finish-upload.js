import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { fileId, partSha1Array, apiUrl, authToken } = req.body;

    const response = await fetch(`${apiUrl}/b2api/v2/b2_finish_large_file`, {
      method: "POST",
      headers: {
        Authorization: authToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fileId, partSha1Array }),
    });

    const data = await response.json();
    const downloadUrl = `https://f005.backblazeb2.com/file/malika-memory/${data.fileName}`;

    return res.status(200).json({
      fileId: data.fileId,
      fileName: data.fileName,
      downloadUrl: downloadUrl,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}