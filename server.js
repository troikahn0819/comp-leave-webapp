/* =====================================================================
 * 보상휴가 자동계산 웹앱 - 정적 서버 + ChatGPT 프록시
 *
 * - webapp/ 폴더의 정적 파일을 서빙한다.
 * - POST /api/chat 요청을 받아 .env 의 GPT_API_KEY 로 OpenAI API 를
 *   서버 측에서 대신 호출한다. (키가 브라우저로 노출되지 않음)
 *
 * 의존성 없음. Node 18+ 의 내장 fetch 사용.
 * 실행:  node server.js
 * ===================================================================== */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, 'webapp');
const PORT = process.env.PORT || 5173;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

/* ---------- .env 로드 (간단 파서) ---------- */
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  const env = {};
  try {
    const raw = fs.readFileSync(envPath, 'utf8');
    raw.split(/\r?\n/).forEach((line) => {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m) {
        let val = m[2].trim();
        if ((val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        env[m[1]] = val;
      }
    });
  } catch (e) {
    console.warn('[server] .env 를 읽지 못했습니다:', e.message);
  }
  return env;
}

const ENV = loadEnv();
const API_KEY = ENV.GPT_API_KEY || process.env.GPT_API_KEY || '';
if (!API_KEY) {
  console.warn('[server] GPT_API_KEY 가 .env 에 없습니다. /api/chat 은 503 을 반환합니다.');
}

/* ---------- MIME 타입 ---------- */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8'
};

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

/* ---------- ChatGPT 프록시 ---------- */
async function handleChat(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'POST 만 허용됩니다.' });
  }
  if (!API_KEY) {
    return sendJson(res, 503, { error: 'API 키가 설정되지 않았습니다. .env 의 GPT_API_KEY 를 확인하세요.' });
  }

  let raw = '';
  req.on('data', (c) => {
    raw += c;
    if (raw.length > 1e6) req.destroy(); // 1MB 방어
  });
  req.on('end', async () => {
    let payload;
    try {
      payload = JSON.parse(raw || '{}');
    } catch (e) {
      return sendJson(res, 400, { error: '잘못된 JSON 입니다.' });
    }

    const question = (payload.question || '').toString().trim();
    const pageTitle = (payload.pageTitle || '').toString().slice(0, 200);
    let context = (payload.context || '').toString();
    if (context.length > 8000) context = context.slice(0, 8000) + '\n…(이하 생략)';

    if (!question) {
      return sendJson(res, 400, { error: '질문이 비어 있습니다.' });
    }

    const systemPrompt =
      '당신은 "보상휴가 자동계산 웹앱"에 내장된 도우미입니다. ' +
      '사용자는 현재 특정 페이지를 보고 있으며, 아래에 그 페이지의 "화면에 실제로 표시된 텍스트"가 제공됩니다. ' +
      '항상 이 페이지 내용을 1차 근거로 삼아 한국어로 친절하고 간결하게 답하세요. ' +
      '"휴가 적치 조건"이란 보상휴가가 쌓이는 계산 규칙(가산율/배율, 휴게 공제, 절사 단위, 시간대 구분, ' +
      '근무 유형별 인정 시간 등)을 뜻하므로, 화면에 이런 항목들이 있으면 그것을 근거로 표시 여부를 판단하고 요약하세요. ' +
      '표현이 정확히 "적치"가 아니어도 의미가 같은 규칙이 화면에 있으면 "표시되어 있다"고 보고 구체적으로 설명하세요. ' +
      '화면 텍스트에 실제로 없는 수치나 조건은 지어내지 말고, 그 항목만 "화면에서는 확인되지 않습니다"라고 명시하세요.';

    const userContent =
      '【현재 페이지: ' + (pageTitle || '제목 없음') + '】\n' +
      '----- 페이지 화면 내용 시작 -----\n' +
      context + '\n' +
      '----- 페이지 화면 내용 끝 -----\n\n' +
      '질문: ' + question;

    try {
      const apiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + API_KEY
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          temperature: 0.2,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent }
          ]
        })
      });

      const data = await apiRes.json();
      if (!apiRes.ok) {
        const msg = (data && data.error && data.error.message) || ('OpenAI 오류 (' + apiRes.status + ')');
        return sendJson(res, 502, { error: msg });
      }
      const answer = data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content
        : '(응답을 받지 못했습니다.)';
      return sendJson(res, 200, { answer: answer });
    } catch (e) {
      return sendJson(res, 502, { error: 'OpenAI 호출 실패: ' + e.message });
    }
  });
}

/* ---------- 정적 파일 서빙 ---------- */
function serveStatic(req, res) {
  let urlPath = decodeURIComponent((req.url.split('?')[0] || '/'));
  if (urlPath === '/') urlPath = '/index.html';

  // 경로 탈출 방지
  const safePath = path.normalize(path.join(ROOT, urlPath));
  if (!safePath.startsWith(ROOT)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.stat(safePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    const ext = path.extname(safePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(safePath).pipe(res);
  });
}

/* ---------- 라우터 ---------- */
const server = http.createServer((req, res) => {
  const pathname = (req.url || '/').split('?')[0];
  if (pathname === '/api/chat') {
    return handleChat(req, res);
  }
  return serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log('[server] http://localhost:' + PORT + ' (webapp/ 서빙, /api/chat 프록시, 모델=' + OPENAI_MODEL + ')');
});
