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
    const { name, description, slackChannelId, slackTeamId } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Space name is required' });
    }

    // Create space object (simplified for Slack bot integration)
    const space = {
      id: randomUUID(),
      name,
      description: description || '',
      ownerId: 'slack-bot', // Special owner ID for Slack-created spaces
      members: [],
      widgets: [],
      inviteCode: '',
      isPublic: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      slackChannelId,
      slackTeamId
    };

    // For Slack bot integration, we return the space object without database storage
    // The Slack bot handles its own in-memory mapping of channels to spaces
    console.log('Created space for Slack bot:', space.name);

    res.status(201).json(space);

  } catch (error) {
    console.error('Error creating space:', error);
    res.status(500).json({
      error: 'Failed to create space',
      details: error.message
    });
  }
}