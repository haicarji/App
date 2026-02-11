const fetch = require('node-fetch');

// DOHI SOURCES - अब दोनों online sources हैं
const ONLINE_SOURCES = [
    {
        name: 'primary',
        url: 'https://yy-pi-three.vercel.app/RWA',
        host: 'yy-pi-three.vercel.app',
        origin: 'https://yy-pi-three.vercel.app',
        referer: 'https://yy-pi-three.vercel.app'
    },
    {
        name: 'fallback', 
        url: 'https://vishal-80.vercel.app',
        host: 'vishal-80.vercel.app',
        origin: 'https://vishal-80.vercel.app',
        referer: 'https://vishal-80.vercel.app'
    }
];

// Color codes for logging
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

module.exports = async (req, res) => {
    console.log(`${colors.cyan}════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}📱 STUDYHUB ONLINE PROXY v2.0${colors.reset}`);
    console.log(`${colors.cyan}════════════════════════════════════════════${colors.reset}`);
    
    const path = req.url.split('?')[0];
    const search = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    
    // Check if it's a static file
    const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2', '.ttf', '.ico', '.json', '.map'];
    const isStaticFile = staticExtensions.some(ext => path.endsWith(ext));
    
    // CORS headers - सबसे पहले set करें
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range, sec-ch-ua, sec-ch-ua-mobile, sec-ch-ua-platform');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Handle OPTIONS request (preflight)
    if (req.method === 'OPTIONS') {
        console.log(`${colors.blue}🔄 [PREFLIGHT]${colors.reset} CORS preflight handled`);
        return res.status(200).end();
    }
    
    // Log the request
    console.log(`${colors.green}📥 REQUEST:${colors.reset} ${req.method} ${req.url}`);
    console.log(`${colors.cyan}📁 PATH:${colors.reset} ${path}`);
    if (isStaticFile) {
        console.log(`${colors.yellow}📄 FILE TYPE:${colors.reset} Static file detected`);
    }
    
    // Try each source in order - पहले primary, फिर fallback
    for (let i = 0; i < ONLINE_SOURCES.length; i++) {
        const source = ONLINE_SOURCES[i];
        const sourceUrl = `${source.url}${path}${search}`;
        
        console.log(`\n${colors.cyan}🔍 TRYING SOURCE ${i+1}/${ONLINE_SOURCES.length}:${colors.reset}`);
        console.log(`${colors.yellow}• Name:${colors.reset} ${source.name}`);
        console.log(`${colors.yellow}• URL:${colors.reset} ${sourceUrl}`);
        
        try {
            const response = await fetch(sourceUrl, {
                method: req.method,
                headers: {
                    ...req.headers,
                    'host': source.host,
                    'origin': source.origin,
                    'referer': source.referer,
                    'accept-encoding': 'identity'
                },
                body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
                redirect: 'follow',
                timeout: 10000 // 10 second timeout
            });
            
            // Check if file exists and is accessible
            if (response.status === 200 || response.status === 304) {
                console.log(`${colors.green}✅ FOUND in ${source.name}!${colors.reset} Status: ${response.status}`);
                
                // Get content type
                const contentType = response.headers.get('content-type') || '';
                let body;
                
                // Process based on content type
                if (contentType.includes('text') || contentType.includes('json') || 
                    contentType.includes('javascript') || contentType.includes('css')) {
                    body = await response.text();
                    console.log(`${colors.blue}📝 CONTENT TYPE:${colors.reset} Text-based (${contentType.split(';')[0]})`);
                } else {
                    body = Buffer.from(await response.arrayBuffer());
                    console.log(`${colors.blue}📝 CONTENT TYPE:${colors.reset} Binary (${contentType.split(';')[0] || 'unknown'})`);
                }
                
                // Set status code
                res.status(response.status);
                
                // Copy headers from response
                const headersToSkip = ['content-encoding', 'transfer-encoding', 'connection'];
                
                // Copy all headers except blacklisted ones
                for (const [key, value] of response.headers.entries()) {
                    const lowerKey = key.toLowerCase();
                    if (!headersToSkip.includes(lowerKey)) {
                        res.setHeader(key, value);
                    }
                }
                
                // Add proxy info headers
                res.setHeader('x-proxy-server', 'studyhub-online-proxy-v2');
                res.setHeader('x-source', source.name);
                res.setHeader('x-source-url', source.url);
                res.setHeader('x-priority', i + 1);
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Expose-Headers', '*');
                
                // Special handling for different content types
                if (path.endsWith('.js')) {
                    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
                } else if (path.endsWith('.css')) {
                    res.setHeader('Content-Type', 'text/css; charset=utf-8');
                } else if (path.endsWith('.json')) {
                    res.setHeader('Content-Type', 'application/json; charset=utf-8');
                }
                
                // Log successful response
                console.log(`${colors.green}🎯 SERVING from ${source.name}${colors.reset}`);
                console.log(`${colors.cyan}📊 RESPONSE:${colors.reset} ${response.status} - ${body.length} bytes`);
                console.log(`${colors.cyan}════════════════════════════════════════════${colors.reset}`);
                
                return res.send(body);
                
            } else if (response.status === 404) {
                console.log(`${colors.yellow}⚠️ NOT FOUND in ${source.name}${colors.reset}`);
                // Continue to next source
                continue;
                
            } else {
                console.log(`${colors.yellow}⚠️ Status ${response.status} from ${source.name}${colors.reset}`);
                // Continue to next source for non-200 responses
                continue;
            }
            
        } catch (err) {
            console.log(`${colors.red}❌ ERROR with ${source.name}:${colors.reset} ${err.message}`);
            
            // If this is the last source, throw error
            if (i === ONLINE_SOURCES.length - 1) {
                console.log(`${colors.red}🔥 ALL SOURCES FAILED${colors.reset}`);
                res.status(500).json({ 
                    error: 'All proxy sources failed', 
                    message: err.message,
                    sources_tried: ONLINE_SOURCES.map(s => s.name),
                    success: false,
                    timestamp: new Date().toISOString()
                });
                return;
            }
            
            // Try next source
            console.log(`${colors.yellow}🔄 Trying next source...${colors.reset}`);
        }
    }
    
    // If we reach here, all sources failed but no error was caught
    console.log(`${colors.red}❌ UNKNOWN ERROR - No source responded${colors.reset}`);
    res.status(500).json({ 
        error: 'Proxy failed - no response from any source',
        success: false,
        sources: ONLINE_SOURCES.map(s => s.name),
        timestamp: new Date().toISOString()
    });
};

// Health check endpoint
module.exports.health = async (req, res) => {
    res.json({
        status: 'online',
        server: 'StudyHub Online Proxy v2.0',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        sources: ONLINE_SOURCES.map(s => ({
            name: s.name,
            url: s.url,
            status: 'configured'
        })),
        features: [
            'Priority-based fetching',
            'Static file detection',
            'Intelligent fallback',
            'Detailed logging',
            'CORS enabled'
        ]
    });
};
