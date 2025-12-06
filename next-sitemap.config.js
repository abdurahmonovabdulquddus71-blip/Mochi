const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Muhim xavfsizlik ⚠️: Service Role Key emas, faqat anon key ishlatildi
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://itxndrvoolbvzdseuljx.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0eG5kcnZvb2xidnpkc2V1bGp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMzUyNjYsImV4cCI6MjA3MzcxMTI2Nn0.4x264DWr3QVjgPQYqf73QdAypfhKXvuVxw3LW9QYyGM'
);

// Title asosida slug hosil qiluvchi funksiya
function slugify(text) {
  if (!text) return 'undefined';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // bo'sh joy -> "-"
    .replace(/[^\w\u0400-\u04FF\-]+/g, '')  // Kirill harflarini saqlaydi
    .replace(/\-\-+/g, '-')         // ketma-ket "-" larni bitta qiladi
    .replace(/^-+|-+$/g, '');       // boshidagi va oxiridagi "-" ni olib tashlaydi
}

/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://www.mochitv.uz',
  generateRobotsTxt: true,
  sitemapSize: 7000, // Har bir sitemap faylida maksimal URL soni
  exclude: ['/admin', '/admin/*', '/api/*'], // Bu sahifalarni sitemap ga qo'shmaslik
  
  robotsTxtOptions: {
    policies: [
      { userAgent: '*', disallow: ['/admin', '/api'] },
      { userAgent: '*', allow: '/' }
    ],
    additionalSitemaps: [
      'https://www.mochitv.uz/server-sitemap.xml', // Agar dinamik sitemap bo'lsa
    ],
  },

  async additionalPaths(config) {
    try {
      const { data: animes, error } = await supabase
        .from('anime_cards')
        .select('id, title, description, created_at')
        .order('created_at', { ascending: false }); // Yangi anime'lar avval

      if (error) {
        console.error('❌ Supabase xatosi:', error.message);
        return [];
      }

      if (!animes || animes.length === 0) {
        console.warn('⚠️ Supabase dan ma\'lumot kelmadi!');
        return [];
      }

      console.log(`✅ ${animes.length} ta anime topildi`);

      return animes.map((anime) => {
        const slug = slugify(anime.title);
        return {
          loc: `/anime/${slug}?id=${anime.id}`, // ID qo'shildi - takrorlanishni oldini oladi
          lastmod: anime.updated_at || new Date().toISOString(),
          changefreq: 'weekly',
          priority: 0.9,
        };
      });
    } catch (err) {
      console.error('❌ additionalPaths xatosi:', err);
      return [];
    }
  },

  // Qo'shimcha: Static sahifalar uchun custom sozlamalar
  transform: async (config, path) => {
    // Homepage uchun yuqori prioritet
    if (path === '/') {
      return {
        loc: path,
        changefreq: 'daily',
        priority: 1.0,
        lastmod: new Date().toISOString(),
      };
    }

    // Default sozlamalar
    return {
      loc: path,
      changefreq: config.changefreq,
      priority: config.priority,
      lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
    };
  },
};