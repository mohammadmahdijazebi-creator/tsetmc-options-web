export default async function handler(req, res) {
  // اجازه دسترسی CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // مسیر مقصد بورس که درخواست به آن ارسال می‌شود
  const { path } = req.query;
  if (!path) {
    return res.status(400).json({ error: 'Path is required' });
  }

  const targetUrl = `https://cdn.tsetmc.com/api/${path}`;

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch from TSETMC' });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
