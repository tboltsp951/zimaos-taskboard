'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT || '8080', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const APP_DIR = __dirname;

const STORE_FILE = path.join(DATA_DIR, 'taskboard.json');
let cache = null;

function load() {
  if (cache === null) {
    try {
      cache = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
    } catch {
      cache = {};
    }
  }
  return cache;
}

function save() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = STORE_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(load(), null, 2));
  fs.renameSync(tmp, STORE_FILE);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

const BRIDGE_MARK = '/* taskboard-storage-bridge */';
const BRIDGE = `<script>
(function () {
  ${BRIDGE_MARK}
  window.storage = {
    get: function (key) {
      return fetch('/__storage__/' + encodeURIComponent(key))
        .then(function (r) { return r.json(); })
        .then(function (d) { return d && d.found ? { value: d.value } : null; });
    },
    set: function (key, value) {
      return fetch('/__storage__/' + encodeURIComponent(key), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: value })
      });
    }
  };
})();
</script>
`;

let htmlTemplate = null;
function indexHtml() {
  if (!htmlTemplate) {
    const raw = fs.readFileSync(path.join(APP_DIR, 'task-board.html'), 'utf8');
    htmlTemplate = raw.includes(BRIDGE_MARK)
      ? raw
      : raw.replace('</head>', BRIDGE + '</head>');
  }
  return htmlTemplate;
}

function send(res, code, body, type) {
  res.writeHead(code, {
    'Content-Type': type || MIME['.json'],
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function readBody(req, cb) {
  let data = '';
  req.on('data', (c) => {
    data += c;
    if (data.length > 1e6) req.destroy();
  });
  req.on('end', () => cb(data));
}

const server = http.createServer((req, res) => {
  let url;
  try { url = new URL(req.url, 'http://localhost'); }
  catch { return send(res, 400, 'bad request', 'text/plain'); }
  const p = url.pathname;

  if (p === '/' || p === '/index.html' || p === '/task-board.html') {
    return send(res, 200, indexHtml(), MIME['.html']);
  }

  const st = p.match(/^\/__storage__\/([^/]+)/);
  if (st) {
    let key;
    try { key = decodeURIComponent(st[1]); } catch { return send(res, 400, JSON.stringify({ error: 'bad key' })); }
    if (req.method === 'GET') {
      const store = load();
      return send(res, 200, JSON.stringify({
        found: Object.prototype.hasOwnProperty.call(store, key),
        value: store[key] || ''
      }));
    }
    if (req.method === 'PUT') {
      return readBody(req, (raw) => {
        let body;
        try { body = JSON.parse(raw); } catch { return send(res, 400, JSON.stringify({ error: 'bad json' })); }
        const store = load();
        store[key] = typeof body.value === 'string' ? body.value : '';
        try { save(); } catch (e) { return send(res, 500, JSON.stringify({ error: 'write failed' })); }
        send(res, 200, JSON.stringify({ ok: true }));
      });
    }
    return send(res, 405, JSON.stringify({ error: 'method not allowed' }));
  }

  const file = path.join(APP_DIR, p);
  if (file !== APP_DIR && !file.startsWith(APP_DIR + path.sep)) {
    return send(res, 403, 'forbidden', 'text/plain');
  }
  if (fs.existsSync(file) && fs.statSync(file).isFile()) {
    return send(res, 200, fs.readFileSync(file), MIME[path.extname(file)] || 'application/octet-stream');
  }
  send(res, 404, 'not found', 'text/plain');
});

server.listen(PORT, () => {
  console.log('Task Board serving on http://0.0.0.0:' + PORT);
  console.log('Data stored in ' + STORE_FILE);
});
