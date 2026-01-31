


const BASE_URL = 'http://localhost:3000/api/chat';

async function sendChat(message, conversationId = 'test-conversation-id') {
  console.log(`Sending message: "${message}"`);
  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, conversationId }),
    });
    
    if (!res.ok) {
      const text = await res.text();
      console.error(`Error: ${res.status} ${res.statusText}`, text);
      return null;
    }
    
    const data = await res.json();
    console.log('Response received.');
    return data;
  } catch (error) {
    console.error('Fetch error:', error);
    return null;
  }
}

async function runTest() {
  console.log('--- Starting Stage 2 Memory Test ---');

  // 1. Send first message
  const msg1 = "今天工作很累。";
  const res1 = await sendChat(msg1);
  
  if (!res1) {
    console.error('Test failed at step 1');
    return;
  }
  
  console.log('Step 1 Result:', {
    reply: res1.reply,
    stage2_memory: res1.debug_info?.stage2_memory
  });

  // 2. Send second message
  const msg2 = "而且老板还找茬。";
  const res2 = await sendChat(msg2);

  if (!res2) {
    console.error('Test failed at step 2');
    return;
  }

  const memory = res2.debug_info?.stage2_memory;
  console.log('Step 2 Result:', {
    reply: res2.reply,
    stage2_memory: memory
  });

  // Verification
  if (memory && memory.includes(msg1)) {
    console.log('SUCCESS: Memory contains the first message.');
  } else {
    console.error('FAILURE: Memory does not contain the first message.');
  }
}

runTest();
