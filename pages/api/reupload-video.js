import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import https from "https";
import http from "http";
import { URL } from "url";

export const config = {
  api: {
    bodyParser: true,
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
    
    const request = protocol.get(url, (response) => {
      // Redirect bo'lsa, yangi URL ga o'tish
      if (response.statusCode === 302 || response.statusCode === 301) {
        downloadFileFromUrl(response.headers.location).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP Status: ${response.statusCode}`));
        return;
      }

      const chunks = [];
      let totalSize = 0;

      response.on('data', (chunk) => {
        chunks.push(chunk);
        totalSize += chunk.length;
      });

      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        console.log(`✅ Fayl yuklab olindi: ${totalSize} bytes`);
        resolve(buffer);
      });

      response.on('error', reject);
    });

    request.on('error', reject);
    
    // Timeout qo'shish (5 daqiqa)
    request.setTimeout(300000, () => {
      request.destroy();
      reject(new Error('Download timeout (5 daqiqa)'));
    });
  });
};

// Content-Type ni URL dan aniqlash
const getContentTypeFromUrl = (url) => {
  try {
    const urlObj = new URL(url);
    const ext = urlObj.pathname.split('.').pop().toLowerCase();
    
    const contentTypes = {
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'avi': 'video/x-msvideo',
      'mov': 'video/quicktime',
      'mkv': 'video/x-matroska',
      'flv': 'video/x-flv',
    };
    
    return contentTypes[ext] || 'video/mp4';
  } catch (e) {
    return 'video/mp4';
  }
};

export default async function handler(req, res) {
  // Faqat POST so'rovlarni qabul qilish
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Faqat POST so'rovlar qabul qilinadi" });
  }

  try {
    // 1️⃣ Muhit o'zgaruvchilarini tekshirish
    if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY || !process.env.R2_SECRET_KEY || !process.env.R2_BUCKET_NAME) {
      throw new Error("R2 sozlamalari to'liq emas (.env faylni tekshiring)");
    }

    // 2️⃣ Request body dan ma'lumotlarni olish
    const { video_url, episode_number, anime_id } = req.body;

    if (!video_url) {
      return res.status(400).json({ error: "video_url majburiy" });
    }

    if (!episode_number || !anime_id) {
      return res.status(400).json({ error: "episode_number va anime_id majburiy" });
    }

    console.log(`📥 Video yuklab olinmoqda: ${video_url}`);

    // 3️⃣ Video faylni URL dan yuklab olish
    const fileBuffer = await downloadFileFromUrl(video_url);

    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error("Video yuklab olinmadi yoki fayl bo'sh");
    }

    // 4️⃣ Yangi fayl nomini yaratish
    const fileExt = video_url.split('.').pop().split('?')[0] || 'mp4';
    const fileName = `anime_${sanitizeFileName(anime_id)}_episode_${sanitizeFileName(episode_number)}_${Date.now()}.${fileExt}`;

    console.log(`📤 R2 ga yuklash boshlanmoqda: ${fileName}`);

    // 5️⃣ R2 ga upload qilish
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileName,
        Body: fileBuffer,
        ContentType: getContentTypeFromUrl(video_url),
      })
    );

    console.log(`✅ Qayta yuklash muvaffaqiyatli: ${fileName}`);

    // 6️⃣ Public URL yaratish
    const downloadUrl = process.env.R2_PUBLIC_DOMAIN
      ? `https://${process.env.R2_PUBLIC_DOMAIN}/${fileName}`
      : `https://pub-${process.env.R2_ACCOUNT_ID}.r2.dev/${fileName}`;

    // 7️⃣ Natijani qaytarish
    return res.status(200).json({
      success: true,
      fileName,
      downloadUrl,
      fileSize: fileBuffer.length,
      uploadedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error("❌ Qayta yuklash xatosi:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Qayta yuklash xatosi",
    });
  }
}