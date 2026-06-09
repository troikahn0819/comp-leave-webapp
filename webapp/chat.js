/* =====================================================================
 * 보상휴가 자동계산 웹앱 - 페이지 내장 ChatGPT 대화창
 *
 * - 모든 보호된 페이지에 떠 있는 채팅 위젯을 주입한다.
 * - 질문 시 현재 페이지의 "화면에 보이는 텍스트"를 함께 서버(/api/chat)로
 *   보내서, 휴가 적치 조건 등이 제대로 표시되는지 GPT 가 답하도록 한다.
 * - API 키는 서버(server.js)에서만 사용되며 브라우저로 노출되지 않는다.
 * ===================================================================== */
(function () {
  'use strict';

  // 인증되지 않은 상태(로그인 페이지 등)에서는 위젯을 띄우지 않는다.
  if (window.AppAuth && typeof AppAuth.isAuthed === 'function' && !AppAuth.isAuthed()) {
    return;
  }

  var ENDPOINT = '/api/chat';

  /* ---------- 페이지에서 보이는 텍스트 수집 ---------- */
  function collectPageContext() {
    var main = document.querySelector('main') || document.body;
    var clone = main.cloneNode(true);
    // 채팅 위젯 자신과 스크립트/스타일은 제외
    clone.querySelectorAll('#cg-chat-root, script, style, noscript').forEach(function (el) {
      el.remove();
    });
    var text = (clone.innerText || clone.textContent || '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    return text;
  }

  /* ---------- DOM 생성 ---------- */
  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (html != null) n.innerHTML = html;
    return n;
  }

  var STYLE = '\
#cg-chat-root{position:fixed;right:20px;bottom:20px;z-index:9999;font-family:Inter,system-ui,sans-serif}\
#cg-fab{width:56px;height:56px;border-radius:9999px;background:#0050cb;color:#fff;border:none;cursor:pointer;\
  box-shadow:0 6px 20px -4px rgba(0,80,203,.5);display:flex;align-items:center;justify-content:center;transition:transform .15s,background .15s}\
#cg-fab:hover{background:#0066ff;transform:translateY(-2px)}\
#cg-fab .material-symbols-outlined{font-size:26px}\
#cg-panel{position:absolute;right:0;bottom:72px;width:360px;max-width:calc(100vw - 40px);height:480px;max-height:calc(100vh - 120px);\
  background:#fff;border:1px solid #c2c6d8;border-radius:14px;box-shadow:0 12px 40px -8px rgba(25,27,36,.28);\
  display:none;flex-direction:column;overflow:hidden}\
#cg-panel.open{display:flex}\
#cg-head{display:flex;align-items:center;gap:8px;padding:12px 14px;background:#0050cb;color:#fff;flex-shrink:0}\
#cg-head .ttl{font-size:14px;font-weight:600;flex:1}\
#cg-head button{background:transparent;border:none;color:#fff;cursor:pointer;padding:4px;border-radius:6px;display:flex}\
#cg-head button:hover{background:rgba(255,255,255,.18)}\
#cg-body{flex:1;overflow-y:auto;padding:14px;background:#faf8ff;display:flex;flex-direction:column;gap:10px}\
.cg-msg{max-width:85%;padding:9px 12px;border-radius:12px;font-size:13px;line-height:1.5;white-space:pre-wrap;word-break:break-word}\
.cg-user{align-self:flex-end;background:#0050cb;color:#fff;border-bottom-right-radius:3px}\
.cg-bot{align-self:flex-start;background:#ecedfa;color:#191b24;border-bottom-left-radius:3px}\
.cg-bot.err{background:#ffdad6;color:#93000a}\
.cg-hint{align-self:center;color:#727687;font-size:12px;text-align:center;padding:6px 10px}\
.cg-typing{align-self:flex-start;color:#727687;font-size:12px;font-style:italic}\
#cg-suggest{display:flex;flex-wrap:wrap;gap:6px;padding:0 14px 8px;background:#faf8ff}\
.cg-chip{font-size:11px;border:1px solid #c2c6d8;background:#fff;color:#424656;border-radius:9999px;padding:5px 10px;cursor:pointer}\
.cg-chip:hover{border-color:#0050cb;color:#0050cb}\
#cg-foot{display:flex;gap:8px;padding:10px;border-top:1px solid #c2c6d8;background:#fff;flex-shrink:0}\
#cg-input{flex:1;resize:none;border:1px solid #c2c6d8;border-radius:10px;padding:9px 10px;font-size:13px;font-family:inherit;\
  max-height:88px;outline:none}\
#cg-input:focus{border-color:#0050cb;box-shadow:0 0 0 1px #0050cb}\
#cg-send{width:40px;border:none;border-radius:10px;background:#0050cb;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center}\
#cg-send:hover{background:#0066ff}\
#cg-send:disabled{opacity:.5;cursor:not-allowed}\
';

  function init() {
    if (document.getElementById('cg-chat-root')) return;

    var style = el('style', null, STYLE);
    document.head.appendChild(style);

    var root = el('div', { id: 'cg-chat-root' });
    root.innerHTML = '\
<div id="cg-panel" role="dialog" aria-label="ChatGPT 도우미">\
  <div id="cg-head">\
    <span class="material-symbols-outlined" style="font-size:20px">smart_toy</span>\
    <span class="ttl">ChatGPT 도우미</span>\
    <button id="cg-close" aria-label="닫기"><span class="material-symbols-outlined" style="font-size:20px">close</span></button>\
  </div>\
  <div id="cg-body">\
    <div class="cg-hint">이 페이지에 보이는 휴가 적치 조건·계산 규칙에 대해 물어보세요.<br>화면 내용을 근거로 답합니다.</div>\
  </div>\
  <div id="cg-suggest">\
    <button class="cg-chip">이 페이지의 휴가 적치 조건이 제대로 표시돼 있나요?</button>\
    <button class="cg-chip">화면에 보이는 계산 규칙을 요약해줘</button>\
    <button class="cg-chip">가산율·휴게 공제 조건이 빠진 게 있나요?</button>\
  </div>\
  <div id="cg-foot">\
    <textarea id="cg-input" rows="1" placeholder="질문을 입력하세요…"></textarea>\
    <button id="cg-send" aria-label="전송"><span class="material-symbols-outlined" style="font-size:20px">send</span></button>\
  </div>\
</div>\
<button id="cg-fab" aria-label="ChatGPT 도우미 열기"><span class="material-symbols-outlined">chat</span></button>';
    document.body.appendChild(root);

    var fab = root.querySelector('#cg-fab');
    var panel = root.querySelector('#cg-panel');
    var closeBtn = root.querySelector('#cg-close');
    var body = root.querySelector('#cg-body');
    var input = root.querySelector('#cg-input');
    var sendBtn = root.querySelector('#cg-send');
    var suggest = root.querySelector('#cg-suggest');
    var busy = false;

    function toggle(open) {
      var willOpen = open != null ? open : !panel.classList.contains('open');
      panel.classList.toggle('open', willOpen);
      if (willOpen) setTimeout(function () { input.focus(); }, 50);
    }
    fab.addEventListener('click', function () { toggle(); });
    closeBtn.addEventListener('click', function () { toggle(false); });

    function addMsg(text, cls) {
      var m = el('div', { class: 'cg-msg ' + cls });
      m.textContent = text;
      body.appendChild(m);
      body.scrollTop = body.scrollHeight;
      return m;
    }

    function autoGrow() {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 88) + 'px';
    }
    input.addEventListener('input', autoGrow);

    async function ask(question) {
      if (busy || !question.trim()) return;
      busy = true;
      sendBtn.disabled = true;
      addMsg(question, 'cg-user');
      input.value = '';
      autoGrow();

      var typing = el('div', { class: 'cg-typing' }, '답변을 작성하는 중…');
      body.appendChild(typing);
      body.scrollTop = body.scrollHeight;

      try {
        var res = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: question,
            pageTitle: document.title,
            context: collectPageContext()
          })
        });
        var data = await res.json();
        typing.remove();
        if (res.ok && data.answer) {
          addMsg(data.answer, 'cg-bot');
        } else {
          addMsg('오류: ' + (data.error || ('요청 실패 (' + res.status + ')')), 'cg-bot err');
        }
      } catch (e) {
        typing.remove();
        addMsg('네트워크 오류: ' + e.message, 'cg-bot err');
      } finally {
        busy = false;
        sendBtn.disabled = false;
        input.focus();
      }
    }

    sendBtn.addEventListener('click', function () { ask(input.value); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        ask(input.value);
      }
    });
    suggest.querySelectorAll('.cg-chip').forEach(function (chip) {
      chip.addEventListener('click', function () { ask(chip.textContent); });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
