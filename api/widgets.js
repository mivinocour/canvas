const axios = require('axios');
const { randomUUID } = require('crypto');

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, spaceId, createdBy, slackChannelId } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Widget prompt is required' });
    }

    // Generate widget code using existing API
    const baseUrl = process.env.NODE_ENV === 'production'
      ? 'https://canvas-plum-seven.vercel.app'
      : `http://${req.headers.host}`;

    const codeResponse = await axios.post(`${baseUrl}/api/generate-widget`, {
      prompt
    });

    const { code } = codeResponse.data;

    // Create widget object
    const widget = {
      id: randomUUID(),
      name: prompt.length > 25 ? prompt.substring(0, 25) + '...' : prompt,
      type: 'ai-app',
      position: { x: 1000 + Math.random() * 100, y: 1000 + Math.random() * 100 },
      size: { width: 320, height: 400 },
      code,
      prompt,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
      lastSaved: Date.now(),
      spaceId,
      createdBy,
      slackChannelId
    };

    // TODO: Store widget in database with space association
    // For now, just return the widget object

    res.status(201).json(widget);

  } catch (error) {
    console.error('Error creating widget:', error);
    res.status(500).json({
      error: 'Failed to create widget',
      details: error.message
    });
  }
}