import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = formidable({
    maxFileSize: 10 * 1024 * 1024, // 10MB
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    try {
      // formidable v2+ da array bo'lib keladi
      const fileRaw = files.file;
      const file = Array.isArray(fileRaw) ? fileRaw[0] : fileRaw;

      if (!file) {
        return res.status(400).json({ error: 'Fayl topilmadi' });
      }

      // originalFilename yoki newFilename dan extension olish
      const originalName = file.originalFilename || file.newFilename || 'image.jpg';
      const fileExt = originalName.includes('.') ? originalName.split('.').pop() : 'jpg';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      const fileBuffer = fs.readFileSync(file.filepath);

      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: fileName,
          Body: fileBuffer,
          ContentType: file.mimetype || 'image/jpeg',
        })
      );

      // Temp faylni o'chirish
      fs.unlinkSync(file.filepath);

      const url = `${process.env.R2_PUBLIC_DOMAIN}/${fileName}`;
      return res.status(200).json({ url });
    } catch (error) {
      console.error('R2 upload error:', error);
      return res.status(500).json({ error: error.message });
    }
  });
}