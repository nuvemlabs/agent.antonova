import { spawn } from 'child_process';

async function testClaudeDirect() {
  return new Promise((resolve, reject) => {
    console.log('🔍 Testing Claude Code directly...');
    
    const claude = spawn('claude', [
      '--print',
      '--dangerously-skip-permissions',
      'Hello, can you create a simple test file named hello.txt with content "Hello from Claude"?'
    ]);
    
    let output = '';
    let error = '';
    
    claude.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    claude.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    claude.on('close', (code) => {
      console.log(`Process exited with code ${code}`);
      if (code === 0) {
        console.log('✅ Output:', output);
        resolve(output);
      } else {
        console.error('❌ Error:', error);
        reject(new Error(`Process exited with code ${code}: ${error}`));
      }
    });
  });
}

testClaudeDirect().catch(console.error);