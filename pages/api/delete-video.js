import fetch from 'node-fetch';

const B2_KEY_ID = '005388ef1432aec000000000e';
const B2_APPLICATION_KEY = 'K005pjX0KGQnQ4oqcIxAGRBLGWTzYzQ';

async function authenticateB2() {
  const auth = Buffer.from(`${B2_KEY_ID}:${B2_APPLICATION_KEY}`).toString('base64');
  const response = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`
    }
  });

  if (!response.ok) {
    throw new Error('B2 autentifikatsiya xatosi');
  }

  return await response.json();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { file_id, file_name } = req.body;

    if (!file_id || !file_name) {
      return res.status(400).json({ error: 'file_id va file_name kerak' });
    }

    // Authenticate B2
    const b2Auth = await authenticateB2();

    // Delete file
    const deleteResponse = await fetch(`${b2Auth.apiUrl}/b2api/v2/b2_delete_file_version`, {
      method: 'POST',
      headers: {
        'Authorization': b2Auth.authorizationToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileId: file_id,
        fileName: file_name
      })
    });

    if (!deleteResponse.ok) {
      const errorData = await deleteResponse.text();
      throw new Error('Faylni o\'chirishda xato: ' + errorData);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return res.status(500).json({ error: error.message });
  }
}