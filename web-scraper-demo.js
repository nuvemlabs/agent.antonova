/**
 * Web Scraper Demo - Created to demonstrate Antonova agent capabilities
 * This script fetches data from httpbin.org and saves results to JSON
 */

import { writeFile } from 'fs/promises';

async function webScraperDemo() {
    console.log('🌐 Starting web scraper demonstration...');
    
    try {
        // Fetch IP information
        console.log('📡 Fetching IP information...');
        const ipResponse = await fetch('https://httpbin.org/ip');
        const ipData = await ipResponse.json();
        
        // Fetch user agent information
        console.log('🔍 Fetching user agent information...');
        const uaResponse = await fetch('https://httpbin.org/user-agent');
        const uaData = await uaResponse.json();
        
        // Fetch headers information
        console.log('📋 Fetching headers information...');
        const headersResponse = await fetch('https://httpbin.org/headers');
        const headersData = await headersResponse.json();
        
        // Combine all data
        const scrapedData = {
            timestamp: new Date().toISOString(),
            ip: ipData,
            userAgent: uaData,
            headers: headersData,
            scraper: 'Antonova Agent Demo'
        };
        
        // Save to JSON file
        const filename = `scraped-data-${Date.now()}.json`;
        await writeFile(filename, JSON.stringify(scrapedData, null, 2));
        
        console.log(`✅ Data successfully scraped and saved to ${filename}`);
        console.log('📊 Summary:', {
            ip: ipData.origin,
            userAgent: uaData['user-agent'],
            timestamp: scrapedData.timestamp
        });
        
    } catch (error) {
        console.error('❌ Error during scraping:', error.message);
    }
}

// Run the demo
webScraperDemo();