const fetch = require('node-fetch');

const PRIMARY_SOURCE = 'https://yy-pi-three.vercel.app/RWA';
const FALLBACK_SOURCE = 'https://spidyuniverserwa.vercel.app';

module.exports = async (req, res) => {
    const path = req.url.split('?')[0];
    const search = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    
    // CORS headers - इसे सबसे पहले set करें
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range, sec-ch-ua, sec-ch-ua-mobile, sec-ch-ua-platform');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Handle OPTIONS request (preflight)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // First priority: try yy-pi-three
    const primaryUrl = `${PRIMARY_SOURCE}${path}${search}`;
    console.log(`🔍 Trying primary source: ${primaryUrl}`);
    
    try {
        const primaryResponse = await fetch(primaryUrl, {
            method: req.method,
            headers: {
                ...req.headers,
                'host': 'yy-pi-three.vercel.app',
                'origin': 'https://yy-pi-three.vercel.app',
                'referer': 'https://yy-pi-three.vercel.app',
                'accept-encoding': 'identity'
            },
            body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
            redirect: 'follow'
        });
        
        if (primaryResponse.ok) {
            const contentType = primaryResponse.headers.get('content-type') || '';
            let body;
            
            if (contentType.includes('text') || contentType.includes('json') || 
                contentType.includes('javascript') || contentType.includes('css')) {
                body = await primaryResponse.text();
            } else {
                body = Buffer.from(await primaryResponse.arrayBuffer());
            }
            
            // Important: Keep CORS headers
            res.status(primaryResponse.status);
            
            // Copy headers from response
            const headersToSkip = ['content-encoding', 'transfer-encoding', 'connection'];
            
            // Copy all headers except blacklisted ones
            for (const [key, value] of primaryResponse.headers.entries()) {
                const lowerKey = key.toLowerCase();
                if (!headersToSkip.includes(lowerKey)) {
                    res.setHeader(key, value);
                }
            }
            
            // Add proxy info headers
            res.setHeader('x-proxy-server', 'studyhub-vercel-proxy');
            res.setHeader('x-source', 'yy-pi-three');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Expose-Headers', '*');
            
            return res.send(body);
        }
        
        console.log(`⚠️ Primary source failed with status ${primaryResponse.status}, falling back...`);
        
    } catch (err) {
        console.error('❌ Primary source error:', err.message);
    }
    
    // Fallback: spidyuniverserwa.vercel.app
    const fallbackUrl = `${FALLBACK_SOURCE}${path}${search}`;
    console.log(`🌐 Falling back to: ${fallbackUrl}`);
    
    try {
        const fallbackResponse = await fetch(fallbackUrl, {
            method: req.method,
            headers: {
                ...req.headers,
                'host': 'spidyuniverserwa.vercel.app',
                'origin': 'https://spidyuniverserwa.vercel.app',
                'referer': 'https://spidyuniverserwa.vercel.app',
                'accept-encoding': 'identity'
            },
            body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
            redirect: 'follow'
        });
        
        const contentType = fallbackResponse.headers.get('content-type') || '';
        let body;
        
        if (contentType.includes('text') || contentType.includes('json') || 
            contentType.includes('javascript') || contentType.includes('css')) {
            body = await fallbackResponse.text();
        } else {
            body = Buffer.from(await fallbackResponse.arrayBuffer());
        }
        
        res.status(fallbackResponse.status);
        
        // Copy headers from fallback response
        const headersToSkip = ['content-encoding', 'transfer-encoding', 'connection'];
        
        for (const [key, value] of fallbackResponse.headers.entries()) {
            const lowerKey = key.toLowerCase();
            if (!headersToSkip.includes(lowerKey)) {
                res.setHeader(key, value);
            }
        }
        
        // Add proxy info headers
        res.setHeader('x-proxy-server', 'studyhub-vercel-proxy');
        res.setHeader('x-source', 'scammer');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Expose-Headers', '*');
        
        return res.send(body);
        
    } catch (err) {
        console.error('❌ Fallback error:', err.message);
        res.status(500).json({ 
            error: 'Proxy failed', 
            message: err.message,
            success: false 
        });
    }
};