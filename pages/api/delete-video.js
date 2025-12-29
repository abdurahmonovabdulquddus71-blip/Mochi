import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

// S3Client yaratish
const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Faqat POST so\'rovlar qabul qilinadi' });
  }

  try {
    // 1️⃣ Muhit o'zgaruvchilarini tekshirish
    if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY || !process.env.R2_SECRET_KEY || !process.env.R2_BUCKET_NAME) {
      return res.status(500).json({ 
        error: 'R2 sozlamalari to\'liq emas (.env faylni tekshiring)'
      });
    }

    // 2️⃣ Request body dan ma'lumotlarni olish
    const { file_name, video_url } = req.body;

    if (!file_name && !video_url) {
      return res.status(400).json({ 
        error: 'file_name yoki video_url yuborish kerak' 
      });
    }

    // 3️⃣ Fayl nomini aniqlash
    let fileName = file_name;
    
    // Agar faqat video_url yuborilgan bo'lsa, undan fayl nomini ajratib olish
    if (!fileName && video_url) {
      try {
        const url = new URL(video_url);
        fileName = url.pathname.split('/').pop();
      } catch (urlError) {
        return res.status(400).json({ 
          error: 'Noto\'g\'ri video_url formati' 
        });
      }
    }

    if (!fileName) {
      return res.status(400).json({ 
        error: 'Fayl nomi aniqlanmadi' 
      });
    }

    console.log(`🗑️ O'chirilmoqda: ${fileName}`);

    // 4️⃣ R2 dan faylni o'chirish
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileName,
      })
    );

    console.log(`✅ O'chirildi: ${fileName}`);

    // 5️⃣ Muvaffaqiyatli javob
    return res.status(200).json({ 
      success: true,
      message: 'Fayl muvaffaqiyatli o\'chirildi',
      fileName: fileName
    });

  } catch (error) {
    console.error('❌ O\'chirish xatosi:', error);
    
    // Agar fayl topilmasa
    if (error.name === 'NoSuchKey' || error.Code === 'NoSuchKey') {
      return res.status(404).json({ 
        error: 'Fayl topilmadi',
        details: 'Bu fayl allaqachon o\'chirilgan yoki mavjud emas'
      });
    }

    // Boshqa xatolar
    return res.status(500).json({ 
      error: 'Faylni o\'chirishda xato',
      details: error.message 
    });
  }
}