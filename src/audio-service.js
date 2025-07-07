import { createClient } from '@deepgram/sdk';
import { writeFile, mkdir, access } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * DeepGram Audio Service for Journey Documentation
 * Converts timeline text content to high-quality speech
 */
export class AudioService {
  constructor() {
    // Get API key from environment variable
    this.apiKey = process.env.DEEPGRAM_API_KEY;
    if (!this.apiKey) {
      throw new Error('DEEPGRAM_API_KEY environment variable is required');
    }
    
    this.deepgram = createClient(this.apiKey);
    this.audioDir = join(__dirname, '..', 'docs', 'audio');
    this.cacheFile = join(this.audioDir, 'audio-cache.json');
    this.audioCache = new Map();
    
    // DeepGram TTS options
    this.ttsOptions = {
      model: 'aura-asteria-en', // Premium voice model
      encoding: 'linear16',
      container: 'wav',
      sample_rate: 24000
    };
  }

  /**
   * Initialize the audio service
   */
  async initialize() {
    console.log('🎤 Initializing DeepGram Audio Service...');
    
    // Ensure audio directory exists
    try {
      await access(this.audioDir);
    } catch {
      await mkdir(this.audioDir, { recursive: true });
      console.log('📁 Created audio directory');
    }

    // Load existing cache
    await this.loadCache();
    console.log('✅ Audio service initialized');
  }

  /**
   * Load audio cache from disk
   */
  async loadCache() {
    try {
      await access(this.cacheFile);
      const cacheData = await import(this.cacheFile, { assert: { type: 'json' } });
      this.audioCache = new Map(Object.entries(cacheData.default || {}));
      console.log(`📋 Loaded ${this.audioCache.size} cached audio files`);
    } catch {
      console.log('📋 No existing audio cache found, starting fresh');
    }
  }

  /**
   * Save audio cache to disk
   */
  async saveCache() {
    const cacheObject = Object.fromEntries(this.audioCache);
    await writeFile(this.cacheFile, JSON.stringify(cacheObject, null, 2));
  }

  /**
   * Clean text content for speech synthesis
   * @param {string} text - Raw text content
   * @returns {string} Cleaned text optimized for speech
   */
  cleanTextForSpeech(text) {
    return text
      // Remove HTML tags
      .replace(/<[^>]*>/g, '')
      // Remove markdown formatting
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      // Convert code blocks to readable descriptions
      .replace(/```[\s\S]*?```/g, 'Code example provided.')
      // Convert technical terms to speakable format
      .replace(/GitHub/g, 'GitHub')
      .replace(/CLI/g, 'command line interface')
      .replace(/API/g, 'A P I')
      .replace(/SDK/g, 'S D K')
      .replace(/JSON/g, 'J son')
      .replace(/HTTP/g, 'H T T P')
      .replace(/CSS/g, 'C S S')
      .replace(/HTML/g, 'H T M L')
      .replace(/JS/g, 'JavaScript')
      .replace(/npm/g, 'N P M')
      .replace(/SSH/g, 'S S H')
      .replace(/URL/g, 'U R L')
      // Replace symbols with words
      .replace(/&/g, 'and')
      .replace(/@/g, 'at')
      .replace(/#/g, 'number')
      .replace(/\$/g, 'dollar')
      .replace(/%/g, 'percent')
      // Clean up multiple spaces and newlines
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '. ')
      // Remove extra punctuation
      .replace(/[()[\]{}]/g, '')
      .replace(/[•▸✅❌🎯📋⚡🔍📝🔄]/g, '')
      // Ensure proper sentence endings
      .replace(/([.!?])\s*([A-Z])/g, '$1 $2')
      .trim();
  }

  /**
   * Generate audio hash for caching
   * @param {string} text - Text content
   * @returns {string} Hash for caching
   */
  generateHash(text) {
    // Simple hash function for caching
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Convert text to speech using DeepGram
   * @param {string} text - Text to convert
   * @param {string} filename - Output filename (without extension)
   * @returns {Promise<string>} Path to generated audio file
   */
  async textToSpeech(text, filename) {
    const cleanText = this.cleanTextForSpeech(text);
    const textHash = this.generateHash(cleanText);
    const cacheKey = `${filename}_${textHash}`;
    const audioPath = join(this.audioDir, `${filename}.wav`);

    // Check cache
    if (this.audioCache.has(cacheKey)) {
      console.log(`🎵 Using cached audio for ${filename}`);
      return audioPath;
    }

    if (cleanText.length < 10) {
      console.log(`⚠️  Skipping audio generation for ${filename} (text too short)`);
      return null;
    }

    try {
      console.log(`🎤 Generating audio for ${filename}...`);
      console.log(`📝 Text preview: "${cleanText.substring(0, 100)}..."`);

      // Generate audio using DeepGram
      const response = await this.deepgram.speak.request(
        { text: cleanText },
        this.ttsOptions
      );

      // Get the audio stream
      const stream = await response.getStream();
      if (!stream) {
        throw new Error('Failed to get audio stream from DeepGram');
      }

      // Convert stream to buffer
      const buffer = await this.streamToBuffer(stream);
      
      // Save audio file
      await writeFile(audioPath, buffer);
      
      // Update cache
      this.audioCache.set(cacheKey, {
        filename: `${filename}.wav`,
        textHash,
        timestamp: Date.now(),
        textLength: cleanText.length
      });
      
      await this.saveCache();
      
      console.log(`✅ Audio generated: ${filename}.wav (${(buffer.length / 1024).toFixed(1)}KB)`);
      return audioPath;

    } catch (error) {
      console.error(`❌ Error generating audio for ${filename}:`, error.message);
      return null;
    }
  }

  /**
   * Convert stream to buffer
   * @param {ReadableStream} stream - Audio stream
   * @returns {Promise<Buffer>} Audio buffer
   */
  async streamToBuffer(stream) {
    const chunks = [];
    const reader = stream.getReader();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    
    return Buffer.concat(chunks);
  }

  /**
   * Generate audio for all timeline sections
   * @param {Array} timelineSections - Timeline content sections
   */
  async generateTimelineAudio(timelineSections) {
    console.log('🎵 Generating audio for all timeline sections...');
    
    const results = [];
    
    for (let i = 0; i < timelineSections.length; i++) {
      const section = timelineSections[i];
      const filename = `timeline-section-${i + 1}`;
      
      const audioPath = await this.textToSpeech(section.content, filename);
      
      results.push({
        index: i,
        title: section.title,
        audioPath,
        filename: audioPath ? `${filename}.wav` : null
      });
      
      // Small delay to avoid rate limiting
      if (i < timelineSections.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log(`🎉 Generated audio for ${results.filter(r => r.audioPath).length}/${results.length} sections`);
    return results;
  }

  /**
   * Generate audio manifest for the HTML page
   * @param {Array} audioResults - Results from generateTimelineAudio
   * @returns {Object} Audio manifest
   */
  generateAudioManifest(audioResults) {
    return {
      generated: new Date().toISOString(),
      sections: audioResults.map(result => ({
        index: result.index,
        title: result.title,
        audioFile: result.filename,
        hasAudio: !!result.audioPath
      })),
      totalSections: audioResults.length,
      audioSections: audioResults.filter(r => r.audioPath).length
    };
  }

  /**
   * Get audio service statistics
   */
  getStats() {
    return {
      cacheSize: this.audioCache.size,
      audioDirectory: this.audioDir,
      model: this.ttsOptions.model,
      encoding: this.ttsOptions.encoding
    };
  }
}

export default AudioService;