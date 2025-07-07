import AudioService from '../src/audio-service.js';
import { writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Generate audio for the journey timeline
 */
async function generateJourneyAudio() {
  console.log('🎵 Starting DeepGram audio generation for journey timeline...');
  
  try {
    // Initialize the audio service
    const audioService = new AudioService();
    await audioService.initialize();
    
    // Define timeline sections with content optimized for speech
    const timelineSections = [
      {
        title: "Phase 1: The Vision",
        content: `We started with a bold vision: create an agent that never stops working. The goal was to build a system that continuously picks up GitHub issues, implements them autonomously, and creates pull requests without human intervention. Key insight: Because software should write itself.`
      },
      {
        title: "Phase 2: Repository Setup", 
        content: `We established the GitHub repository and implemented a comprehensive labeling system with priority levels, status tracking, and component categorization. We created the nuvemlabs slash agent dot antonova repository as a public repository and set up labels for priority critical, high, medium, and low priorities.`
      },
      {
        title: "Phase 3: Issue Generation",
        content: `We generated a complete backlog across 6 development phases. Phase 1 Core Infrastructure had 13 issues. Phase 2 Communication Layer had 8 issues. Phase 3 Monitoring Dashboard had 7 issues. Phase 4 GitHub Integration had 6 issues. Phase 5 Quality and Testing had 5 issues. Phase 6 DevContainer Enhancement had 4 issues. This created a total of 43 comprehensive issues to guide development.`
      },
      {
        title: "Phase 4: Core Implementation",
        content: `We implemented the Issue Engine and Autonomous Agent classes that form the heart of the system. The never-stopping execution loop continuously processes issues while the agent runs. It gets the next issue, executes the issue, and creates a pull request, then repeats. The agent uses Claude Code S D K with accept all permission mode for full autonomy.`
      },
      {
        title: "Phase 5: Testing & Debugging", 
        content: `We discovered and fixed a critical bug where GitHub C L I returns labels as objects with name properties, not simple strings. This fix enabled the agent to correctly identify and prioritize issues. The result was successfully identifying Issue number 14 SMS C L I Integration as the highest priority ready issue.`
      },
      {
        title: "Current State",
        content: `Agent Antonova is now fully operational and ready to query for highest priority ready issues, parse goals and acceptance criteria, execute work autonomously, create pull requests automatically, and loop continuously without stopping. The autonomous agent demonstrates that software truly can write itself, debug itself, and evolve autonomously.`
      }
    ];
    
    console.log(`📝 Processing ${timelineSections.length} timeline sections...`);
    
    // Generate audio for all sections
    const audioResults = await audioService.generateTimelineAudio(timelineSections);
    
    // Create audio manifest
    const audioManifest = audioService.generateAudioManifest(audioResults);
    
    // Save audio manifest
    const manifestPath = join(__dirname, '..', 'docs', 'audio-manifest.json');
    await writeFile(manifestPath, JSON.stringify(audioManifest, null, 2));
    
    // Generate audio statistics
    const stats = audioService.getStats();
    
    console.log('\n🎉 Audio generation complete!');
    console.log('📊 Statistics:');
    console.log(`   Audio files generated: ${audioManifest.audioSections}/${audioManifest.totalSections}`);
    console.log(`   Cache size: ${stats.cacheSize} files`);
    console.log(`   Audio directory: ${stats.audioDirectory}`);
    console.log(`   Voice model: ${stats.model}`);
    console.log(`   Audio format: ${stats.encoding}`);
    console.log(`   Manifest saved: ${manifestPath}`);
    
    return audioManifest;
    
  } catch (error) {
    console.error('❌ Error generating journey audio:', error.message);
    if (error.message.includes('DEEPGRAM_API_KEY')) {
      console.log('💡 Tip: Make sure DEEPGRAM_API_KEY is set in your environment');
      console.log('   You can run: export DEEPGRAM_API_KEY=your_api_key_here');
    }
    throw error;
  }
}

// Export for use in other scripts
export { generateJourneyAudio };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateJourneyAudio()
    .then(manifest => {
      console.log('\n✅ Journey audio generation completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Journey audio generation failed:', error.message);
      process.exit(1);
    });
}