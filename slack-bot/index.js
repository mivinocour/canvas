const { App } = require('@slack/bolt');
const axios = require('axios');
require('dotenv').config();

// Initialize Slack app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

// In-memory storage for development (replace with database later)
const channelSpaceMappings = new Map();

// Channel-to-Space mapping functionality
async function getOrCreateSpace(channelId, channelName, teamId) {
  const spaceKey = `${teamId}_${channelId}`;

  if (channelSpaceMappings.has(spaceKey)) {
    return channelSpaceMappings.get(spaceKey);
  }

  try {
    // Create new space via your existing API
    const response = await axios.post(`${process.env.PLAYGROUND_API_URL}/api/spaces`, {
      name: `#${channelName}`,
      description: `Playground space for Slack channel #${channelName}`,
      slackChannelId: channelId,
      slackTeamId: teamId
    });

    const space = response.data;
    channelSpaceMappings.set(spaceKey, space);

    console.log(`Created space "${space.name}" for channel #${channelName}`);
    return space;
  } catch (error) {
    console.error('Error creating space:', error.message);
    throw new Error('Failed to create Playground space');
  }
}

// Handle app mentions and channel joins
app.event('app_mention', async ({ event, client }) => {
  try {
    const channel = await client.conversations.info({ channel: event.channel });
    const space = await getOrCreateSpace(event.channel, channel.channel.name, event.team);

    await client.chat.postMessage({
      channel: event.channel,
      text: `👋 Hello! I've linked this channel to a Playground space: "${space.name}". Use \`/create\` to generate widgets!`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `👋 Hello! I've linked this channel to a Playground space: *${space.name}*`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: '🎨 Open Playground' },
              url: `${process.env.PLAYGROUND_WEB_URL}?space=${space.id}`,
              action_id: 'open_playground'
            }
          ]
        }
      ]
    });
  } catch (error) {
    console.error('Error handling app mention:', error);
  }
});

// Handle bot joining channels
app.event('member_joined_channel', async ({ event, client }) => {
  // Only respond if the bot itself joined
  if (event.user === process.env.SLACK_BOT_USER_ID) {
    try {
      const channel = await client.conversations.info({ channel: event.channel });
      await getOrCreateSpace(event.channel, channel.channel.name, event.team);

      await client.chat.postMessage({
        channel: event.channel,
        text: `🎉 Playground is now connected to #${channel.channel.name}! Use \`/create [widget name]\` to generate interactive widgets.`
      });
    } catch (error) {
      console.error('Error handling channel join:', error);
    }
  }
});

// /create command handler
app.command('/create', async ({ command, ack, respond, client }) => {
  await ack();

  try {
    const widgetPrompt = command.text.trim();
    if (!widgetPrompt) {
      await respond({
        text: '❌ Please specify what widget to create. Example: `/create todo list`',
        response_type: 'ephemeral'
      });
      return;
    }

    // Get channel info and space
    const channel = await client.conversations.info({ channel: command.channel_id });
    const space = await getOrCreateSpace(command.channel_id, channel.channel.name, command.team_id);

    // Show loading message
    await respond({
      text: `🎨 Creating "${widgetPrompt}" widget...`,
      response_type: 'in_channel'
    });

    // Create widget via your existing API
    const widgetResponse = await axios.post(`${process.env.PLAYGROUND_API_URL}/api/widgets`, {
      prompt: widgetPrompt,
      spaceId: space.id,
      createdBy: command.user_id,
      slackChannelId: command.channel_id
    });

    const widget = widgetResponse.data;
    const widgetUrl = `${process.env.PLAYGROUND_WEB_URL}?space=${space.id}&widget=${widget.id}`;

    // Post success message with deep link
    await client.chat.postMessage({
      channel: command.channel_id,
      text: `✅ Created "${widgetPrompt}" widget!`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `✅ *"${widget.name}"* widget created successfully!\\n\\n_Widget created by <@${command.user_id}>_`
          },
          accessory: {
            type: 'image',
            image_url: 'https://via.placeholder.com/100x60?text=Widget',
            alt_text: 'widget preview'
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: '🚀 Open Widget' },
              url: widgetUrl,
              action_id: 'open_widget',
              style: 'primary'
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: '🎨 View All Widgets' },
              url: `${process.env.PLAYGROUND_WEB_URL}?space=${space.id}`,
              action_id: 'view_space'
            }
          ]
        }
      ]
    });

  } catch (error) {
    console.error('Error creating widget:', error);
    await respond({
      text: `❌ Failed to create widget: ${error.message}`,
      response_type: 'ephemeral'
    });
  }
});

// /playground command for space management
app.command('/playground', async ({ command, ack, respond, client }) => {
  await ack();

  try {
    const channel = await client.conversations.info({ channel: command.channel_id });
    const space = await getOrCreateSpace(command.channel_id, channel.channel.name, command.team_id);

    await respond({
      text: `🎨 Playground space for #${channel.channel.name}`,
      response_type: 'ephemeral',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `🎨 *Playground Space: ${space.name}*\\n\\nCreate interactive widgets for your team!`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: '🚀 Open Playground' },
              url: `${process.env.PLAYGROUND_WEB_URL}?space=${space.id}`,
              action_id: 'open_playground',
              style: 'primary'
            }
          ]
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: '💡 Tip: Use `/create [widget name]` to generate widgets directly from Slack!'
            }
          ]
        }
      ]
    });

  } catch (error) {
    console.error('Error handling playground command:', error);
    await respond({
      text: '❌ Error accessing Playground space',
      response_type: 'ephemeral'
    });
  }
});

// Handle button clicks
app.action('open_playground', async ({ ack }) => {
  await ack();
  // Button URL handles the navigation
});

app.action('open_widget', async ({ ack }) => {
  await ack();
  // Button URL handles the navigation
});

app.action('view_space', async ({ ack }) => {
  await ack();
  // Button URL handles the navigation
});

// Error handling
app.error((error) => {
  console.error('Slack app error:', error);
});

// Start the server
(async () => {
  const port = process.env.PORT || 3000;
  await app.start(port);
  console.log(`⚡️ Playground Slack bot is running on port ${port}!`);
})();