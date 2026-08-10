const http = require('http');
const fs = require('fs');
const path = require('path');
const dir = '/home/z/my-project/out';
const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  let fp = path.join(dir, urlPath === '/' ? '/index.html' : urlPath);
  fs.stat(fp, (err, stats) => {
    if (err || !stats.isFile()) { 
      res.writeHead(404); 
      res.end('Not found'); 
      return; 
    }
    const ext = path.extname(fp);
    const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.apk':'application/vnd.android.package-archive','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.txt':'text/plain','.xml':'text/xml'};
    const headers = {'Content-Type': types[ext]||'application/octet-stream', 'Content-Length': stats.size};
    if (ext === '.apk') headers['Content-Disposition'] = 'attachment; filename=P2P-Ledger-v1.0.apk';
    res.writeHead(200, headers);
    fs.createReadStream(fp).pipe(res);
  });
});
server.listen(3000, '0.0.0.0', () => {
  console.log('FILE SERVER READY on http://0.0.0.0:3000');
  console.log('APK: http://0.0.0.0:3000/P2P-Ledger-v1.0.apk');
});
