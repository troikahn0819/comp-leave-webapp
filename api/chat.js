/* =====================================================================
 * Vercel 서버리스 함수: ChatGPT 프록시  ( /api/chat )
 *
 * - 브라우저(webapp/chat.js)에서 보낸 질문 + 페이지 내용을 받아
 *   환경변수 GPT_API_KEY 로 OpenAI API 를 서버 측에서 호출한다.
 * - 키는 Vercel 환경변수에만 존재하며 브라우저로 노출되지 않는다.
 *
 * 로컬 개발은 루트의 server.js 가 동일한 역할을 한다.
 * ===================================================================== */
'use strict';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST 만 허용됩니다.' });
    return;
  }

  const API_KEY = process.env.GPT_API_KEY;
  const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  if (!API_KEY) {
    res.status(503).json({ error: 'API 키가 설정되지 않았습니다. Vercel 환경변수 GPT_API_KEY 를 확인하세요.' });
    return;
  }

  // body 파싱 (Vercel 이 JSON 을 자동 파싱하지만, 문자열/미파싱 대비)
  let payload = req.body;
  if (payload == null || typeof payload === 'string') {
    payload = await new Promise((resolve) => {
      let raw = '';
      req.on('data', (c) => {
        raw += c;
        if (raw.length > 1e6) req.destroy();
      });
      req.on('end', () => {
        try { resolve(JSON.parse(raw || '{}')); }
        catch (e) { resolve({}); }
      });
      req.on('error', () => resolve({}));
    });
  }

  const question = (payload.question || '').toString().trim();
  const pageTitle = (payload.pageTitle || '').toString().slice(0, 200);
  let context = (payload.context || '').toString();
  if (context.length > 8000) context = context.slice(0, 8000) + '\n…(이하 생략)';

  if (!question) {
    res.status(400).json({ error: '질문이 비어 있습니다.' });
    return;
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
      res.status(502).json({ error: msg });
      return;
    }
    const answer = data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : '(응답을 받지 못했습니다.)';
    res.status(200).json({ answer: answer });
  } catch (e) {
    res.status(502).json({ error: 'OpenAI 호출 실패: ' + e.message });
  }
};
