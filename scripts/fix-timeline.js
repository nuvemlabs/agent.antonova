import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function analyzeAndFixTimeline() {
  console.log('🔍 Launching Puppeteer to analyze timeline display...');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 }
  });

  try {
    const page = await browser.newPage();
    
    // Navigate to our journey HTML file
    const htmlPath = `file://${join(__dirname, '..', 'docs', 'journey.html')}`;
    console.log(`📄 Loading: ${htmlPath}`);
    
    await page.goto(htmlPath, { waitUntil: 'networkidle0' });

    // Analyze timeline layout issues
    console.log('🔎 Analyzing timeline layout...');
    
    const issues = await page.evaluate(() => {
      const timeline = document.querySelector('.timeline');
      const timelineItems = document.querySelectorAll('.timeline-item');
      const issues = [];

      // Check if timeline exists
      if (!timeline) {
        issues.push('Timeline container not found');
        return issues;
      }

      // Check timeline items
      timelineItems.forEach((item, index) => {
        const content = item.querySelector('.timeline-content');
        const marker = item.querySelector('.timeline-marker');
        
        if (!content) {
          issues.push(`Timeline item ${index + 1}: Missing content`);
        }
        
        if (!marker) {
          issues.push(`Timeline item ${index + 1}: Missing marker`);
        }

        // Check positioning
        const contentRect = content?.getBoundingClientRect();
        const markerRect = marker?.getBoundingClientRect();
        
        if (contentRect && markerRect) {
          // Check if content is properly positioned relative to marker
          const isEven = index % 2 === 1; // Note: nth-child(even) is 0-indexed differently
          const expectedSide = isEven ? 'right' : 'left';
          
          if (isEven && contentRect.left < markerRect.right) {
            issues.push(`Timeline item ${index + 1}: Content should be on right side`);
          }
          
          if (!isEven && contentRect.right > markerRect.left) {
            issues.push(`Timeline item ${index + 1}: Content should be on left side`);
          }
        }
      });

      // Check timeline center line
      const timelineLine = window.getComputedStyle(timeline, '::before');
      if (timelineLine.left !== '50%') {
        issues.push('Timeline center line not properly positioned');
      }

      return issues;
    });

    console.log('📋 Analysis Results:');
    if (issues.length === 0) {
      console.log('✅ No timeline layout issues detected');
    } else {
      issues.forEach(issue => console.log(`❌ ${issue}`));
    }

    // Take a screenshot for visual inspection
    console.log('📸 Taking screenshot for visual inspection...');
    await page.screenshot({
      path: join(__dirname, '..', 'docs', 'timeline-analysis.png'),
      fullPage: true
    });

    // Inject CSS fixes if needed
    console.log('🔧 Applying timeline fixes...');
    
    await page.addStyleTag({
      content: `
        /* Enhanced Timeline Fixes */
        @media (max-width: 768px) {
          .timeline::before {
            left: 30px !important;
            transform: none !important;
          }
          
          .timeline-marker {
            left: 30px !important;
            transform: none !important;
          }
          
          .timeline-content {
            margin-left: 60px !important;
            width: calc(100% - 80px) !important;
            text-align: left !important;
          }
          
          .timeline-item:nth-child(even) .timeline-content,
          .timeline-item:nth-child(odd) .timeline-content {
            left: auto !important;
            right: auto !important;
            padding-left: 20px !important;
            padding-right: 20px !important;
          }
        }

        /* Desktop Timeline Improvements */
        @media (min-width: 769px) {
          .timeline {
            position: relative;
            max-width: 1200px;
            margin: 0 auto;
          }
          
          .timeline::before {
            content: '';
            position: absolute;
            left: 50%;
            top: 0;
            bottom: 0;
            width: 4px;
            background: linear-gradient(180deg, #2a5298 0%, #667eea 100%);
            transform: translateX(-50%);
            box-shadow: 0 0 10px rgba(102, 126, 234, 0.3);
          }
          
          .timeline-item {
            display: flex;
            justify-content: flex-end;
            padding-right: 50%;
            position: relative;
            margin-bottom: 80px;
            min-height: 120px;
          }
          
          .timeline-item:nth-child(even) {
            justify-content: flex-start;
            padding-left: 50%;
            padding-right: 0;
          }
          
          .timeline-content {
            position: relative;
            background: #1a202c;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            border: 1px solid #2d3748;
            width: 100%;
            max-width: 500px;
            margin-right: 40px;
          }
          
          .timeline-item:nth-child(even) .timeline-content {
            margin-left: 40px;
            margin-right: 0;
          }
          
          .timeline-marker {
            position: absolute;
            left: 50%;
            top: 40px;
            width: 24px;
            height: 24px;
            background: #667eea;
            border: 4px solid #1a202c;
            border-radius: 50%;
            transform: translateX(-50%);
            z-index: 10;
            box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.2);
          }
          
          /* Arrow indicators */
          .timeline-content::before {
            content: '';
            position: absolute;
            top: 40px;
            width: 0;
            height: 0;
            border: 12px solid transparent;
          }
          
          .timeline-item:nth-child(odd) .timeline-content::before {
            right: -24px;
            border-left-color: #2d3748;
          }
          
          .timeline-item:nth-child(even) .timeline-content::before {
            left: -24px;
            border-right-color: #2d3748;
          }
        }

        /* Content styling improvements */
        .timeline-content h3 {
          color: #667eea;
          margin-bottom: 15px;
          font-size: 1.4em;
          font-weight: 600;
        }

        .timeline-content .time {
          color: #9f7aea;
          font-size: 0.9em;
          font-weight: 600;
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .timeline-content p {
          color: #e2e8f0;
          line-height: 1.7;
          margin-bottom: 15px;
        }

        .timeline-content .code-block {
          margin: 15px 0;
          font-size: 0.85em;
        }

        /* Animation improvements */
        .timeline-item {
          opacity: 0;
          transform: translateY(30px);
          animation: slideInUp 0.6s ease-out forwards;
        }

        .timeline-item:nth-child(1) { animation-delay: 0.1s; }
        .timeline-item:nth-child(2) { animation-delay: 0.2s; }
        .timeline-item:nth-child(3) { animation-delay: 0.3s; }
        .timeline-item:nth-child(4) { animation-delay: 0.4s; }
        .timeline-item:nth-child(5) { animation-delay: 0.5s; }
        .timeline-item:nth-child(6) { animation-delay: 0.6s; }

        @keyframes slideInUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `
    });

    // Take another screenshot after fixes
    console.log('📸 Taking screenshot after fixes...');
    await page.screenshot({
      path: join(__dirname, '..', 'docs', 'timeline-fixed.png'),
      fullPage: true
    });

    // Test responsiveness
    console.log('📱 Testing mobile responsiveness...');
    await page.setViewport({ width: 375, height: 667 }); // iPhone SE
    await page.screenshot({
      path: join(__dirname, '..', 'docs', 'timeline-mobile.png'),
      fullPage: true
    });

    console.log('✅ Timeline analysis and fixes complete!');
    console.log('📁 Screenshots saved:');
    console.log('   - timeline-analysis.png (original)');
    console.log('   - timeline-fixed.png (after fixes)');
    console.log('   - timeline-mobile.png (mobile view)');

  } catch (error) {
    console.error('❌ Error during timeline analysis:', error);
  } finally {
    await browser.close();
  }
}

// Run the analysis
analyzeAndFixTimeline().catch(console.error);