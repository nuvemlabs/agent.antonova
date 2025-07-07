/**
 * DeepGram Text-to-Speech Service
 * Backend service for generating audio narration of the Antonova demonstration
 */

import { createClient } from '@deepgram/sdk';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

class DeepGramService {
    constructor() {
        this.server = null;
        this.port = 3001;
    }

    async generateSpeech(text, filename = 'narration.mp3') {
        try {
            const response = await deepgram.speak.request(
                { text },
                {
                    model: 'aura-asteria-en',
                    encoding: 'mp3',
                    container: 'mp3'
                }
            );

            const stream = await response.getStream();
            if (stream) {
                const buffer = await this.getAudioBuffer(stream);
                const audioPath = join(__dirname, 'audio', filename);
                await writeFile(audioPath, buffer);
                return audioPath;
            }
        } catch (error) {
            console.error('DeepGram TTS Error:', error);
            throw error;
        }
    }

    async getAudioBuffer(response) {
        const reader = response.getReader();
        const chunks = [];

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
        }

        const dataArray = chunks.reduce((acc, chunk) => {
            const tmp = new Uint8Array(acc.length + chunk.length);
            tmp.set(acc, 0);
            tmp.set(chunk, acc.length);
            return tmp;
        }, new Uint8Array(0));

        return Buffer.from(dataArray.buffer);
    }

    async handleRequest(req, res) {
        // Enable CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        if (req.method === 'POST' && req.url === '/generate-speech') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const { text, filename } = JSON.parse(body);
                    const audioPath = await this.generateSpeech(text, filename);
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: true, 
                        audioPath: `/audio/${filename}`,
                        message: 'Audio generated successfully'
                    }));
                } catch (error) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: false, 
                        error: error.message 
                    }));
                }
            });
        } else if (req.method === 'GET' && req.url.startsWith('/audio/')) {
            try {
                const filename = req.url.replace('/audio/', '');
                const audioPath = join(__dirname, 'audio', filename);
                const audio = readFileSync(audioPath);
                
                res.writeHead(200, { 
                    'Content-Type': 'audio/mpeg',
                    'Content-Length': audio.length
                });
                res.end(audio);
            } catch (error) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Audio file not found');
            }
        } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not found');
        }
    }

    start() {
        this.server = createServer((req, res) => this.handleRequest(req, res));
        
        this.server.listen(this.port, () => {
            console.log(`🎙️ DeepGram service running on http://localhost:${this.port}`);
            console.log(`📡 Ready to generate audio narration for Antonova demonstration`);
        });

        return this.server;
    }

    stop() {
        if (this.server) {
            this.server.close();
            console.log('🛑 DeepGram service stopped');
        }
    }
}

// Start service if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const service = new DeepGramService();
    service.start();

    // Graceful shutdown
    process.on('SIGINT', () => {
        service.stop();
        process.exit(0);
    });
}

export default DeepGramService;