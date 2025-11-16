import formidable from 'formidable';
import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const BOT_TOKEN = '8319736575:AAE0n1oX5RdXoSksSGMykZC4P2z-9qcazVE';
  const ADMIN_CHAT_ID = '5639438093';

  try {
    // FormData parse qilish
    const form = formidable({ multiples: true });
    
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    const platform = fields.platform?.[0] || fields.platform;
    const message = fields.message?.[0] || fields.message;
    const recipientInfo = fields.recipientInfo?.[0] || fields.recipientInfo;
    const uploadedFiles = files.files ? (Array.isArray(files.files) ? files.files : [files.files]) : [];

    // Xabar formatlash
    const platformEmoji = platform === 'telegram' ? '💬' : '📷';
    const platformName = platform === 'telegram' ? 'Telegram' : 'Instagram';
    const timestamp = new Date().toLocaleString('uz-UZ', {
      timeZone: 'Asia/Tashkent',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    let messageText = `╔═══════════════════════\n`;
    messageText += `║ 🔔 YANGI ANONIM XABAR\n`;
    messageText += `╠═══════════════════════\n`;
    messageText += `║ ${platformEmoji} Platform: ${platformName}\n`;
    messageText += `║ 👤 Qabul qiluvchi: @${recipientInfo}\n`;
    messageText += `║ 🕒 Vaqt: ${timestamp}\n`;
    messageText += `╠═══════════════════════\n`;

    if (message && message.trim()) {
      messageText += `║ 💬 Xabar:\n`;
      messageText += `║ ${message.split('\n').join('\n║ ')}\n`;
    } else {
      messageText += `║ 💬 Xabar: (Media fayllar)\n`;
    }

    if (uploadedFiles.length > 0) {
      messageText += `╠═══════════════════════\n`;
      messageText += `║ 📎 Biriktirilgan: ${uploadedFiles.length} ta fayl\n`;
    }

    messageText += `╚═══════════════════════`;

    // Telegram botga text xabar yuborish
    const messageResponse = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: ADMIN_CHAT_ID,
          text: messageText,
        }),
      }
    );

    const messageData = await messageResponse.json();

    if (!messageData.ok) {
      console.error('Telegram API error:', messageData);
      throw new Error(messageData.description || 'Xabar yuborishda xatolik');
    }

    // Fayllarni to'g'ridan-to'g'ri Telegram botga yuborish
    if (uploadedFiles.length > 0) {
      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];

        try {
          console.log('Processing file:', {
            originalFilename: file.originalFilename,
            mimetype: file.mimetype,
            filepath: file.filepath,
            size: file.size
          });

          // File type aniqlash
          const isPhoto = file.mimetype && file.mimetype.startsWith('image/');
          const isVideo = file.mimetype && file.mimetype.startsWith('video/');

          if (!isPhoto && !isVideo) {
            console.log('Unknown file type:', file.mimetype);
            continue;
          }

          const method = isPhoto ? 'sendPhoto' : 'sendVideo';
          const field = isPhoto ? 'photo' : 'video';

          // Faylni o'qish
          const fileBuffer = fs.readFileSync(file.filepath);
          
          // FormData yaratish
          const formData = new FormData();
          formData.append('chat_id', ADMIN_CHAT_ID);
          formData.append(field, fileBuffer, {
            filename: file.originalFilename || `file_${i + 1}.${isPhoto ? 'jpg' : 'mp4'}`,
            contentType: file.mimetype,
          });
          formData.append('caption', `📎 Fayl ${i + 1}/${uploadedFiles.length}\n🔗 ${platformName} orqali`);

          console.log(`Sending ${field} to Telegram...`);

          // Telegram botga yuborish
          const fileResponse = await fetch(
            `https://api.telegram.org/bot${BOT_TOKEN}/${method}`,
            {
              method: 'POST',
              body: formData,
              headers: formData.getHeaders(),
            }
          );

          const fileData = await fileResponse.json();

          if (!fileData.ok) {
            console.error(`File ${i + 1} send error:`, fileData);
            
            // Xatolik xabari yuborish
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                chat_id: ADMIN_CHAT_ID,
                text: `⚠️ Fayl ${i + 1} yuborishda xatolik: ${fileData.description || 'Noma\'lum xatolik'}`,
              }),
            });
          } else {
            console.log(`File ${i + 1} sent successfully!`);
          }

          // Temp faylni o'chirish
          if (fs.existsSync(file.filepath)) {
            fs.unlinkSync(file.filepath);
          }
        } catch (fileError) {
          console.error(`Error sending file ${i + 1}:`, fileError);
          
          // Xatolik haqida xabar
          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chat_id: ADMIN_CHAT_ID,
              text: `⚠️ Fayl ${i + 1} yuborishda server xatolik: ${fileError.message}`,
            }),
          });
          
          // Temp faylni o'chirish
          if (fs.existsSync(file.filepath)) {
            fs.unlinkSync(file.filepath);
          }
        }
      }
    }

    // Ajratuvchi chiziq yuborish
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: ADMIN_CHAT_ID,
        text: '━━━━━━━━━━━━━━━━━━━━━━━━━',
      }),
    });

    return res.status(200).json({
      success: true,
      message: 'Xabar muvaffaqiyatli yuborildi!',
    });
  } catch (error) {
    console.error('Error in send-message API:', error);
    return res.status(500).json({
      error: 'Xabar yuborishda xatolik',
      details: error.message,
    });
  }
}