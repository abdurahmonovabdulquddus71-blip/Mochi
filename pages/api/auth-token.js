import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key-change-this";

export default async function handler(req, res) {
  try {
    const videoUrl = req.query.url;
    if (!videoUrl) {
      return res.status(400).json({ error: "url required" });
    }

    // Token yaratish (1 soatlik)
    const token = jwt.sign(
      { 
        videoUrl,
        exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 soat
      },
      JWT_SECRET
    );

    res.status(200).json({
      token,
      expiresIn: 3600
    });

  } catch (err) {
    console.error("TOKEN ERROR:", err.message);
    res.status(500).json({ error: "token error" });
  }
}