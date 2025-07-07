import { exec } from 'child_process';
import { promisify } from 'util';
import { access } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testAudioConversion() {
  console.log('🔧 Testing audio file conversion capabilities...');
  
  const audioDir = join(__dirname, '..', 'docs', 'audio');
  const inputFile = join(audioDir, 'timeline-section-1.wav');
  const outputFile = join(audioDir, 'timeline-section-1.mp3');
  
  try {
    // Check if input file exists
    await access(inputFile);
    console.log('✅ Input WAV file found');
    
    // Check if ffmpeg is available
    try {
      const { stdout } = await execAsync('which ffmpeg');
      console.log('✅ ffmpeg found at:', stdout.trim());
      
      // Convert WAV to MP3
      console.log('🔄 Converting WAV to MP3...');
      const convertCmd = `ffmpeg -i "${inputFile}" -acodec mp3 -ab 128k "${outputFile}" -y`;
      await execAsync(convertCmd);
      
      console.log('✅ Audio conversion successful!');
      console.log(`📁 MP3 file created: ${outputFile}`);
      
      // Check file size
      const { stdout: sizeOutput } = await execAsync(`ls -lh "${outputFile}"`);
      console.log('📊 File info:', sizeOutput.trim());
      
    } catch (ffmpegError) {
      console.log('⚠️ ffmpeg not available - trying alternative methods...');
      
      // Check for other audio conversion tools
      try {
        await execAsync('which sox');
        console.log('✅ sox found - could be used for conversion');
      } catch {
        console.log('❌ sox not available');
      }
      
      try {
        await execAsync('which afconvert');
        console.log('✅ afconvert found (macOS) - testing conversion...');
        
        const convertCmd = `afconvert -f mp4f -d aac "${inputFile}" "${outputFile.replace('.mp3', '.m4a')}"`;
        await execAsync(convertCmd);
        console.log('✅ AAC conversion successful using afconvert!');
        
      } catch {
        console.log('❌ afconvert not available');
      }
    }
    
  } catch (error) {
    console.error('❌ Audio conversion test failed:', error.message);
  }
}

async function testBrowserAudioSupport() {
  console.log('\\n🌐 Browser audio support information:');
  console.log('WAV support: Most modern browsers support WAV with PCM encoding');
  console.log('MP3 support: Universal browser support');
  console.log('AAC support: Good support, especially Safari');
  console.log('\\nRecommendation: Keep WAV as primary, add MP3 as fallback if needed');
}

async function createAudioTestPage() {
  console.log('\\n📝 Creating audio test page...');
  
  const testHtml = `<!DOCTYPE html>
<html>
<head>
    <title>Audio Format Test</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; background: #1a202c; color: #e2e8f0; }
        .test-section { margin: 20px 0; padding: 15px; background: #2d3748; border-radius: 8px; }
        audio { width: 100%; margin: 10px 0; }
        .error { color: #f56565; }
        .success { color: #68d391; }
    </style>
</head>
<body>
    <h1>🎵 Audio Format Compatibility Test</h1>
    
    <div class="test-section">
        <h3>WAV Format Test</h3>
        <audio controls preload="metadata">
            <source src="./audio/timeline-section-1.wav" type="audio/wav">
            Your browser does not support WAV audio.
        </audio>
        <p id="wav-status">Testing WAV playback...</p>
    </div>
    
    <div class="test-section">
        <h3>Browser Audio Support Detection</h3>
        <div id="format-support"></div>
    </div>
    
    <div class="test-section">
        <h3>Network Test</h3>
        <div id="network-test"></div>
    </div>

    <script>
        // Test audio format support
        const audio = document.createElement('audio');
        const formatSupport = document.getElementById('format-support');
        
        const formats = {
            'WAV': 'audio/wav',
            'MP3': 'audio/mpeg',
            'AAC': 'audio/aac',
            'OGG': 'audio/ogg'
        };
        
        let supportInfo = '<ul>';
        for (const [name, type] of Object.entries(formats)) {
            const canPlay = audio.canPlayType(type);
            const status = canPlay === 'probably' ? '✅ Full support' : 
                          canPlay === 'maybe' ? '⚠️ Limited support' : '❌ No support';
            supportInfo += \`<li><strong>\${name}</strong>: \${status} (\${canPlay || 'none'})</li>\`;
        }
        supportInfo += '</ul>';
        formatSupport.innerHTML = supportInfo;
        
        // Test WAV file loading
        const wavAudio = document.querySelector('audio');
        const wavStatus = document.getElementById('wav-status');
        
        wavAudio.addEventListener('loadeddata', () => {
            wavStatus.innerHTML = '<span class="success">✅ WAV file loaded successfully</span>';
        });
        
        wavAudio.addEventListener('error', (e) => {
            wavStatus.innerHTML = \`<span class="error">❌ WAV loading failed: \${e.target.error?.message || 'Unknown error'}</span>\`;
        });
        
        // Network connectivity test
        async function testNetwork() {
            const networkTest = document.getElementById('network-test');
            
            try {
                const response = await fetch('./audio-manifest.json');
                if (response.ok) {
                    networkTest.innerHTML = '<span class="success">✅ Network access working</span>';
                } else {
                    networkTest.innerHTML = \`<span class="error">❌ Network error: \${response.status}</span>\`;
                }
            } catch (error) {
                networkTest.innerHTML = \`<span class="error">❌ Network failed: \${error.message}</span>\`;
            }
        }
        
        testNetwork();
    </script>
</body>
</html>`;

  const testPagePath = join(__dirname, '..', 'docs', 'audio-test.html');
  
  try {
    const fs = await import('fs/promises');
    await fs.writeFile(testPagePath, testHtml);
    console.log(`✅ Audio test page created: ${testPagePath}`);
    console.log('🔗 Access at: http://localhost:8080/audio-test.html');
  } catch (error) {
    console.error('❌ Failed to create test page:', error.message);
  }
}

// Run all tests
async function runAllTests() {
  await testAudioConversion();
  await testBrowserAudioSupport();
  await createAudioTestPage();
}

runAllTests().catch(console.error);