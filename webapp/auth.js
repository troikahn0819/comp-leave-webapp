/* =====================================================================
 * 보상휴가 자동계산 웹앱 - 접근 비밀번호 게이트
 * 보호된 페이지에서 가장 먼저 실행되어, 인증 전에는 어떤 기능도
 * 사용할 수 없도록 로그인 페이지로 즉시 이동시킨다.
 *
 * ⚠️ 참고: 클라이언트(브라우저)에서 동작하는 간단한 잠금이므로
 *    소스코드를 열면 비밀번호를 볼 수 있습니다. 외부 침입 차단용이
 *    아니라 "비인가 사용 방지"를 위한 가벼운 보호 장치입니다.
 * ===================================================================== */
(function () {
  'use strict';

  /* 🔑 비밀번호를 변경하려면 아래 값만 수정하세요. */
  var PASSWORD = '2488';

  var STORAGE_KEY = 'comp-leave-auth';
  var LOGIN_PAGE = 'login.html';

  function isAuthed() {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function login(input) {
    if (input === PASSWORD) {
      try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch (e) {}
      return true;
    }
    return false;
  }

  function logout() {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) {}
    location.replace(LOGIN_PAGE);
  }

  /* 보호된 페이지의 <head> 최상단에서 호출.
   * 인증되지 않았으면 본문이 그려지기 전에 로그인 페이지로 이동. */
  function guard() {
    if (!isAuthed()) {
      location.replace(LOGIN_PAGE);
    }
  }

  window.AppAuth = {
    isAuthed: isAuthed,
    login: login,
    logout: logout,
    guard: guard,
    LOGIN_PAGE: LOGIN_PAGE
  };
})();
