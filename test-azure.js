const apiKey = '5Ti69s5lLvGsxuctwMSX2U6J6E4CZm8mRjT5K6HcWKfZr7wqhz4lJQQJ99CFACHYHv6XJ3w3AAAAACOGJTOd';
const deploymentName = 'gpt-4.1';

async function testChatCompletions() {
  const url = 'https://docbridge-project1-resource.services.ai.azure.com/openai/v1/chat/completions';
  console.log('Testing Chat Completions at:', url);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: deploymentName,
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 10,
      }),
    });
    console.log('Chat Completions Status:', response.status);
    const body = await response.text();
    console.log('Chat Completions Body:', body);
  } catch (err) {
    console.error('Chat completions error:', err);
  }
}

async function testResponsesAPI() {
  const url = 'https://docbridge-project1-resource.services.ai.azure.com/openai/v1/responses';
  console.log('Testing Responses API at:', url);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: deploymentName,
        input: 'hi',
      }),
    });
    console.log('Responses Status:', response.status);
    const body = await response.text();
    console.log('Responses Body:', body);
  } catch (err) {
    console.error('Responses API error:', err);
  }
}

async function run() {
  await testChatCompletions();
  await testResponsesAPI();
}

run();
