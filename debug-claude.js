import { query } from '@anthropic-ai/claude-code';

async function testClaude() {
  try {
    console.log('🔍 Testing Claude Code SDK...');
    
    const result = query({
      prompt: 'Hello, can you help me create a simple test file named hello.txt with content "Hello from Claude"?',
      options: {
        permissionMode: 'acceptAll',
        maxTurns: 3
      }
    });
    
    console.log('🔄 Starting execution...');
    
    for await (const message of result) {
      console.log('📨 Message type:', message.type);
      
      if (message.type === 'assistant' && message.message?.content) {
        const textContent = message.message.content
          .filter(item => item.type === 'text')
          .map(item => item.text)
          .join('\n');
        if (textContent) {
          console.log('💬 Assistant:', textContent.substring(0, 200) + '...');
        }
      }
      
      if (message.type === 'error') {
        console.error('❌ Error:', message.error);
      }
    }
    
    console.log('✅ Test completed successfully');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testClaude();