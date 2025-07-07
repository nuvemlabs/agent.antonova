/**
 * Narrative Audio Controls
 * Frontend JavaScript for managing DeepGram TTS audio playback
 */

class NarrativeAudio {
    constructor() {
        this.audioElements = new Map();
        this.isLoading = new Map();
        this.baseUrl = 'http://localhost:3001';
        
        this.chapterTexts = new Map([
            [1, "In the depths of a developer's repository lay a mysterious project called Antonova - a Claude Code agent demonstration that promised to showcase the future of interactive AI automation. Like archaeologists uncovering ancient secrets, we began our exploration. What we discovered was an architecture built on Node.js CLI tool powered by Claude Code SDK, featuring a two-phase workflow of plan generation followed by user approval and execution. The purpose was clear: demonstrate real-world AI automation capabilities with a security-first approach where the plan-before-execute pattern ensures user control."],
            
            [2, "Our detective work revealed the inner workings of this digital agent. The examination of package.json and index.js files unveiled a sophisticated system designed for interactive automation. The core architecture uses the Claude Code query function with different permission modes - plan mode for generating strategies with a single turn, and accept edits mode for full execution with up to ten turns. This elegant separation ensures safety while maintaining powerful automation capabilities."],
            
            [3, "With the agent's capabilities understood, we orchestrated a live demonstration. The task was to create a web automation script that would showcase real-world data collection and processing. Our process involved four key steps: First, we analyzed the Antonova codebase structure and identified key components. Second, we investigated Puppeteer availability and discovered MCP integration options. Third, we built the web scraper demo using Node.js fetch API for HTTP automation. Finally, we executed the demonstration script with real network requests."],
            
            [4, "The moment of truth arrived as the agent executed its automation script. In real-time, we witnessed the digital transformation of instructions into working code and actual data. The web scraper demo script that actually ran performed three HTTP requests: fetching IP information, user agent information, and headers information from httpbin.org. It then combined all results into a structured JSON object with timestamp and metadata, saving everything to a timestamped file. This demonstrated the agent's ability to create functional, production-ready automation scripts."],
            
            [5, "Success! The agent had not only planned and executed the task but delivered tangible results. The actual data collected during our demonstration included a timestamp of 2025-07-06 at 03:31:15 UTC, the detected IP address 119.224.84.130, user agent information showing 'node', and complete HTTP headers with trace information. The demonstration results showed complete success with all network operations executed flawlessly and structured data output generated as planned."],
            
            [6, "The Antonova agent demonstration proved that AI-powered automation is not just theoretical—it's practical, controllable, and immediately useful. Through careful planning and execution, complex tasks can be automated while maintaining human oversight. Key capabilities demonstrated included code generation for functional web automation scripts, network operations with real HTTP requests and data collection, file management with timestamped output files, robust error handling with proper exception management, user control through the plan-approve-execute workflow, and real-time feedback with progress indicators. This narrative itself, powered by DeepGram's text-to-speech technology, represents the next evolution of interactive documentation where stories can be both read and heard, creating immersive learning experiences."]
        ]);
    }

    async generateAudio(chapterNumber) {
        const generateBtn = document.querySelector(`#chapter-${chapterNumber} .audio-btn:first-child`);
        const playBtn = document.getElementById(`play-${chapterNumber}`);
        
        if (this.isLoading.get(chapterNumber)) {
            return;
        }

        this.isLoading.set(chapterNumber, true);
        
        try {
            // Update button to show loading state
            const originalText = generateBtn.textContent;
            generateBtn.innerHTML = '🔄 Generating... <span class="loading"></span>';
            generateBtn.disabled = true;

            const text = this.chapterTexts.get(chapterNumber);
            const filename = `chapter-${chapterNumber}.mp3`;

            const response = await fetch(`${this.baseUrl}/generate-speech`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text, filename })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                // Create audio element
                const audio = new Audio(`${this.baseUrl}${result.audioPath}`);
                this.audioElements.set(chapterNumber, audio);
                
                // Enable play button
                playBtn.disabled = false;
                generateBtn.textContent = '✅ Audio Ready';
                generateBtn.style.background = '#22c55e';
                
                console.log(`Audio generated for chapter ${chapterNumber}`);
            } else {
                throw new Error(result.error || 'Audio generation failed');
            }
        } catch (error) {
            console.error('Error generating audio:', error);
            generateBtn.textContent = '❌ Error';
            generateBtn.style.background = '#ef4444';
            
            // Show user-friendly error message
            alert(`Failed to generate audio for Chapter ${chapterNumber}. Please check if the DeepGram service is running.`);
        } finally {
            this.isLoading.set(chapterNumber, false);
            generateBtn.disabled = false;
        }
    }

    playAudio(chapterNumber) {
        const audio = this.audioElements.get(chapterNumber);
        const playBtn = document.getElementById(`play-${chapterNumber}`);
        const stopBtn = document.getElementById(`stop-${chapterNumber}`);
        
        if (!audio) {
            alert('Please generate audio first!');
            return;
        }

        // Stop any currently playing audio
        this.stopAllAudio();

        audio.play().then(() => {
            playBtn.disabled = true;
            stopBtn.disabled = false;
            playBtn.textContent = '🔊 Playing...';
            
            // Re-enable play button when audio ends
            audio.onended = () => {
                playBtn.disabled = false;
                stopBtn.disabled = true;
                playBtn.textContent = '▶️ Play';
            };
        }).catch(error => {
            console.error('Error playing audio:', error);
            alert('Failed to play audio. Please try again.');
        });
    }

    stopAudio(chapterNumber) {
        const audio = this.audioElements.get(chapterNumber);
        const playBtn = document.getElementById(`play-${chapterNumber}`);
        const stopBtn = document.getElementById(`stop-${chapterNumber}`);
        
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
            
            playBtn.disabled = false;
            stopBtn.disabled = true;
            playBtn.textContent = '▶️ Play';
        }
    }

    stopAllAudio() {
        this.audioElements.forEach((audio, chapterNumber) => {
            if (!audio.paused) {
                this.stopAudio(chapterNumber);
            }
        });
    }

    // Check if DeepGram service is running
    async checkServiceStatus() {
        try {
            const response = await fetch(`${this.baseUrl}/`);
            return false; // Service is running if we get any response
        } catch (error) {
            return true; // Service is not running
        }
    }

    // Initialize and show service status
    async init() {
        const serviceDown = await this.checkServiceStatus();
        
        if (serviceDown) {
            console.warn('DeepGram service is not running. Audio features will be limited.');
            
            // Add warning banner
            const banner = document.createElement('div');
            banner.innerHTML = `
                <div style="background: #fbbf24; color: #92400e; padding: 15px; text-align: center; margin: 20px; border-radius: 8px;">
                    ⚠️ <strong>DeepGram Service Offline</strong><br>
                    Start the service with: <code>node deepgram-service.js</code>
                </div>
            `;
            document.querySelector('.container').insertBefore(banner, document.querySelector('.header'));
        } else {
            console.log('DeepGram service is running and ready!');
        }
    }
}

// Global functions for HTML onclick handlers
let narrativeAudio;

function generateAudio(chapterNumber) {
    narrativeAudio.generateAudio(chapterNumber);
}

function playAudio(chapterNumber) {
    narrativeAudio.playAudio(chapterNumber);
}

function stopAudio(chapterNumber) {
    narrativeAudio.stopAudio(chapterNumber);
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    narrativeAudio = new NarrativeAudio();
    narrativeAudio.init();
});

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key >= '1' && e.key <= '6') {
        e.preventDefault();
        const chapterNumber = parseInt(e.key);
        narrativeAudio.playAudio(chapterNumber);
    } else if (e.key === 'Escape') {
        narrativeAudio.stopAllAudio();
    }
});

// Export for potential use in other scripts
window.NarrativeAudio = NarrativeAudio;