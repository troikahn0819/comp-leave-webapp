/* =====================================================================
 * 보상휴가 자동계산 웹앱 - 공용 계산 엔진 & 유틸리티
 * PRD v0.1 기준. 디자인(마크업)은 변경하지 않으며, 이 스크립트로 동작만 부여한다.
 * ===================================================================== */
(function (global) {
  'use strict';

  /* ---------- 근무 종류 정의 ---------- */
  var WORK_TYPES = ['일반연장근무', '휴일근무', '대체근무', '비상출동', '철야근무'];

  var RULE_PREVIEW = {
    '일반연장근무': ['가산율 1.5배', '4시간 이상 시 30분 휴게 공제', '10분 단위 절사', '22시 이후는 일반연장 불인정'],
    '휴일근무': ['교대근무자 대상', '전일 8h → 12h, 반일 4h → 6h', '가산율 1.5배', '휴게 공제 없음'],
    '대체근무': ['휴일근무와 동일 계산', '평일에 수행 (공휴일 아님)', '전일 12h / 반일 6h'],
    '비상출동': ['주간(06~22) 1.5배, 야간(22~06) 2배', '4시간마다 30분 휴게 공제', '자정 넘김 가능', '10분 단위 절사'],
    '철야근무': ['무조건 야간(22~06), 기본 2배', '4시간마다 30분 휴게 공제 → 철야시간', '익일 평일이면 ×1, 휴일·휴무면 ×2', '근무표(날짜) 조회']
  };

  /* ---------- 시간 유틸리티 ---------- */
  // "1800" → 1080 (분)
  function hhmmToMin(s) {
    s = String(s).replace(/[^0-9]/g, '');
    if (s.length === 3) s = '0' + s;
    if (s.length < 4) s = ('0000' + s).slice(-4);
    var h = parseInt(s.slice(0, 2), 10);
    var m = parseInt(s.slice(2, 4), 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  }

  // 종료시간 셀 해석: "익일0200", "당일2200", "0200" 등. {min, nextDay, raw}
  function parseEnd(rawEnd, startMin) {
    var raw = String(rawEnd == null ? '' : rawEnd).trim();
    var nextDay = false;
    var hasMarker = false;
    if (/익일|다음|\+1|next/i.test(raw)) { nextDay = true; hasMarker = true; }
    if (/당일|금일|same/i.test(raw)) { nextDay = false; hasMarker = true; }
    var endMin = hhmmToMin(raw);
    if (endMin == null) return null;
    if (!hasMarker && endMin <= startMin) nextDay = true; // 자정 넘김 보완
    return { min: endMin, nextDay: nextDay };
  }

  // 분 → "H:MM"
  function fmtHM(min) {
    if (min == null) return '-';
    var neg = min < 0;
    min = Math.abs(Math.round(min));
    var h = Math.floor(min / 60);
    var m = min % 60;
    return (neg ? '-' : '') + h + ':' + (m < 10 ? '0' + m : m);
  }

  // 분 → "Xh" / "Xh Ym" (계산상세용)
  function fmtH(min) {
    var h = Math.floor(min / 60), m = min % 60;
    if (m === 0) return h + 'h';
    return h + 'h ' + m + 'm';
  }

  function floor10(min) { return Math.floor(min / 10) * 10; }

  // 시각(절대분, 0 = 일자 00:00)이 야간(22~06)인지
  function isNight(absMin) {
    var t = ((absMin % 1440) + 1440) % 1440;
    return (t >= 22 * 60) || (t < 6 * 60);
  }

  function addDays(dateStr, n) {
    var p = String(dateStr).split('-');
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    d.setUTCDate(d.getUTCDate() + n);
    return d.getUTCFullYear() + '-' +
      ('0' + (d.getUTCMonth() + 1)).slice(-2) + '-' +
      ('0' + d.getUTCDate()).slice(-2);
  }

  /* ---------- 근무표 (날짜 → 평일/휴일/휴무) ---------- */
  function loadSchedule() {
    try { return JSON.parse(localStorage.getItem('comp_schedule') || '{}'); }
    catch (e) { return {}; }
  }
  function saveSchedule(map) {
    localStorage.setItem('comp_schedule', JSON.stringify(map));
  }
  // 근무표 없을 때 기본 추정: 토/일 휴일, 그 외 평일
  function scheduleStatus(dateStr, map) {
    if (map && map[dateStr]) return map[dateStr];
    var p = String(dateStr).split('-');
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    var wd = d.getUTCDay();
    return (wd === 0 || wd === 6) ? '휴일' : '평일';
  }

  /* ---------- 핵심 계산 ---------- */
  // row: {사번,이름,부서,일자,시작시간,종료시간}
  // 반환: {...row, 근무종류, 계산상세, 적치분, 적치시간(H:MM), 검토상태, 비고, error}
  function calcRow(type, row, schedule) {
    var out = {
      사번: row.사번, 이름: row.이름, 부서: row.부서,
      일자: row.일자, 시작시간: row.시작시간, 종료시간: row.종료시간,
      근무종류: type, 계산상세: '', 적치분: 0, 적치시간: '0:00',
      검토상태: '자동 산정', 비고: '', error: null
    };

    var startMin = hhmmToMin(row.시작시간);
    var end = parseEnd(row.종료시간, startMin);
    if (startMin == null || end == null) {
      out.error = '시간 형식 오류';
      out.검토상태 = '오류';
      out.비고 = '시작/종료시간 확인 필요';
      return out;
    }
    var endAbs = end.min + (end.nextDay ? 1440 : 0);
    var total = endAbs - startMin; // 총 근무 분
    if (total <= 0) {
      out.error = '근무시간 0 이하';
      out.검토상태 = '오류';
      out.비고 = '근무시간 확인 필요';
      return out;
    }
    out.시작시간 = fmtHM(startMin);
    out.종료시간 = (end.nextDay ? '익일' : '') + fmtHM(end.min);

    if (type === '일반연장근무') {
      var cap = 22 * 60; // 22:00
      var effEnd = Math.min(endAbs, cap);
      var work = floor10(Math.max(0, effEnd - startMin)); // 10분 단위 절사(근무시간 기준)
      var br = work >= 240 ? 30 : 0;
      var net = work - br;
      var accrual = net * 1.5;
      out.적치분 = accrual;
      out.계산상세 = fmtH(work) + (br ? ' - 0.5h' : '') + ', 1.5배';
      if (endAbs > cap) { out.비고 = '22시 기준 절단'; out.검토상태 = '검토 필요'; }
      return out;
    }

    if (type === '휴일근무' || type === '대체근무') {
      var fullDay = total >= 6 * 60; // 8h/4h 중 6h 이상이면 전일
      out.적치분 = fullDay ? 720 : 360;
      out.계산상세 = fullDay ? '전일 8h × 1.5' : '반일 4h × 1.5';
      out.비고 = (type === '휴일근무') ? '교대근무' : '-';
      return out;
    }

    if (type === '비상출동') {
      // 구간별 분 누적 + 휴게 공제(4시간 경과 지점 구간에서 차감)
      var dayMin = 0, nightMin = 0;
      var nbreaks = Math.floor(total / 240);
      var breakAt = {}; // elapsed → true
      for (var b = 1; b <= nbreaks; b++) breakAt[b * 240] = true;
      for (var e = 0; e < total; e++) {
        var clock = startMin + e;
        if (isNight(clock)) nightMin++; else dayMin++;
      }
      // 휴게 공제: 각 4시간 경과 지점이 속한 시간대에서 30분 차감
      for (var bp in breakAt) {
        var pt = startMin + parseInt(bp, 10);
        if (isNight(pt)) nightMin -= 30; else dayMin -= 30;
      }
      if (dayMin < 0) dayMin = 0;
      if (nightMin < 0) nightMin = 0;
      var raw = dayMin * 1.5 + nightMin * 2.0;
      out.적치분 = floor10(raw);
      out.계산상세 = '주간 ' + fmtH(dayMin) + ' + 야간 ' + fmtH(nightMin);
      if (end.nextDay) out.비고 = '자정 넘김 / 휴게 ' + (nbreaks * 30) + '분 반영';
      else if (nbreaks) out.비고 = '휴게 ' + (nbreaks * 30) + '분 반영';
      else out.비고 = '-';
      return out;
    }

    if (type === '철야근무') {
      var brk = Math.floor(total / 240) * 30;
      var nightWork = total - brk; // 철야시간
      var nextDate = addDays(row.일자, 1);
      var st = scheduleStatus(nextDate, schedule);
      var mult = (st === '평일') ? 1 : 2;
      out.적치분 = floor10(nightWork * mult);
      out.계산상세 = '철야 ' + fmtH(nightWork) + ', 익일 ' + st;
      out.비고 = (mult === 1) ? '자동휴가 1차감 반영' : '익일 ' + st + ' → ×2';
      return out;
    }

    out.error = '알 수 없는 근무종류';
    out.검토상태 = '오류';
    return out;
  }

  function calcAll(type, rows, schedule) {
    schedule = schedule || loadSchedule();
    return rows.map(function (r) {
      var res = calcRow(type, r, schedule);
      res.적치시간 = fmtHM(res.적치분);
      return res;
    });
  }

  /* ---------- 엑셀 입출력 (SheetJS) ---------- */
  var HEADER_MAP = {
    '사번': '사번', '사원번호': '사번', 'empno': '사번', 'id': '사번',
    '이름': '이름', '성명': '이름', 'name': '이름',
    '부서': '부서', '소속': '부서', 'dept': '부서', 'department': '부서',
    '일자': '일자', '날짜': '일자', 'date': '일자',
    '시작시간': '시작시간', '시작': '시작시간', 'start': '시작시간',
    '종료시간': '종료시간', '종료': '종료시간', 'end': '종료시간', '퇴근': '종료시간'
  };

  function normHeader(h) {
    var key = String(h).trim().toLowerCase().replace(/\s/g, '');
    for (var k in HEADER_MAP) {
      if (key === k.toLowerCase()) return HEADER_MAP[k];
    }
    return String(h).trim();
  }

  function parseWorkbook(arrayBuffer) {
    if (typeof XLSX === 'undefined') throw new Error('XLSX 라이브러리 로드 실패');
    var wb = XLSX.read(arrayBuffer, { type: 'array' });
    var ws = wb.Sheets[wb.SheetNames[0]];
    var raw = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
    if (!raw.length) return [];
    var headers = raw[0].map(normHeader);
    var rows = [];
    for (var i = 1; i < raw.length; i++) {
      var line = raw[i];
      if (!line || line.every(function (c) { return String(c).trim() === ''; })) continue;
      var obj = {};
      headers.forEach(function (h, idx) { obj[h] = line[idx]; });
      rows.push({
        사번: obj['사번'], 이름: obj['이름'], 부서: obj['부서'],
        일자: obj['일자'], 시작시간: obj['시작시간'], 종료시간: obj['종료시간']
      });
    }
    return rows;
  }

  // 근무표 엑셀 파싱: 날짜 → 상태
  function parseScheduleWorkbook(arrayBuffer) {
    var wb = XLSX.read(arrayBuffer, { type: 'array' });
    var ws = wb.Sheets[wb.SheetNames[0]];
    var raw = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
    var map = {};
    if (!raw.length) return map;
    // 헤더에서 날짜/상태 열 찾기
    var headers = raw[0].map(function (h) { return String(h).trim(); });
    var dateIdx = -1, statusIdx = -1;
    headers.forEach(function (h, i) {
      if (/날짜|일자|date/i.test(h)) dateIdx = i;
      if (/상태|구분|status|평일|휴일/i.test(h)) statusIdx = i;
    });
    if (dateIdx === -1) dateIdx = 0;
    if (statusIdx === -1) statusIdx = headers.length - 1;
    for (var i = 1; i < raw.length; i++) {
      var line = raw[i];
      if (!line) continue;
      var d = String(line[dateIdx] || '').trim();
      var s = String(line[statusIdx] || '').trim();
      if (!d) continue;
      // 날짜 정규화 (YYYY-MM-DD)
      var m = d.match(/(\d{4})[.\-/]\s*(\d{1,2})[.\-/]\s*(\d{1,2})/);
      if (m) d = m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
      if (/휴무/.test(s)) s = '휴무';
      else if (/휴일|공휴/.test(s)) s = '휴일';
      else s = '평일';
      map[d] = s;
    }
    return map;
  }

  function exportXLSX(results, filename) {
    if (typeof XLSX === 'undefined') { alert('XLSX 라이브러리 로드 실패'); return; }
    var data = results.map(function (r) {
      return {
        '사번': r.사번, '이름': r.이름, '부서': r.부서, '일자': r.일자,
        '시작시간': r.시작시간, '종료시간': r.종료시간, '근무종류': r.근무종류,
        '계산상세': r.계산상세, '보상휴가 적치시간': r.적치시간, '검토상태': r.검토상태, '비고': r.비고
      };
    });
    var ws = XLSX.utils.json_to_sheet(data);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '보상휴가결과');
    XLSX.writeFile(wb, filename || 'comp_result.xlsx');
  }

  function exportCSV(results, filename) {
    var cols = ['사번', '이름', '부서', '일자', '시작시간', '종료시간', '근무종류', '계산상세', '적치시간', '검토상태', '비고'];
    var head = ['사번', '이름', '부서', '일자', '시작시간', '종료시간', '근무종류', '계산상세', '보상휴가 적치시간', '검토상태', '비고'];
    var lines = [head.join(',')];
    results.forEach(function (r) {
      lines.push(cols.map(function (c) {
        var v = String(r[c] == null ? '' : r[c]).replace(/"/g, '""');
        return /[",\n]/.test(v) ? '"' + v + '"' : v;
      }).join(','));
    });
    var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename || 'comp_result.csv';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  /* ---------- 결과 / 내역 저장 ---------- */
  function saveResults(payload) {
    localStorage.setItem('comp_lastResults', JSON.stringify(payload));
  }
  function loadResults() {
    try { return JSON.parse(localStorage.getItem('comp_lastResults') || 'null'); }
    catch (e) { return null; }
  }
  function addHistory(entry) {
    var list = loadHistory();
    list.unshift(entry);
    localStorage.setItem('comp_history', JSON.stringify(list.slice(0, 100)));
  }
  function loadHistory() {
    try { return JSON.parse(localStorage.getItem('comp_history') || '[]'); }
    catch (e) { return []; }
  }

  function sumAccrual(results) {
    return results.reduce(function (a, r) { return a + (r.적치분 || 0); }, 0);
  }

  /* ---------- 네비게이션 자동 연결 (마크업 미변경) ---------- */
  var NAV_MAP = {
    '대시보드': 'index.html',
    '엑셀 업로드': 'upload.html',
    '계산 결과': 'results.html',
    '근무표 관리': 'schedule.html',
    '계산 규칙': 'rules.html',
    '다운로드 내역': 'history.html'
  };
  function wireNav() {
    var links = document.querySelectorAll('nav a, aside a');
    links.forEach(function (a) {
      var t = (a.textContent || '').trim();
      for (var label in NAV_MAP) {
        if (t === label || t.indexOf(label) !== -1) { a.setAttribute('href', NAV_MAP[label]); break; }
      }
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireNav);
  } else { wireNav(); }

  global.CompEngine = {
    wireNav: wireNav,
    WORK_TYPES: WORK_TYPES,
    RULE_PREVIEW: RULE_PREVIEW,
    hhmmToMin: hhmmToMin,
    fmtHM: fmtHM,
    fmtH: fmtH,
    calcRow: calcRow,
    calcAll: calcAll,
    parseWorkbook: parseWorkbook,
    parseScheduleWorkbook: parseScheduleWorkbook,
    exportXLSX: exportXLSX,
    exportCSV: exportCSV,
    loadSchedule: loadSchedule,
    saveSchedule: saveSchedule,
    scheduleStatus: scheduleStatus,
    saveResults: saveResults,
    loadResults: loadResults,
    addHistory: addHistory,
    loadHistory: loadHistory,
    sumAccrual: sumAccrual
  };
})(window);
