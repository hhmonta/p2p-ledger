const fs = require('fs');
const https = require('https');
const http = require('http');

const cfg = fs.readFileSync('/home/z/my-project/.git/config', 'utf8');
const m = cfg.match(/https:\/\/hhmonta:([^@]+)@/);
if (!m) { console.error('No token found'); process.exit(1); }
const token = m[1];
const owner = 'hhmonta';
const repo = 'p2p-ledger';

function doRequest(urlStr, options, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const opts = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Authorization': 'token ' + token,
        'User-Agent': 'node',
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function main() {
  // Check if release v1.0.0 exists
  let res = await doRequest(`https://api.github.com/repos/${owner}/${repo}/releases/tags/v1.0.0`, { method: 'GET' });
  let release;
  if (res.status === 200) {
    console.log('Release v1.0.0 already exists, updating...');
    release = res.data;
    // Delete existing assets
    for (const asset of release.assets) {
      console.log('Deleting old asset:', asset.name);
      await doRequest(`https://api.github.com/repos/${owner}/${repo}/releases/assets/${asset.id}`, { method: 'DELETE' });
    }
  } else {
    console.log('Creating release v1.0.0...');
    res = await doRequest(`https://api.github.com/repos/${owner}/${repo}/releases`, {
      method: 'POST'
    }, {
      tag_name: 'v1.0.0',
      name: 'P2P Ledger v1.0',
      body: 'Primer release - APK Android. Dashboard con VES/USD separados. SkipShift como exchange.',
      draft: false,
      prerelease: false
    });
    if (!res.data.id) {
      console.error('Failed to create release:', JSON.stringify(res.data).substring(0, 300));
      process.exit(1);
    }
    release = res.data;
    console.log('Release created:', release.html_url);
  }

  // Upload APK
  const apkPath = '/home/z/my-project/download/P2P-Ledger-v1.0.apk';
  const apkSize = fs.statSync(apkPath).size;
  console.log('Uploading APK (' + apkSize + ' bytes)...');

  const apkBuffer = fs.readFileSync(apkPath);
  const uploadUrl = release.upload_url.replace('{?name,label}', '?name=P2P-Ledger-v1.0.apk');

  const url = new URL(uploadUrl);
  const result = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Authorization': 'token ' + token,
        'User-Agent': 'node',
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Length': apkSize
      }
    }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ raw: data.substring(0, 200) }); }
      });
    });
    req.on('error', reject);
    req.write(apkBuffer);
    req.end();
  });

  if (result.browser_download_url) {
    console.log('APK uploaded: ' + result.browser_download_url);
  } else {
    console.error('Upload issue:', JSON.stringify(result).substring(0, 300));
  }
}

main().catch(console.error);
