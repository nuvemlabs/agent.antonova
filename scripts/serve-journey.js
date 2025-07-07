import { createServer } from 'http';
import { readFile, stat } from 'fs/promises';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 8080;
const DOCS_DIR = join(__dirname, '..', 'docs');

// MIME types for different file extensions
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function getMimeType(filePath) {
  const ext = extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

const server = createServer(async (req, res) => {
  console.log(`📥 ${req.method} ${req.url}`);
  
  try {
    // Parse the URL and remove query parameters
    let filePath = req.url.split('?')[0];
    
    // Default to index.html for root requests
    if (filePath === '/') {
      filePath = '/journey.html';
    }
    
    // Remove leading slash
    if (filePath.startsWith('/')) {
      filePath = filePath.substring(1);
    }
    
    // Construct full file path
    const fullPath = join(DOCS_DIR, filePath);
    console.log(`📁 Serving: ${fullPath}`);
    
    // Check if file exists
    const stats = await stat(fullPath);
    
    if (stats.isDirectory()) {
      // Try to serve index.html from directory
      const indexPath = join(fullPath, 'journey.html');
      try {
        await stat(indexPath);
        filePath = join(filePath, 'journey.html');
      } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Directory listing not supported');
        return;
      }
    }
    
    // Read file
    const data = await readFile(fullPath);
    const mimeType = getMimeType(fullPath);
    
    // Set headers
    res.writeHead(200, {
      'Content-Type': mimeType,
      'Content-Length': data.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    res.end(data);
    console.log(`✅ Served ${filePath} (${data.length} bytes, ${mimeType})`);
    
  } catch (error) {
    console.error(`❌ Error serving ${req.url}:`, error.message);
    
    if (error.code === 'ENOENT') {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File not found');
    } else {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal server error');
    }
  }
});

server.listen(PORT, () => {
  console.log('🌐 Journey HTTP Server started!');
  console.log(`📁 Serving files from: ${DOCS_DIR}`);
  console.log(`🔗 Open in browser: http://localhost:${PORT}`);
  console.log(`🎵 Audio files: http://localhost:${PORT}/audio/`);
  console.log('');
  console.log('🛑 Press Ctrl+C to stop the server');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\\n🛑 Shutting down server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});