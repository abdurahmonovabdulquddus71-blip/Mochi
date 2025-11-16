import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  try {
    const phonkDir = path.join(process.cwd(), 'public', 'assets', 'phonk');
    const files = fs.readdirSync(phonkDir).filter(file => file.endsWith('.mp3'));
    const filePaths = files.map(file => `/assets/phonk/${file}`);
    res.status(200).json(filePaths);
  } catch (error) {
    console.error('Error reading phonk files:', error);
    res.status(500).json({ error: 'Failed to load phonk files' });
  }
}