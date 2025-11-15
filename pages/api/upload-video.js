import formidable from "formidable";
import fs from "fs";
import crypto from "crypto";
import fetch from "node-fetch";

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

// ⚙️ Backblaze B2 sozlamalari
const B2_KEY_ID = "005388ef1432aec000000000f";
const B2_APPLICATION_KEY = "K005ChhVWS9ULMO2oxsQwcZzJCZw6tk";
const B2_BUCKET_NAME = "malika-memory";
const B2_BUCKET_ID = "5388d88e9fc174c3929a0e1c";
const CHUNK_SIZE = 20 * 1024 * 1024; // 20MB

// 🔐 1. Autentifikatsiya
async function authenticateB2() {
  const auth = Buffer.from(`${B2_KEY_ID}:${B2_APPLICATION_KEY}`).toString("base64");

  const response = await fetch("https://api.backblazeb2.com/b2api/v2/b2_authorize_account", {
    method: "GET",
    headers: { Authorization: `Basic ${auth}` },
  });

  const text = await response.text();
  if (!response.ok) {
    console.error("❌ B2 autentifikatsiya xatosi:", text);
    throw new Error("B2 autentifikatsiya xatosi");
  }

  return JSON.parse(text);
}

// 📊 2. SHA1 hash hisoblash
function calculateSHA1(buffer) {
  return crypto.createHash("sha1").update(buffer).digest("hex");
}

// 🚀 3. Large File yuklashni boshlash
async function startLargeFile(fileName, contentType, b2Auth) {
  const response = await fetch(`${b2Auth.apiUrl}/b2api/v2/b2_start_large_file`, {
    method: "POST",
    headers: {
      Authorization: b2Auth.authorizationToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      bucketId: B2_BUCKET_ID,
      fileName: fileName,
      contentType: contentType || "video/mp4",
      fileInfo: {
        author: "anime-admin",
        upload_timestamp: Date.now().toString(),
      },
    }),
  });

  const text = await response.text();
  if (!response.ok) {
    console.error("❌ Large file boshlashda xato:", text);
    throw new Error("Large file boshlashda xato");
  }

  return JSON.parse(text);
}

// 📤 4. Upload URL olish (har bir chunk uchun)
async function getUploadPartUrl(fileId, b2Auth) {
  const response = await fetch(`${b2Auth.apiUrl}/b2api/v2/b2_get_upload_part_url`, {
    method: "POST",
    headers: {
      Authorization: b2Auth.authorizationToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fileId }),
  });

  const text = await response.text();
  if (!response.ok) {
    console.error("❌ Upload part URL olishda xato:", text);
    throw new Error("Upload part URL olishda xato");
  }

  return JSON.parse(text);
}

// 📦 5. Bitta chunk yuklash
async function uploadPart(uploadUrl, authToken, partNumber, chunk) {
  const sha1 = calculateSHA1(chunk);

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: authToken,
      "X-Bz-Part-Number": partNumber.toString(),
      "Content-Length": chunk.length.toString(),
      "X-Bz-Content-Sha1": sha1,
    },
    body: chunk,
  });

  const text = await response.text();
  if (!response.ok) {
    console.error(`❌ Chunk ${partNumber} yuklashda xato:`, text);
    throw new Error(`Chunk ${partNumber} yuklashda xato`);
  }

  return JSON.parse(text);
}

// ✅ 6. Large file yuklashni yakunlash
async function finishLargeFile(fileId, partSha1Array, b2Auth) {
  const response = await fetch(`${b2Auth.apiUrl}/b2api/v2/b2_finish_large_file`, {
    method: "POST",
    headers: {
      Authorization: b2Auth.authorizationToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileId,
      partSha1Array,
    }),
  });

  const text = await response.text();
  if (!response.ok) {
    console.error("❌ Large file yakunlashda xato:", text);
    throw new Error("Large file yakunlashda xato");
  }

  return JSON.parse(text);
}

// ☁️ 7. Asosiy yuklash funksiyasi (chunked)
async function uploadLargeFileToB2(filePath, fileName, contentType, b2Auth, progressCallback) {
  const fileStats = fs.statSync(filePath);
  const fileSize = fileStats.size;
  
  console.log(`📂 Fayl hajmi: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

  // 1️⃣ Large file yuklashni boshlash
  const largeFile = await startLargeFile(fileName, contentType, b2Auth);
  console.log(`🚀 Large file boshlandi: ${largeFile.fileId}`);

  // 2️⃣ Faylni bo'laklarga bo'lib yuklash
  const fileStream = fs.createReadStream(filePath, { highWaterMark: CHUNK_SIZE });
  const chunks = [];
  const partSha1Array = [];
  let partNumber = 1;
  let uploadedBytes = 0;

  for await (const chunk of fileStream) {
    console.log(`📤 Chunk ${partNumber} yuklanmoqda (${(chunk.length / 1024 / 1024).toFixed(2)} MB)...`);

    // Upload URL olish
    const uploadPartUrl = await getUploadPartUrl(largeFile.fileId, b2Auth);

    // Chunk yuklash
    const partResponse = await uploadPart(
      uploadPartUrl.uploadUrl,
      uploadPartUrl.authorizationToken,
      partNumber,
      chunk
    );

    partSha1Array.push(partResponse.contentSha1);
    uploadedBytes += chunk.length;
    
    const progress = ((uploadedBytes / fileSize) * 100).toFixed(2);
    console.log(`✅ Chunk ${partNumber} yuklandi (${progress}%)`);
    
    if (progressCallback) {
      progressCallback(progress, partNumber);
    }

    partNumber++;
  }

  // 3️⃣ Large file yuklashni yakunlash
  console.log("🏁 Yuklash yakunlanmoqda...");
  const finalFile = await finishLargeFile(largeFile.fileId, partSha1Array, b2Auth);

  // 4️⃣ Download URL yaratish
  const downloadUrl = `${b2Auth.downloadUrl}/file/${B2_BUCKET_NAME}/${fileName}`;

  return {
    fileId: finalFile.fileId,
    fileName: finalFile.fileName,
    downloadUrl,
    fileSize: fileSize,
    totalChunks: partNumber - 1,
  };
}

// 🎬 8. API handler
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1️⃣ Form-data faylni olish
    const form = formidable({ 
      maxFileSize: 5000 * 1024 * 1024, // 5GB
      uploadDir: "/tmp",
      keepExtensions: true,
    });
    
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const videoFile = files.video?.[0];
    const episodeNumber = fields.episode_number?.[0];
    const animeId = fields.anime_id?.[0];

    if (!videoFile) {
      return res.status(400).json({ error: "Video fayl topilmadi" });
    }

    console.log(`📹 Video qabul qilindi: ${videoFile.originalFilename}`);

    // 2️⃣ B2 bilan avtorizatsiya
    const b2Auth = await authenticateB2();
    console.log("✅ B2 autentifikatsiyasi muvaffaqiyatli");

    // 3️⃣ Fayl nomini tayyorlash
    const fileExt = videoFile.originalFilename.split(".").pop();
    const fileName = `anime_${animeId}_episode_${episodeNumber}_${Date.now()}.${fileExt}`;

    // 4️⃣ Progress callback (ixtiyoriy)
    const progressCallback = (progress, chunkNumber) => {
      console.log(`Progress: ${progress}% (Chunk: ${chunkNumber})`);
      // Bu yerda real-time progress yuborish mumkin (WebSocket, SSE)
    };

    // 5️⃣ Faylni bo'laklarga bo'lib yuklash
    const uploadResult = await uploadLargeFileToB2(
      videoFile.filepath,
      fileName,
      videoFile.mimetype,
      b2Auth,
      progressCallback
    );

    // 6️⃣ Vaqtinchalik faylni o'chirish
    fs.unlinkSync(videoFile.filepath);
    console.log("🗑️ Vaqtinchalik fayl o'chirildi");

    // 7️⃣ Natijani qaytarish
    return res.status(200).json({
      success: true,
      ...uploadResult,
      message: `Video ${uploadResult.totalChunks} ta bo'lakda yuklandi`,
    });
  } catch (error) {
    console.error("❌ Upload error:", error);
    return res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
}