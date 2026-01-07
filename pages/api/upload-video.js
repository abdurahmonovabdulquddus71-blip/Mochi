import formidable from "formidable";
import fs from "fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import https from "https";
import http from "http";

export const config = {
  api: {
    bodyParser: false,
  },
};

// S3Client yaratish
const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
});

// Fayl nomini tozalash funksiyasi
const sanitizeFileName = (str) => {
  if (!str) return "unknown";
  return String(str).replace(/[^a-zA-Z0-9_-]/g, "");
};

// URL dan faylni yuklab olish funksiyasi
const downloadFileFromUrl = (url) => {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Redirect bo'lsa, yangi URL ga o'tish
        downloadFileFromUrl(response.headers.location).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP Status: ${response.statusCode}`));
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
};

export default async function handler(req, res) {
  // Faqat POST so'rovlarni qabul qilish
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Faqat POST so'rovlar qabul qilinadi" });
  }

  let videoFile = null;

  try {
    // 1️⃣ Muhit o'zgaruvchilarini tekshirish
    if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY || !process.env.R2_SECRET_KEY || !process.env.R2_BUCKET_NAME) {
      throw new Error("R2 sozlamalari to'liq emas (.env faylni tekshiring)");
    }

    // 2️⃣ Form-data faylni olish
    const form = formidable({
      maxFileSize: 10000 * 1024 * 1024, // 10GB
      keepExtensions: true,
    });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    // 3️⃣ Fayllarni tekshirish
    videoFile = files.video?.[0];
    const episodeNumber = fields.episode_number?.[0];
    const animeId = fields.anime_id?.[0];

    if (!videoFile) {
      return res.status(400).json({ error: "Video fayl topilmadi" });
    }

    if (!episodeNumber || !animeId) {
      return res.status(400).json({ error: "episode_number va anime_id majburiy" });
    }

    // 4️⃣ Fayl nomini tayyorlash
    const fileExt = videoFile.originalFilename?.split(".").pop() || "mp4";
    const fileName = `anime_${sanitizeFileName(animeId)}_episode_${sanitizeFileName(episodeNumber)}_${Date.now()}.${fileExt}`;

    console.log(`📤 Upload boshlanmoqda: ${fileName}`);

    // 5️⃣ Faylni o'qish
    const fileBuffer = fs.readFileSync(videoFile.filepath);

    // 6️⃣ R2 ga upload qilish
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileName,
        Body: fileBuffer,
        ContentType: videoFile.mimetype || "video/mp4",
      })
    );

    console.log(`✅ Upload muvaffaqiyatli: ${fileName}`);

    // 7️⃣ Vaqtinchalik faylni o'chirish
    if (fs.existsSync(videoFile.filepath)) {
      fs.unlinkSync(videoFile.filepath);
    }

    // 8️⃣ Public URL yaratish
    const downloadUrl = process.env.R2_PUBLIC_DOMAIN
      ? `https://${process.env.R2_PUBLIC_DOMAIN}/${fileName}`
      : `https://pub-${process.env.R2_ACCOUNT_ID}.r2.dev/${fileName}`;

    // 9️⃣ Natijani qaytarish
    return res.status(200).json({
      success: true,
      fileName,
      downloadUrl,
      fileSize: videoFile.size,
      uploadedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error("❌ Upload xatosi:", error);

    // Vaqtinchalik faylni o'chirish (xato bo'lsa ham)
    if (videoFile?.filepath && fs.existsSync(videoFile.filepath)) {
      try {
        fs.unlinkSync(videoFile.filepath);
      } catch (unlinkError) {
        console.error("⚠️ Vaqtinchalik faylni o'chirishda xato:", unlinkError);
      }
    }

    return res.status(500).json({
      success: false,
      error: error.message || "Upload xatosi",
    });
  }
}