# Slack Bot Setup Guide

This guide will help you configure the Playground Slack bot.

## 1. Create a Slack App

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps)
2. Click "Create New App"
3. Choose "From scratch"
4. App Name: `Playground Bot`
5. Choose your workspace

## 2. Configure Bot Permissions

In your app settings:

### OAuth & Permissions → Bot Token Scopes
Add these scopes:
- `app_mentions:read` - Listen for mentions
- `channels:read` - Read public channel info
- `chat:write` - Send messages
- `commands` - Add slash commands
- `team:read` - Read team info

### Event Subscriptions
Enable and add these bot events:
- `app_mention` - When bot is mentioned
- `member_joined_channel` - When bot joins channels

### Slash Commands
Create these commands:
1. `/create` - Description: "Create a widget in Playground"
2. `/playground` - Description: "View your Playground space"

## 3. Get Your Tokens

From **OAuth & Permissions** page:
- Copy `Bot User OAuth Token` (starts with `xoxb-`)
- Copy `Signing Secret` from **Basic Information** page

## 4. Configure Environment Variables

Update your `.env` file:

```env
# Get from OAuth & Permissions
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_BOT_USER_ID=U1234567890

# Get from Basic Information → App Credentials
SLACK_SIGNING_SECRET=your-signing-secret-here
SLACK_CLIENT_ID=your-client-id-here
SLACK_CLIENT_SECRET=your-client-secret-here

# Your playground URLs
PLAYGROUND_API_URL=https://canvas-plum-seven.vercel.app
PLAYGROUND_WEB_URL=https://canvas-plum-seven.vercel.app
```

## 5. Set Request URLs (for production)

When deploying, set these in your Slack app:

### Event Subscriptions → Request URL
`https://your-bot-domain.com/slack/events`

### Slash Commands → Request URL
`https://your-bot-domain.com/slack/commands`

## 6. Install to Workspace

1. Go to **OAuth & Permissions**
2. Click "Install to Workspace"
3. Authorize the app

## 7. Test the Bot

1. Start your bot: `npm start`
2. Invite the bot to a channel: `/invite @playground`
3. Mention the bot: `@playground hello`
4. Try creating a widget: `/create todo list`

## Commands

- **@playground** - Links channel to a Playground space
- **/create [description]** - Creates a widget (e.g., `/create todo list`)
- **/playground** - View your space in Playground

## Troubleshooting

- **"not_authed" error**: Check your `SLACK_BOT_TOKEN` in `.env`
- **Commands not working**: Verify slash commands are configured in Slack app
- **No responses**: Check `SLACK_SIGNING_SECRET` and request URLs