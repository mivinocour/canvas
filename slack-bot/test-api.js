const axios = require('axios');

async function testAPIs() {
  const PLAYGROUND_API_URL = 'https://canvas-plum-seven.vercel.app';

  try {
    console.log('🧪 Testing Playground APIs...\n');

    // Test 1: Create a space
    console.log('1️⃣ Testing space creation...');
    const spaceResponse = await axios.post(`${PLAYGROUND_API_URL}/api/spaces`, {
      name: '#test-channel',
      description: 'Test space for Slack channel #test-channel',
      slackChannelId: 'C1234567890',
      slackTeamId: 'T1234567890'
    });

    const space = spaceResponse.data;
    console.log('✅ Space created:', {
      id: space.id,
      name: space.name,
      slackChannelId: space.slackChannelId
    });

    // Test 2: Create a widget
    console.log('\n2️⃣ Testing widget creation...');
    const widgetResponse = await axios.post(`${PLAYGROUND_API_URL}/api/widgets`, {
      prompt: 'simple counter button',
      spaceId: space.id,
      createdBy: 'U1234567890',
      slackChannelId: 'C1234567890'
    });

    const widget = widgetResponse.data;
    console.log('✅ Widget created:', {
      id: widget.id,
      name: widget.name,
      spaceId: widget.spaceId
    });

    console.log('\n🎉 All API tests passed!');
    console.log('\n🔗 Widget URL would be:');
    console.log(`${PLAYGROUND_API_URL}?space=${space.id}&widget=${widget.id}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testAPIs();