/* center-engine.js — 자동 생성 파일(직접 고치지 말고 제작기에서 다시 받으세요) · Created by 마케팅지니 · 브라우저(정적 호스팅)와 Netlify 함수가 함께 씁니다 */
(function(){
'use strict';
/* ============ [A] 도우미: 글자·전화·날짜·색 ============ */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nl2br = s => esc(s).replace(/\n/g, '<br>');
const num = v => { const n = parseInt(String(v == null ? '' : v).replace(/\D/g, ''), 10); return isNaN(n) ? null : n; };
const won = n => Number(n).toLocaleString('ko-KR');
const hasBatchim = w => { const c = (w || '').charCodeAt((w || '').length - 1); return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0; };
const pad2 = n => String(n).padStart(2, '0');
const todayYmd = () => { const t = new Date(); return t.getFullYear() + pad2(t.getMonth() + 1) + pad2(t.getDate()); };
const todayIso = () => { const t = new Date(); return t.getFullYear() + '-' + pad2(t.getMonth() + 1) + '-' + pad2(t.getDate()); };
/* [A-2] 공통 모듈(원본: 위쪽 <script id="src-core">). 수가·식비·도메인·내보내기 규칙은 전부 CORE 를 거친다. center-engine.js 에는 이 줄 대신 모듈 글이 그대로 들어간다. */
const CORE = (function(){
/* ============================================================================
 * 센터 제작기 · 공통 모듈 CenterCore                     Created by 마케팅지니
 * ----------------------------------------------------------------------------
 * 무엇인가: 제작기 화면 · 센터 홈페이지의 center-engine.js(브라우저) · Netlify 함수(center.js) ·
 *           점검 스크립트(qa/verify.mjs)가 "똑같은 코드"를 쓰도록 한곳에 모은 순수 함수 묶음.
 * 규칙:
 *   - 화면(DOM)·파일에 손대지 않는다. 브라우저와 Node 어디서나 같은 결과가 나온다.
 *   - 제작기 HTML 안의 <script type="text/plain" id="src-core"> 에만 원본이 있다.
 *     center-engine.js 를 만들 때 이 글을 그대로 넣는다(복사본을 따로 고치지 않는다).
 *   - 다른 코드는 이 모듈을 통해서만 수가·식비·도메인·내보내기 규칙을 다룬다.
 * 지켜야 할 약속(깨지면 점검 스크립트가 빨간불):
 *   1) 중앙 수가는 status 'official' + 한국시간(KST) 시행일이 지난 것만 자동 적용. 'proposal'은 절대 자동 적용 안 함.
 *   2) 센터별 식재료비·간식비(0원 포함)는 수가 동기화로 덮어쓰지 않는다.
 *   3) 공개(배포) 폴더에는 제작기 입력값 JSON·내부 안내 파일을 넣지 않는다.
 * ========================================================================== */
var CenterCore = (function () {
  'use strict';

  /** 이 모듈의 버전(점검 리포트에 찍힘) */
  var VERSION = '1.0.0';

  /** 값이 비어 있을 때만 쓰는 안전용 기본 식비(원). 센터가 0원을 입력하면 0이 그대로 쓰인다. */
  var FEE_DEFAULTS = Object.freeze({ meal: 3500, snack: 1500 });

  /* ======================= 1. 금액 · 식비 ======================= */

  /**
   * 금액 입력을 0 이상의 정수(원)로 바꾼다. 0은 그대로 0, 쉼표·'원'·공백은 무시한다.
   * 잘못된 값(음수·글자)은 0.
   * @param {*} v 입력값(숫자 또는 "3,500원" 같은 글자)
   * @returns {number}
   */
  function price(v) {
    if (v == null) return 0;
    var n = typeof v === 'number' ? v : Number(String(v).replace(/[,\s원]/g, ''));
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  }

  /**
   * 천 단위 쉼표를 넣은 금액 글자(예: 3500 → "3,500"). 서버·브라우저 언어 설정과 상관없이 같은 결과.
   * @param {number|string} n
   * @returns {string}
   */
  function won(n) {
    var x = Number(n);
    if (!Number.isFinite(x)) return String(n);
    var s = String(Math.round(Math.abs(x))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (x < 0 ? '-' : '') + s;
  }

  /**
   * 글 속의 식재료비·간식비 금액을 센터 입력값으로 바꾼다. 0원도 그대로 들어간다.
   * 바꾸는 모양: "식재료비 1식 ○○원", "간식비 1회 ○○원", {{mealFee}}, {{snackFee}}
   * (임의의 다른 문장 속 금액은 추측해서 바꾸지 않는다)
   * @param {string} text 원문(FAQ 등)
   * @param {*} mealFee 식재료비 1식
   * @param {*} snackFee 간식비 1회
   * @returns {string}
   */
  function substituteFees(text, mealFee, snackFee) {
    var m = won(price(mealFee)), s = won(price(snackFee));
    return String(text == null ? '' : text)
      .replace(/(식재료비\s*1식\s*)[\d,]+\s*원/g, '$1' + m + '원')
      .replace(/(간식비\s*1회\s*)[\d,]+\s*원/g, '$1' + s + '원')
      .replace(/\{\{mealFee\}\}/g, m).replace(/\{\{snackFee\}\}/g, s);
  }

  /**
   * "하루 식비·간식비" 예시 금액. 비워진 값(null)일 때만 기본값을 쓴다(0원은 0원).
   * 점심만이면 식재료비 1번, 점심+저녁이면 2번 + 간식비 1회.
   * @param {number|null} meal 식재료비 1식
   * @param {number|null} snack 간식비 1회
   * @param {boolean} hasDinner 저녁 제공 여부
   * @returns {number}
   */
  function nonCoverExample(meal, snack, hasDinner) {
    var m = meal == null ? FEE_DEFAULTS.meal : meal, s = snack == null ? FEE_DEFAULTS.snack : snack;
    return m * (hasDinner ? 2 : 1) + s;
  }

  /* ======================= 2. 중앙 수가(ltc-rates.json) ======================= */

  /** 수가 객체에 들어 있는 1~5등급·인지지원 8~10시간 금액을 센터 입력칸 이름으로 옮길 때 쓰는 키 */
  var RATE_KEYS = ['fee1', 'fee2', 'fee3', 'fee4', 'fee5', 'feeCog'];

  /** 제작기에 내장된 수가(연도별). 중앙 파일 ltc-rates.json 과 같은 숫자여야 한다(점검 스크립트가 대조). */
  var RATE_PRESETS = {
 '2026': {"day": [[41820, 56060, 69730], [38720, 51930, 64590], [35740, 47940, 59640], [34120, 46300, 58010], [32490, 44650, 56360], [32490, 44650, 56360]], "visit": {"150": 50640, "180": 57020, "210": 63530, "240": 70080}, "facility": {"home": {"1": 93070, "2": 86340, "3": 81540}, "group": {"1": 74590, "2": 69210, "3": 63800}},year:2026,status:'official',effectiveFrom:'2026-01-01',day8:[69730,64590,59640,58010,56360,56360],limits:[2512900,2331200,1528200,1409700,1208900,676320]},
 '2027': {surcharge:{dayHoliday:30,visitSun:30,visitHoliday:60},"day": [[43300, 58040, 72190], [40090, 53760, 66870], [37000, 49630, 61750], [35320, 47930, 60060], [33640, 46230, 58350], [33640, 46230, 58350]], "visit": {"150": 52560, "180": 59190, "210": 65940, "240": 72740}, "facility": {"home": {"1": 96380, "2": 89410, "3": 84440}, "group": {"1": 77260, "2": 71690, "3": 66080}},knownVisit180:59190,source:'https://www.mohw.go.kr/board.es?mid=a10503010100&bid=0027&act=view&list_no=1492396',year:2027,status:'proposal',effectiveFrom:'2027-01-01',day8:[72190,66870,61750,60060,58350,58350],limits:[2891400,2682300,1586300,1462000,1254900,700200]}
};

  /**
   * 한국시간(KST, UTC+9) 기준 오늘 날짜 "YYYY-MM-DD". 컴퓨터 시간대와 상관없다.
   * @param {Date} [now]
   * @returns {string}
   */
  function todayKst(now) {
    return new Date((now || new Date()).getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  }

  /**
   * 수가 1개 연도 항목의 모양·금액이 올바른지 검사한다(schema 검증).
   * 필수: year(2026~2099 정수), status('official'|'proposal'), effectiveFrom(그 해의 실제 날짜 YYYY-MM-DD),
   *       day8·limits(양의 정수 6개). 선택: day(6×3, 3번째 = day8), visit, surcharge(0~100), facility, knownVisit180
   * @param {object} r
   * @returns {boolean}
   */
  function rateValid(r) {
    var ints = function (a, n) { return Array.isArray(a) && a.length === n && a.every(function (x) { return Number.isSafeInteger(x) && x > 0 && x < 10000000; }); };
    return !!r && Number.isInteger(r.year) && r.year >= 2026 && r.year < 2100 &&
      ['official', 'proposal'].includes(r.status) && /^\d{4}-\d{2}-\d{2}$/.test(r.effectiveFrom || '') &&
      r.effectiveFrom.startsWith(String(r.year)) && Number.isFinite(Date.parse(r.effectiveFrom)) && new Date(r.effectiveFrom).toISOString().slice(0, 10) === r.effectiveFrom &&
      ints(r.day8, 6) && ints(r.limits, 6) &&
      (!r.day || (Array.isArray(r.day) && r.day.length === 6 && r.day.every(function (x, i) { return ints(x, 3) && x[2] === r.day8[i]; }))) &&
      (!r.visit || [150, 180, 210, 240].every(function (k) { return ints([r.visit[k]], 1); })) &&
      (!r.surcharge || ['dayHoliday', 'visitSun', 'visitHoliday'].every(function (k) { return Number.isInteger(r.surcharge[k]) && r.surcharge[k] >= 0 && r.surcharge[k] <= 100; })) &&
      (!r.knownVisit180 || ints([r.knownVisit180], 1)) &&
      (!r.facility || ['home', 'group'].every(function (k) { return r.facility[k] && ['1', '2', '3'].every(function (g) { return ints([r.facility[k][g]], 1); }); }));
  }

  /**
   * 수가를 센터 입력값에 적용한다. 등급별 급여비용·연도·rateSnapshot만 바꾸고
   * 식재료비·간식비·센터 이름 등 센터별 값은 건드리지 않는다.
   * @param {object} d 센터 입력값
   * @param {object} r 검증을 통과해야 하는 수가 항목
   * @returns {object} 새 입력값(원본은 그대로)
   * @throws {Error} 수가 항목이 올바르지 않을 때
   */
  function applyRate(d, r) {
    if (!rateValid(r)) throw Error('수가 파일의 필수 항목 또는 금액이 올바르지 않습니다.');
    var n = Object.assign({}, d, { feeYear: String(r.year), feeBand: '8시간 이상~10시간 미만', rateSnapshot: JSON.parse(JSON.stringify(r)) });
    RATE_KEYS.forEach(function (k, i) { n[k] = String(r.day8[i]); });
    return n;
  }

  /**
   * 중앙 수가 파일 내용에서 "지금 자동 적용해도 되는" 항목 하나를 고른다.
   * 조건: schemaVersion 1 · 검증 통과 · status 'official' · 시행일(KST) 도달 · 연도 ≥ 센터의 현재 기준 연도.
   * 'proposal'(의결안)은 시행일이 지나도 절대 고르지 않는다. 여럿이면 가장 최신 연도.
   * @param {object} data 중앙 파일을 JSON.parse 한 값
   * @param {string|number} feeYear 센터의 현재 기준 연도
   * @param {string} today KST 오늘 "YYYY-MM-DD"
   * @returns {object|null}
   */
  function pickAutoRate(data, feeYear, today) {
    if (!data || data.schemaVersion !== 1 || !Array.isArray(data.years)) return null;
    var c = data.years.filter(function (r) { return rateValid(r) && r.status === 'official' && r.effectiveFrom <= today && r.year >= Number(feeYear); });
    c.sort(function (a, b) { return b.year - a.year || b.effectiveFrom.localeCompare(a.effectiveFrom); });
    return c.length ? c[0] : null;
  }

  /**
   * 중앙 수가를 가져와 센터 입력값에 반영한다. 어떤 실패(통신·형식·시행 전·의결안)에서도
   * 입력값을 그대로(같은 객체로) 돌려주므로 호출한 쪽은 `결과 === 입력`으로 "바뀐 게 없음"을 알 수 있다.
   * @param {object} d 센터 입력값(remoteRates, ratesUrl, feeYear 사용)
   * @param {string} [date] 시험용 "오늘"(KST, YYYY-MM-DD). 없으면 지금.
   * @param {{fetch?:Function, timeoutMs?:number}} [opts] 시험용 fetch 대체
   * @returns {Promise<object>}
   */
  async function syncRate(d, date, opts) {
    opts = opts || {};
    if (d.remoteRates === false || !d.ratesUrl) return d;
    var doFetch = opts.fetch || (typeof fetch === 'function' ? fetch : null);
    if (!doFetch) return d;
    try {
      var u = new URL(d.ratesUrl); if (u.protocol !== 'https:') return d;
      var init = { cache: 'no-store' };
      if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) init.signal = AbortSignal.timeout(opts.timeoutMs || 4500);
      var response = await doFetch(u.href, init);
      if (!response.ok) return d;
      var text = await response.text(); if (text.length > 200000) return d;
      var hit = pickAutoRate(JSON.parse(text), d.feeYear, date || todayKst());
      return hit ? applyRate(d, hit) : d;
    } catch (e) { return d; }
  }

  /**
   * 수가가 "실제로 바뀌었는지" 비교하기 위한 지문(글자). 같으면 화면을 다시 그리지 않는다.
   * @param {object} [r] rateSnapshot
   * @returns {string}
   */
  function rateFingerprint(r) {
    r = r || {};
    return JSON.stringify([r.year, r.day8, r.limits, r.day, r.visit, r.facility, r.surcharge || { dayHoliday: 30, visitSun: 30, visitHoliday: 50 }]);
  }

  /**
   * 이 입력값이 의결안(확정 전) 수가를 쓰고 있는가. 화면 곳곳의 "고시/의결안" 표시를 한 곳에서 정한다.
   * @param {object} d
   * @returns {boolean}
   */
  function isProposal(d) { return !!(d && d.rateSnapshot && d.rateSnapshot.status === 'proposal'); }

  /* ======================= 3. 도메인 정규화 · 주소 ======================= */

  /** 두 단계 공용 접미사(도메인 이름 앞에 한 칸이 더 붙는 것). 센터는 .co.kr·.or.kr 이 흔하다. */
  var SECOND_LEVEL = ['co.kr', 'or.kr', 'ne.kr', 'pe.kr', 're.kr', 'go.kr', 'ac.kr', 'hs.kr', 'ms.kr', 'es.kr', 'sc.kr', 'kg.kr', 'mil.kr',
    'seoul.kr', 'busan.kr', 'daegu.kr', 'incheon.kr', 'gwangju.kr', 'daejeon.kr', 'ulsan.kr', 'sejong.kr', 'gyeonggi.kr', 'gangwon.kr',
    'chungbuk.kr', 'chungnam.kr', 'jeonbuk.kr', 'jeonnam.kr', 'gyeongbuk.kr', 'gyeongnam.kr', 'jeju.kr',
    'co.uk', 'org.uk', 'com.au', 'co.jp', 'com.cn', 'com.tw', 'co.nz', 'com.sg', 'com.hk'];

  /**
   * 자체 도메인 입력을 정리하고 검사한다.
   * 받아 주는 모양: example.com / HTTPS://WWW.Example.com/경로?x#y / example.co.kr / care.example.com / 한글.kr(xn-- 로 바뀜)
   * - 주소 앞(http://)·뒤(경로·포트)는 버리고 소문자로 바꾼다.
   * - 맨 앞 www. 는 뺀다(www 는 GitHub 가 알아서 이어 줌). 결과 host 는 예: example.com
   * - 와일드카드(*), IP 주소, localhost, 공백·밑줄, GitHub/Netlify 기본 주소는 거절한다.
   * @param {string} input
   * @returns {{ok:boolean, empty:boolean, input:string, host:string, kind:('apex'|'subdomain'|''), sub:string, typedWww:boolean,
   *            url:string, errors:string[], notes:string[]}}
   *   kind: 'apex' = 이름만 있는 도메인(example.com), 'subdomain' = 앞에 이름이 더 붙은 도메인(care.example.com)
   */
  function normalizeDomain(input) {
    var raw = String(input == null ? '' : input).trim();
    var res = { ok: false, empty: false, input: raw, host: '', kind: '', sub: '', typedWww: false, url: '', errors: [], notes: [] };
    var fail = function (m) { res.errors.push(m); return res; };
    if (!raw) { res.empty = true; return res; }
    var s = raw.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').replace(/^[^\/?#@]*@/, '').split(/[\/?#]/)[0].replace(/:\d+$/, '').replace(/\.+$/, '').toLowerCase();
    if (!s) return fail('도메인을 알아볼 수 없어요. 예) example.com');
    if (/\s/.test(s)) return fail('도메인 안에는 빈칸을 넣을 수 없어요.');
    if (s.indexOf('*') >= 0) return fail('와일드카드(*) 도메인은 쓰지 않아요. 도메인 탈취 위험이 있어 GitHub가 권하지 않아요.');
    var host;
    try { host = new URL('http://' + s).hostname; } catch (e) { return fail('도메인 모양이 올바르지 않아요: ' + raw); }
    var asciiHost = host, labels = host.split('.');
    if (labels.length < 2) return fail('점(.)이 들어간 도메인 전체를 적어 주세요. 예) example.com');
    if (/^\d+(\.\d+){3}$/.test(host)) return fail('IP 주소는 도메인이 아니에요. 예) example.com');
    if (host.length > 253 || !labels.every(function (l) { return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(l); })) return fail('도메인은 영문 소문자·숫자·하이픈(-)만 쓸 수 있고, 하이픈으로 시작하거나 끝날 수 없어요.');
    if (!/^(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/.test(labels[labels.length - 1])) return fail('도메인 끝(.com · .kr 등)이 올바르지 않아요.');
    if (/(^|\.)github\.io$/.test(host)) return fail('"' + host + '"은 GitHub 기본 주소예요. 이 칸은 직접 산 도메인(예: example.com)을 적는 칸이에요.');
    if (/(^|\.)netlify\.app$/.test(host)) return fail('"' + host + '"은 Netlify 기본 주소예요. 이 칸은 직접 산 도메인을 적는 칸이에요.');
    var regLen = function (h) { var l = h.split('.'); return SECOND_LEVEL.indexOf(l.slice(-2).join('.')) >= 0 ? 3 : 2; };
    if (labels.length < regLen(host)) return fail('"' + host + '"은 도메인 끝부분이에요. 앞에 이름까지 적어 주세요. 예) example.' + host);
    if (labels[0] === 'www' && labels.length - 1 >= regLen(host)) { res.typedWww = true; host = host.slice(4); labels = host.split('.'); res.notes.push('앞의 www. 는 빼고 ' + host + ' 로 적용했어요. (www 주소는 GitHub가 자동으로 연결해 줘요)'); }
    if (asciiHost !== s) res.notes.push('한글 등 특수 글자 도메인은 ' + host + ' 형태로 바뀌어 적용돼요.');
    res.kind = labels.length === regLen(host) ? 'apex' : 'subdomain';
    res.sub = labels.slice(0, labels.length - regLen(host)).join('.');
    res.host = host; res.url = 'https://' + host + '/'; res.ok = true;
    return res;
  }

  /**
   * 끝에 / 가 없으면 붙인다. 주소가 도메인만 있을 때("https://a.com")도 붙인다(페이지 주소가 붙어 버리는 사고 방지).
   * 파일 이름으로 끝나는 주소(…/index.html)는 그대로 둔다.
   * @param {string} u
   * @returns {string}
   */
  function ensureTrailingSlash(u) {
    u = String(u == null ? '' : u).trim();
    if (/^https?:\/\/[^\/?#]+$/i.test(u)) return u + '/';
    if (!/\/$/.test(u) && !/\.[a-z0-9]+$/i.test(u.split('/').pop())) u += '/';
    return u;
  }

  /**
   * 센터 입력값에서 홈페이지 공개 주소를 정한다. 자체 도메인이 올바르게 들어 있으면 그 도메인이 우선이고
   * (정규 주소·og:url·og:image·사이트맵·robots·llms.txt 모두 이 한 값에서 나온다), 아니면 "홈페이지 공개 주소" 칸을 쓴다.
   * @param {{customDomain?:string, url?:string}} d
   * @returns {{url:string, source:('customDomain'|'url'), domain:(object|null)}}
   */
  function resolveSiteUrl(d) {
    var dom = normalizeDomain(d && d.customDomain);
    if (dom.ok) return { url: dom.url, source: 'customDomain', domain: dom };
    return { url: ensureTrailingSlash((d && d.url) || 'https://example.com/'), source: 'url', domain: dom.empty ? null : dom };
  }

  /**
   * 페이지 주소. index.html 은 사이트 맨 앞 주소(끝 /)로 쓴다.
   * @param {string} baseUrl 끝에 /가 있는 사이트 주소
   * @param {string} file 'index.html' | 'about.html' …
   * @returns {string}
   */
  function pageUrl(baseUrl, file) { return !file || file === 'index.html' ? baseUrl : baseUrl + file; }

  /**
   * 카톡 미리보기 그림 주소 끝 ?v= 값을 새로 만든다(카카오톡이 옛 그림을 기억하는 문제 방지).
   * 같은 날 다시 바꾸면 a → b → c … 로 올라간다. 모양: 20261120a
   * @param {string} [prev] 지금 값
   * @param {Date} [now]
   * @returns {string}
   */
  function bumpOgVersion(prev, now) {
    var ymd = todayKst(now).replace(/-/g, '');
    var m = String(prev || '').match(/^(\d{8})([a-z]?)(.*)$/);
    if (!m || m[1] !== ymd) return ymd + 'a';
    if (!m[2]) return ymd + 'a';
    return m[2] === 'z' ? ymd + 'z1' : ymd + String.fromCharCode(m[2].charCodeAt(0) + 1);
  }

  /* ======================= 4. GitHub Pages 연결 · DNS 안내 ======================= */

  /** GitHub Pages 공식 A 레코드 4개(도메인 본체 @ 용) */
  var PAGES_A = Object.freeze(['185.199.108.153', '185.199.109.153', '185.199.110.153', '185.199.111.153']);
  /** (선택) IPv6 AAAA 레코드 4개 */
  var PAGES_AAAA = Object.freeze(['2606:50c0:8000::153', '2606:50c0:8001::153', '2606:50c0:8002::153', '2606:50c0:8003::153']);

  /**
   * GitHub 조직(또는 계정) 이름을 정리한다. "https://ilwol-daycare.github.io/" 도 받아 "ilwol-daycare" 로 만든다.
   * @param {string} v
   * @returns {{ok:boolean, org:string, error:string}}
   */
  function parseGithubOrg(v) {
    var s = String(v == null ? '' : v).trim().toLowerCase().replace(/^https?:\/\//, '').split(/[\/?#]/)[0].replace(/\.github\.io$/, '');
    if (!s) return { ok: false, org: '', error: '' };
    if (!/^[a-z0-9](?:[a-z0-9]|-(?!-)){0,38}$/.test(s) || /-$/.test(s)) return { ok: false, org: '', error: 'GitHub 조직 이름은 영문 소문자·숫자·하이픈(-)만, 39자 이하예요.' };
    return { ok: true, org: s, error: '' };
  }

  /**
   * 공개 주소가 https://조직.github.io/ 모양이면 조직 이름을 알아낸다.
   * @param {string} url
   * @returns {string} 없으면 ''
   */
  function inferGithubOrg(url) {
    var m = String(url || '').trim().toLowerCase().match(/^https:\/\/([a-z0-9-]+)\.github\.io(?:\/|$)/);
    return m && parseGithubOrg(m[1]).ok ? m[1] : '';
  }

  /**
   * 자체 도메인 연결 계획 한 묶음을 만든다(DNS 안내·점검 목록·내보내기 규칙이 모두 이것을 쓴다).
   * @param {object} d 센터 입력값(customDomain, ghOrg, url, hostTarget, ogVer, sample)
   * @returns {{hostTarget:string, domain:object, org:string, orgSource:string, target:string, targetKnown:boolean,
   *           siteUrl:string, records:Array, optionalRecords:Array, forbidden:Array, cname:(string|null),
   *           problems:string[], ready:boolean}}
   */
  function buildDomainPlan(d) {
    d = d || {};
    var dom = normalizeDomain(d.customDomain);
    var parsed = parseGithubOrg(d.ghOrg), org = parsed.ok ? parsed.org : '', orgSource = org ? 'input' : '';
    if (!org) { org = inferGithubOrg(d.url); if (org) orgSource = 'url'; }
    var target = org ? org + '.github.io' : '<조직이름>.github.io';
    var records = [], optional = [];
    if (dom.ok && dom.kind === 'apex') {
      PAGES_A.forEach(function (ip) { records.push({ type: 'A', host: '@', value: ip }); });
      records.push({ type: 'CNAME', host: 'www', value: target });
      PAGES_AAAA.forEach(function (ip) { optional.push({ type: 'AAAA', host: '@', value: ip }); });
    } else if (dom.ok) {
      records.push({ type: 'CNAME', host: dom.sub, value: target });
    }
    var problems = [];
    if (dom.empty) problems.push('자체 도메인 칸이 비어 있어요.');
    else if (!dom.ok) problems = problems.concat(dom.errors);
    if (parsed.error) problems.push(parsed.error);
    if (!org) problems.push('GitHub 조직 이름을 알 수 없어요. "GitHub 조직 이름" 칸에 적어 주세요. (예: ilwol-daycare)');
    return {
      hostTarget: d.hostTarget === 'netlify' ? 'netlify' : 'github', domain: dom, org: org, orgSource: orgSource, target: target, targetKnown: !!org,
      siteUrl: dom.ok ? dom.url : ensureTrailingSlash(d.url || ''), records: records, optionalRecords: optional,
      forbidden: [{ type: 'A/CNAME', host: '*', why: '와일드카드(*) 레코드는 만들지 않는다 — 다른 사람이 하위 주소를 가로챌 위험(GitHub 권고)' }],
      cname: dom.ok ? dom.host : null, problems: problems, ready: dom.ok && !!org
    };
  }

  /**
   * 연결 전·후에 확인할 목록. auto=true 는 제작기가 입력값을 보고 스스로 판정(ok true/false), auto=false 는 사람이 눈으로 확인(ok null).
   * @param {ReturnType<typeof buildDomainPlan>} plan
   * @param {{ogVer?:string, sample?:boolean}} [ctx]
   * @returns {Array<{id:string, text:string, auto:boolean, ok:(boolean|null), must:boolean}>}
   */
  function buildPreflight(plan, ctx) {
    ctx = ctx || {}; var dom = plan.domain, host = dom.ok ? dom.host : '○○○.com', T = plan.target;
    var A = function (id, text, ok, must) { return { id: id, text: text, auto: true, ok: !!ok, must: must !== false }; };
    var M = function (id, text, must) { return { id: id, text: text, auto: false, ok: null, must: must !== false }; };
    return [
      A('domain-valid', '도메인 형식이 올바르다' + (dom.ok ? ' (' + host + ')' : ''), dom.ok),
      M('buyer', '도메인은 센터장님 명의로 사고, 결제도 센터장님이 직접 했다(첫해·갱신 가격과 만기일을 센터장님께 알렸다)'),
      A('org-known', 'GitHub 조직 이름을 안다 → 연결 대상 ' + T, plan.targetKnown),
      M('repo-public', '저장소 ' + T + ' 가 공개(Public)이고 Settings → Pages 가 켜져 있다(main / 루트)'),
      M('github-first', 'DNS 를 만지기 전에 먼저 GitHub 저장소 Settings → Pages → Custom domain 에 ' + host + ' 를 입력하고 Save 했다 (저장하면 저장소에 CNAME 파일이 자동으로 생긴다 → GitHub Desktop 에서 Pull)'),
      M('org-verify', '(권장) 조직 설정에서 도메인 인증(Verify a domain) TXT 레코드를 DNS 에 넣었다 — 다른 사람이 같은 도메인을 자기 저장소에 쓰는 것을 막아 준다', false),
      M('dns-clean', 'DNS 관리 화면에 원래 들어 있던 다른 A·CNAME(주차 페이지 등)을 지웠다 — 충돌한다'),
      M('dns-records', dom.ok && dom.kind === 'subdomain' ? 'CNAME 레코드 1개를 넣었다' : 'A 레코드 4개(@)와 CNAME 1개(www)를 넣었다'),
      M('no-wildcard', '와일드카드 * 레코드를 만들지 않았다'),
      A('site-url', '제작기 "홈페이지 공개 주소"가 ' + (dom.ok ? dom.url : '자체 도메인') + ' 로 적용됐다(정규 주소·og:url·사이트맵·robots·llms.txt 모두)', dom.ok),
      A('og-ver', '카톡 미리보기 그림 버전(?v=)이 새로 바뀌었다' + (ctx.ogVer ? ' (' + ctx.ogVer + ')' : ''), !!ctx.ogVer && dom.ok),
      A('pkg-github', 'GitHub Pages 용 내려받기에 CNAME·.nojekyll 이 들어가고 Netlify 설정 파일은 빠진다', plan.hostTarget === 'github' && dom.ok),
      A('not-sample', '샘플(견본) 모드가 꺼져 있다(켜져 있으면 검색에 안 잡히게 막힌다)', !ctx.sample),
      M('upload', '내려받은 폴더 내용을 저장소에 복사해 Commit·Push 했다. 이때 저장소의 CNAME 을 지우지 않았다'),
      M('dns-check', 'DNS 가 퍼졌다(보통 몇 분~몇 시간, 최대 24시간): nslookup ' + host + ' 에 A 4개, nslookup www.' + host + ' 가 ' + T + ' 로 나온다'),
      M('https', 'Settings → Pages 에서 DNS check 성공이 보이면 Enforce HTTPS 를 켰다(이 칸이 나타나는 데 최대 24시간)'),
      M('open-both', 'https://' + host + ' 과 https://www.' + host + ' 이 모두 열린다'),
      M('kakao', '카카오톡 미리보기 확인(예전 그림이 남아 있으면 카카오 개발자 사이트 "카카오톡 URL 메타정보 관리"에서 캐시 초기화)'),
      M('search', '네이버 서치어드바이저·구글 서치콘솔에 새 도메인으로 등록하고 sitemap.xml 제출')
    ];
  }

  /**
   * 센터장님·담당자에게 그대로 복사해 줄 수 있는 DNS 설정 안내문(마크다운 글).
   * 와일드카드 금지·Enforce HTTPS 안내 포함. 모르는 항목은 "확실하지 않음"으로 표시한다.
   * @param {ReturnType<typeof buildDomainPlan>} plan
   * @param {{centerName?:string, ogVer?:string, sample?:boolean, today?:string}} [ctx]
   * @returns {string}
   */
  function buildDnsGuide(plan, ctx) {
    ctx = ctx || {}; var dom = plan.domain, host = dom.ok ? dom.host : '(도메인 미입력)', T = plan.target, L = [];
    var nm = ctx.centerName ? ctx.centerName + ' ' : '';
    L.push('# ' + nm + '도메인 연결 안내 (GitHub Pages)');
    L.push('');
    L.push('_Created by 마케팅지니 · 작성 ' + (ctx.today || todayKst()) + ' · 근거: GitHub Docs(Pages 사용자 지정 도메인 관리). 가비아·카페24 등 화면 메뉴 이름은 업체마다 달라 확실하지 않음_');
    L.push('');
    if (!plan.ready) {
      L.push('> ⚠ 아직 안내를 완성할 수 없어요:');
      plan.problems.forEach(function (p) { L.push('> - ' + p); });
      L.push('');
    }
    L.push('## 한눈에 보기');
    L.push('| 항목 | 값 |'); L.push('|---|---|');
    L.push('| 연결할 도메인 | `' + host + '`' + (dom.ok ? (dom.kind === 'apex' ? ' (도메인 본체 / apex)' : ' (하위 주소 / subdomain)') : '') + ' |');
    L.push('| 연결 대상(GitHub Pages) | `' + T + '` |');
    L.push('| 공개 주소(적용 후) | ' + (dom.ok ? dom.url : '-') + ' |');
    L.push('| 저장소에 들어갈 CNAME 파일 내용 | ' + (dom.ok ? '`' + host + '`' : '-') + ' |');
    L.push('');
    L.push('## 1. DNS 에 넣을 레코드 (도메인을 산 곳의 DNS 관리 화면)');
    if (dom.ok) {
      L.push('| 종류 | 호스트(이름) | 값 |'); L.push('|---|---|---|');
      plan.records.forEach(function (r) { L.push('| ' + r.type + ' | ' + r.host + ' | `' + r.value + '` |'); });
      L.push('');
      if (dom.kind === 'apex') {
        L.push('- A 레코드 4개는 모두 호스트 `@`(또는 비워 둠)에 넣는다. 값 4개: ' + PAGES_A.join(' · '));
        L.push('- `www` 는 CNAME 1개. 값에는 저장소 이름이 아니라 **`' + T + '`** 만 쓴다.');
        L.push('- (선택) IPv6: AAAA 레코드 4개(`' + PAGES_AAAA.join('`, `') + '`). 쓰려면 위 A 레코드도 함께 둔다.');
      } else {
        L.push('- 하위 주소(' + host + ')는 CNAME 1개만 넣는다. A 레코드는 필요 없다. 값은 **`' + T + '`**.');
      }
    } else L.push('(도메인이 입력되면 여기에 표가 나와요)');
    L.push('');
    L.push('## 2. 하지 말 것');
    L.push('- **와일드카드 `*` 레코드는 만들지 않는다**(A든 CNAME이든). 다른 사람이 하위 주소를 가로챌 위험이 있어 GitHub가 권하지 않는다.');
    L.push('- 도메인 회사가 미리 넣어 둔 다른 A·CNAME(주차 페이지 등)이 있으면 충돌하므로 지운다(센터장님과 화면을 보며).');
    L.push('- GitHub 에 도메인을 등록하기 **전에** DNS 부터 만지지 않는다(등록 먼저 → DNS 나중).');
    L.push('- 저장소의 `CNAME` 파일을 지우지 않는다. 폴더를 통째로 바꿔 올릴 때는 `CNAME`·`.nojekyll` 이 함께 들어 있는지 확인한다.');
    L.push('');
    L.push('## 3. 순서');
    L.push('1. GitHub 저장소 `' + T + '` → Settings → Pages → **Custom domain** 에 `' + host + '` 입력 → Save. (저장소에 `CNAME` 파일이 자동으로 생긴다 → GitHub Desktop 에서 Pull)');
    L.push('2. (권장) 조직 Settings → Pages → Verify a domain: GitHub가 알려 주는 TXT 레코드를 DNS 에 추가.');
    L.push('3. DNS 관리 화면에서 위 1번 표대로 레코드를 넣는다.');
    L.push('4. 기다린다(몇 분~몇 시간, 최대 24시간).');
    L.push('5. Settings → Pages 에서 DNS check 성공이 보이면 **Enforce HTTPS** 를 켠다. 이 칸이 나타나기까지 **최대 24시간** 걸릴 수 있다.');
    L.push('6. `https://' + host + '` 과 `https://www.' + host + '` 이 모두 열리는지 확인한다.');
    L.push('');
    L.push('## 4. 레코드 확인 명령(선택, 윈도우 명령 프롬프트)');
    L.push('```');
    L.push('nslookup ' + host);
    L.push('nslookup www.' + host);
    L.push('```');
    L.push('- 첫 줄에 ' + PAGES_A.join(' · ') + ' 가 보이고, 둘째 줄이 `' + T + '` 로 이어지면 정상.');
    L.push('');
    L.push('## 5. 연결 전 점검표 (✓ 제작기가 확인한 것 / ☐ 사람이 확인할 것)');
    buildPreflight(plan, ctx).forEach(function (it) { L.push('- [' + (it.ok === true ? 'x' : ' ') + '] ' + it.text + (it.must ? '' : ' _(권장)_')); });
    L.push('');
    L.push('## 6. 연결 뒤 마케팅지니가 하는 일');
    L.push('- 제작기 "자체 도메인" 칸에 `' + host + '` 입력 → 정규 주소·og:url·og:image(?v= ' + (ctx.ogVer || '새 값') + ')·sitemap.xml·robots.txt·llms.txt 가 한 번에 새 주소로 바뀐다.');
    L.push('- GitHub Pages 용으로 내려받은 폴더에는 `CNAME`(`' + host + '`)과 `.nojekyll` 이 들어 있다. Netlify 설정 파일(netlify.toml·netlify/·_redirects)과 제작기 입력값 JSON 은 들어가지 않는다.');
    L.push('- 카톡 미리보기·서치어드바이저·서치콘솔을 새 도메인으로 다시 확인한다.');
    L.push('');
    L.push('## 확실하지 않은 것');
    L.push('- 도메인 연결 후 `' + T + '` 주소가 새 도메인으로 자동 이동하는지: GitHub Docs 에 설명이 없다 → 연결 후 직접 접속해 확인.');
    L.push('- 도메인 회사 DNS 화면의 정확한 메뉴·항목 이름.');
    return L.join('\n') + '\n';
  }

  /* ======================= 5. 내보내기(배포 폴더) 규칙 ======================= */

  /** Netlify 에서만 쓰는 설정 파일(GitHub Pages 에는 넣지 않는다) */
  var NETLIFY_ONLY = /^(?:netlify\.toml|_redirects|_headers|netlify\/.*|center-config\.json)$/i;
  /** 제작기 작업·내부 안내 파일(어느 공개 폴더에도 넣지 않는다) */
  var INTERNAL_ONLY = /(?:입력값|_input|-input|builder|제작기|\.env|\.map$|^qa\/|^_백업|DNS|도메인.*안내|사용법)/i;

  /**
   * 입력값에서 공개 폴더에 넣어서는 안 되는 제작기 내부 키를 뺀 사본.
   * (CENTER_CONFIG·center-config.json 으로 공개되는 값의 정리용. netlifySub 는 _redirects 만드는 데만 쓰이므로 뺀다)
   * @param {object} d
   * @returns {object}
   */
  function publicConfig(d) {
    var c = Object.assign({}, d);
    ['agencyName', 'geoBadge', 'hostTarget', 'ghOrg', 'netlifySub', '_lastChecks'].forEach(function (k) { delete c[k]; });
    c.url = resolveSiteUrl(d).url;   /* 자체 도메인이 있으면 옛 공개 주소(github.io 등)를 공개 설정에 남기지 않는다 */
    return c;
  }

  /**
   * 내보내기에 꼭 들어가야 하는 파일과, 대상(GitHub/Netlify)별로 넣으면 안 되는 파일 규칙을 한곳에서 정한다.
   * @param {('github'|'netlify')} target
   * @param {ReturnType<typeof buildDomainPlan>} plan
   * @returns {{required:string[], extra:Array<{name:string, text:string}>}}
   *   extra: 도메인에 따라 자동으로 만들어 넣을 파일(CNAME 내용, .nojekyll 은 빈 파일)
   */
  function exportExtras(target, plan) {
    var extra = [];
    if (target === 'github') {
      extra.push({ name: '.nojekyll', text: '' });
      if (plan.domain && plan.domain.ok) extra.push({ name: 'CNAME', text: plan.domain.host + '\n' });
    }
    return { required: extra.map(function (e) { return e.name; }), extra: extra };
  }

  /**
   * 내려받을 파일 목록이 규칙을 지키는지 검사한다. 하나라도 어기면 problems 에 이유가 담긴다.
   *  - GitHub Pages: .json 파일 전부 금지, netlify.toml·_redirects·netlify/ 금지, .nojekyll 필수, 도메인이 있으면 CNAME(내용=host) 필수
   *  - Netlify: CNAME·.nojekyll 금지, 제작기 입력값 JSON 금지(center-config.json 만 허용)
   *  - 둘 다: 제작기 입력값·내부 안내·작업 파일·상위 폴더 경로(..) 금지, 같은 이름 중복 금지
   * @param {('github'|'netlify')} target
   * @param {Array<{name:string, data?:(string|Uint8Array)}>} files
   * @param {ReturnType<typeof buildDomainPlan>} plan
   * @returns {{ok:boolean, problems:string[]}}
   */
  function assertPublicPackage(target, files, plan) {
    var problems = [], seen = {}, byName = {};
    var dec = function (x) { return typeof x === 'string' ? x : (x && typeof TextDecoder !== 'undefined' ? new TextDecoder().decode(x) : ''); };
    files.forEach(function (f) {
      var n = f.name; byName[n] = f;
      if (seen[n]) problems.push('같은 이름 파일이 두 번 들어 있어요: ' + n); seen[n] = 1;
      if (/(^|\/)\.\.(\/|$)|^\/|\\/.test(n)) problems.push('올바르지 않은 파일 경로: ' + n);
      if (INTERNAL_ONLY.test(n)) problems.push('공개 폴더에 넣으면 안 되는 내부 파일: ' + n);
      if (target === 'github') {
        if (NETLIFY_ONLY.test(n)) problems.push('GitHub Pages 용 폴더에 Netlify 전용 파일이 들어 있어요: ' + n);
        if (/\.json$/i.test(n)) problems.push('GitHub Pages 용 폴더에 JSON 파일이 들어 있어요(제작기 입력값 노출 방지): ' + n);
      } else {
        if (/^(?:CNAME|\.nojekyll)$/.test(n)) problems.push('Netlify 용 폴더에 GitHub Pages 전용 파일이 들어 있어요: ' + n);
        if (/\.json$/i.test(n) && n !== 'center-config.json') problems.push('Netlify 용 폴더에 허용되지 않은 JSON 파일: ' + n);
      }
    });
    if (target === 'github') {
      if (!byName['.nojekyll']) problems.push('.nojekyll 파일이 없어요.');
      if (plan && plan.domain && plan.domain.ok) {
        if (!byName['CNAME']) problems.push('자체 도메인이 있는데 CNAME 파일이 없어요.');
        else if (dec(byName['CNAME'].data).trim() !== plan.domain.host) problems.push('CNAME 내용이 도메인(' + plan.domain.host + ')과 달라요.');
      } else if (byName['CNAME']) problems.push('자체 도메인이 없는데 CNAME 파일이 들어 있어요.');
    }
    return { ok: !problems.length, problems: problems };
  }

  /* ======================= 6. 색 대비 ======================= */

  /**
   * 상대 휘도(WCAG). 0(검정)~1(흰색).
   * @param {{r:number,g:number,b:number}} c 0~255
   * @returns {number}
   */
  function luminance(c) {
    var f = function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }
  /**
   * 두 색의 글자 대비(1~21). 일반 글씨 4.5 이상, 큰 글씨(24px↑ 또는 굵은 18.66px↑) 3 이상이 합격선.
   * @param {{r:number,g:number,b:number}} a
   * @param {{r:number,g:number,b:number}} b
   * @returns {number}
   */
  function contrastRatio(a, b) {
    var x = luminance(a), y = luminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }

  return {
    VERSION: VERSION, FEE_DEFAULTS: FEE_DEFAULTS,
    price: price, won: won, substituteFees: substituteFees, nonCoverExample: nonCoverExample,
    RATE_KEYS: RATE_KEYS, RATE_PRESETS: RATE_PRESETS, todayKst: todayKst, rateValid: rateValid, applyRate: applyRate,
    pickAutoRate: pickAutoRate, syncRate: syncRate, rateFingerprint: rateFingerprint, isProposal: isProposal,
    SECOND_LEVEL: SECOND_LEVEL, normalizeDomain: normalizeDomain, ensureTrailingSlash: ensureTrailingSlash, resolveSiteUrl: resolveSiteUrl,
    pageUrl: pageUrl, bumpOgVersion: bumpOgVersion,
    PAGES_A: PAGES_A, PAGES_AAAA: PAGES_AAAA, parseGithubOrg: parseGithubOrg, inferGithubOrg: inferGithubOrg,
    buildDomainPlan: buildDomainPlan, buildPreflight: buildPreflight, buildDnsGuide: buildDnsGuide,
    publicConfig: publicConfig, exportExtras: exportExtras, assertPublicPackage: assertPublicPackage,
    luminance: luminance, contrastRatio: contrastRatio
  };
})();

return CenterCore;})();

function fmtPhone(raw) {
  const d = String(raw || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('02')) return d.length >= 10 ? d.replace(/(\d{2})(\d{4})(\d{4})/, '$1-$2-$3') : d.replace(/(\d{2})(\d{3})(\d{4})/, '$1-$2-$3');
  if (d.length === 11) return d.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
  if (d.length === 10) return d.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
  if (d.length === 8) return d.replace(/(\d{4})(\d{4})/, '$1-$2');
  return String(raw).trim();
}
function e164(raw) { const f = fmtPhone(raw); return f ? '+82-' + f.replace(/^0/, '') : ''; }

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];
function dayLabel(list) {
  const idx = DAYS.map((d, i) => list.includes(d) ? i : -1).filter(i => i >= 0);
  if (!idx.length) return '';
  if (idx.length === 7) return '매일';
  const parts = []; let s = idx[0], p = idx[0];
  const flush = () => { const n = p - s + 1; parts.push(n >= 3 ? DAYS[s] + '~' + DAYS[p] : idx.filter(i => i >= s && i <= p).map(i => DAYS[i]).join('·')); };
  for (let k = 1; k < idx.length; k++) { if (idx[k] === p + 1) p = idx[k]; else { flush(); s = p = idx[k]; } }
  flush();
  return parts.join('·');
}
const ENG_DAY = { '월': 'Monday', '화': 'Tuesday', '수': 'Wednesday', '목': 'Thursday', '금': 'Friday', '토': 'Saturday', '일': 'Sunday' };

function hex2rgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function rgb2hex(r, g, b) { return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
function rgb2hsl(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2; if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); if (mx === r) h = (g - b) / d + (g < b ? 6 : 0); else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; } return [h, s * 100, l * 100]; }
function hsl2hex(h, s, l) { h = ((h % 360) + 360) % 360; s /= 100; l /= 100; const k = n => (n + h / 30) % 12; const a = s * Math.min(l, 1 - l); const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return rgb2hex(f(0) * 255, f(8) * 255, f(4) * 255); }
function lum(c) { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); }
function contrast(a, b) { const L1 = lum(hex2rgb(a)), L2 = lum(hex2rgb(b)); return (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05); }
function rgba(hex, a) { const c = hex2rgb(hex); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }

/* ============ [B] 고저스 4색 멀티 하모니 테마 8종 (기본: ① 햇살마루 warm) ============ */
const THEME_PALETTES = {
  warm: {
    key: 'warm', id: 'warm', num: '①', name: '햇살마루', h: 34,
    accent: '#82663f', soft: '#f4ede1', second: '#3e5638', third: '#4b3a28', dark: '#2f2b25', deep: '#2f4029', light: '#e2c899',
    sand: '#c9b596', bg: '#fbf8f2', line: '#e3d9c7', inkSoft: '#655e52', inkFaint: '#70695e', foot: '#1E2425',
    hero1: '#4a4232', hero2: '#33392a', hero3: '#2a3324', glow: 'rgba(226,200,153,.5)', shade: 'rgba(62,86,56,.75)',
    og: { bg1: '#b49a70', bg2: '#4b4636', glow: '#f3d9a4', sun: '#f1d39a', tag: '#f1e2c4', tel: '#3b3628' },
    mood: '품격 있고 따스한 골드 & 포레스트그린 조화 · 원목 거실, 정갈한 식사, 일월 시그니처'
  },
  sage: {
    key: 'sage', id: 'sage', num: '②', name: '편백정원', h: 150,
    accent: '#365B49', soft: '#EBF0E6', second: '#896b3e', third: '#5F6F52', dark: '#242A2B', deep: '#223A2E', light: '#E2C99B',
    sand: '#C4D9BE', bg: '#F7F9F4', line: '#DCE3D5', inkSoft: '#4E5952', inkFaint: '#646d67', foot: '#1E2425',
    hero1: '#2C4236', hero2: '#23352B', hero3: '#1A2820', glow: 'rgba(226,201,155,.48)', shade: 'rgba(156,122,71,.55)',
    og: { bg1: '#365B49', bg2: '#1F352B', glow: '#E2C99B', sun: '#E2C99B', tag: '#EBF0E6', tel: '#223A2E' },
    mood: '편안한 숲초록 & 앤틱브론즈 조화 · 정원, 산책, 원예치료, 편백 힐링 공간'
  },
  teal: {
    key: 'teal', id: 'teal', num: '③', name: '맑은활력', h: 182,
    accent: '#235A5C', soft: '#E3F0EE', second: '#8d6a3d', third: '#4F706B', dark: '#222A2B', deep: '#173B3D', light: '#E4CE9E',
    sand: '#AAD8D1', bg: '#F5FAF9', line: '#D4E5E2', inkSoft: '#495B5C', inkFaint: '#5d6d6e', foot: '#1E2425',
    hero1: '#20484A', hero2: '#1A3A3C', hero3: '#122A2C', glow: 'rgba(228,206,158,.48)', shade: 'rgba(35,90,92,.75)',
    og: { bg1: '#235A5C', bg2: '#153537', glow: '#E4CE9E', sun: '#E4CE9E', tag: '#E3F0EE', tel: '#173B3D' },
    mood: '산뜻한 에메랄드틸 & 앰버골드 조화 · 큰 창, 쾌적한 운동·물리치료실, 신체 재활 활동'
  },
  lavender: {
    key: 'lavender', id: 'lavender', num: '④', name: '고운선율', h: 270,
    accent: '#5E4973', soft: '#EFE8F4', second: '#8b6a4c', third: '#786582', dark: '#28232E', deep: '#2E223B', light: '#E6CEAA',
    sand: '#D9C5E6', bg: '#FAF7FC', line: '#E2D8EA', inkSoft: '#595063', inkFaint: '#6d6576', foot: '#1E2425',
    hero1: '#3F304E', hero2: '#32263E', hero3: '#241B2E', glow: 'rgba(230,206,170,.48)', shade: 'rgba(158,120,86,.55)',
    og: { bg1: '#5E4973', bg2: '#2E223B', glow: '#E6CEAA', sun: '#E6CEAA', tag: '#EFE8F4', tel: '#2E223B' },
    mood: '우아한 플럼라벤더 & 로즈골드 조화 · 음악·노래교실, 공예 만들기, 아늑한 휴게 공간'
  },
  honey: {
    key: 'honey', id: 'honey', num: '⑤', name: '웃음가득', h: 38,
    accent: '#8e6221', soft: '#F7EED8', second: '#3B573A', third: '#7E5E3D', dark: '#2C261D', deep: '#2D3A27', light: '#F2D68B',
    sand: '#E8C97A', bg: '#FFFCF4', line: '#E8DEC6', inkSoft: '#615646', inkFaint: '#736859', foot: '#1E2425',
    hero1: '#4E3B1E', hero2: '#383322', hero3: '#26291D', glow: 'rgba(242,214,139,.52)', shade: 'rgba(59,87,58,.72)',
    og: { bg1: '#9A6B24', bg2: '#3D2E16', glow: '#F2D68B', sun: '#F2D68B', tag: '#F7EED8', tel: '#2C261D' },
    mood: '화사한 허니골드 & 딥올리브 조화 · 풍선배구, 공놀이, 레크리에이션, 단체 활동'
  },
  terracotta: {
    key: 'terracotta', id: 'terracotta', num: '⑥', name: '정성한끼', h: 16,
    accent: '#96462E', soft: '#F7E7DD', second: '#3D5A47', third: '#7D5D4B', dark: '#2D231F', deep: '#36231D', light: '#ECC79E',
    sand: '#EABDA8', bg: '#FFF9F5', line: '#E8D7CC', inkSoft: '#635149', inkFaint: '#75645d', foot: '#1E2425',
    hero1: '#4F2D22', hero2: '#3B2722', hero3: '#291E1B', glow: 'rgba(236,199,158,.5)', shade: 'rgba(61,90,71,.65)',
    og: { bg1: '#96462E', bg2: '#3D221A', glow: '#ECC79E', sun: '#ECC79E', tag: '#F7E7DD', tel: '#2D231F' },
    mood: '정겨운 테라코타 & 세이지그린 조화 · 직접 조리한 식사, 요리 활동, 햇살 드는 휴게실'
  },
  citrus: {
    key: 'citrus', id: 'citrus', num: '⑦', name: '감귤햇살', h: 18,
    accent: '#A64424', soft: '#FCECD8', second: '#2E5848', third: '#8C6A3D', dark: '#2B241E', deep: '#233A30', light: '#F4D88A',
    sand: '#F0CB85', bg: '#FFFDF7', line: '#EADECE', inkSoft: '#5E5347', inkFaint: '#73685d', foot: '#1E2425',
    hero1: '#4C2C1E', hero2: '#353224', hero3: '#222A22', glow: 'rgba(244,216,138,.54)', shade: 'rgba(46,88,72,.72)',
    og: { bg1: '#A64424', bg2: '#233A30', glow: '#F4D88A', sun: '#F4D88A', tag: '#FCECD8', tel: '#2B241E' },
    mood: '생기 넘치는 시트러스 & 딥티트리 투톤 조화 · 치매예방 놀이, 웃음치료, 활기찬 센터'
  },
  royal: {
    key: 'royal', id: 'royal', num: '⑧', name: '단청품격', h: 218,
    accent: '#1F3A68', soft: '#EFECE2', second: '#8e6b38', third: '#48635E', dark: '#22262E', deep: '#162747', light: '#EDD196',
    sand: '#DFC48C', bg: '#FBF9F4', line: '#E2DDD0', inkSoft: '#4E535E', inkFaint: '#646873', foot: '#1E2425',
    hero1: '#1E3258', hero2: '#1C2A44', hero3: '#141E30', glow: 'rgba(237,209,150,.52)', shade: 'rgba(173,131,68,.55)',
    og: { bg1: '#1F3A68', bg2: '#141E30', glow: '#EDD196', sun: '#EDD196', tag: '#EFECE2', tel: '#162747' },
    mood: '호텔급 로얄인디고 & 황금빛 샴페인 투톤 조화 · 한지 미색 배경의 대형·프리미엄 센터'
  }
};

const PRESETS = [
  THEME_PALETTES.warm,
  THEME_PALETTES.sage,
  THEME_PALETTES.teal,
  THEME_PALETTES.lavender,
  THEME_PALETTES.honey,
  THEME_PALETTES.terracotta,
  THEME_PALETTES.citrus,
  THEME_PALETTES.royal
];

const LEGACY_MAP = { navy:'warm', rose:'warm', gold: 'warm', forest: 'sage', olive: 'sage', plum: 'royal', sky: 'teal', graphite: 'royal', apricot: 'citrus', lav: 'lavender' };

function themeFor(d) {
  const key = LEGACY_MAP[d.preset] || d.preset || 'warm';
  return THEME_PALETTES[key] || THEME_PALETTES.warm;
}

/* ============ [C] 입력칸 설계도 ============ */
const FAC = {
  living: { t: '넓고 밝은 생활실', p: '햇살이 드는 넓은 공간에서 함께 활동하고 쉬어 갑니다.', c: 't1', svg: '<circle cx="46" cy="16" r="7"/><path d="M46 3v3M46 26v3M33 16h3M56 16h3"/><path d="M8 46V34a6 6 0 0 1 12 0v4h24v-4a6 6 0 0 1 12 0v12Z"/><path d="M12 46v6M52 46v6M20 38v-6h24v6"/>' },
  rest: { t: '휴게실', p: '안전 손잡이와 침상을 갖춘 조용한 휴식 공간입니다.', c: 't2', svg: '<path d="M6 48V20M58 48V36"/><path d="M6 36h52M6 44h52"/><rect x="12" y="26" width="14" height="10" rx="4"/><path d="M30 36v-8h22a6 6 0 0 1 6 6v2"/>' },
  bath: { t: '샤워식 목욕실', p: '목욕 의자와 보조 도구로 안전하게 목욕을 돕습니다.', c: 't3', svg: '<path d="M20 58V12a6 6 0 0 1 12 0v2"/><path d="M26 20h14l-2 6H28Z"/><path d="M30 32v4M34 34v4M38 32v4M30 42v4M34 44v4M38 42v4"/><path d="M10 58h44"/>' },
  foot: { t: '족욕시설', p: '따뜻한 물로 발을 담그며 피로를 풀어 드립니다.', c: 't4', svg: '<path d="M8 34h48l-4 16a6 6 0 0 1-6 4H18a6 6 0 0 1-6-4Z"/><path d="M14 26q4-6 8 0t8 0 8 0 8 0 8 0"/><path d="M24 16q2-4 0-8M32 16q2-4 0-8M40 16q2-4 0-8"/>' },
  counsel: { t: '상담실', p: '보호자님과 편안하게 이야기 나누는 별도 공간입니다.', c: 't2', svg: '<path d="M8 14h32a4 4 0 0 1 4 4v14a4 4 0 0 1-4 4H22l-8 7v-7H8a4 4 0 0 1-4-4V18a4 4 0 0 1 4-4Z"/><path d="M48 24h8a4 4 0 0 1 4 4v14a4 4 0 0 1-4 4h-4v7l-8-7H32a4 4 0 0 1-4-4v-2"/><path d="M14 24h20M14 30h12"/>' },
  massage: { t: '안마의자·물리치료기', p: '안마의자와 적외선·공기압 기구로 몸을 풀어 드립니다.', c: 't1', svg: '<path d="M20 8h14a6 6 0 0 1 6 6v18l12 10v8a4 4 0 0 1-4 4H22a6 6 0 0 1-6-6V12a4 4 0 0 1 4-4Z"/><path d="M16 34h24M22 54v4M46 54v4"/><path d="M24 16h10M24 22h10"/>' }
};
const MEALS = ['점심', '간식', '저녁'];
const DEF_CAMPAIGN = 'https://youtu.be/5OTooUpgcic';

const GROUPS = [
  { id: 'basic', title: '1. 센터 기본 정보', open: true, fields: [
    { id: 'sample', type: 'check', label: '샘플(견본) 페이지로 만들기', help: '실제 센터가 아닌 예시일 때 켜세요. 맨 위에 "샘플" 띠가 붙고, 검색에 잡히지 않게 막아요.' },
    {id:'logoImage',type:'photo',label:'센터 로고 이미지',def:'',help:'PNG·JPG·WebP 로고를 선택하세요. 센터명 왼쪽에 표시되며, 투명 PNG의 배경은 유지됩니다. 로고가 없으면 기존 해 모양을 사용합니다.'},
    { id: 'name', label: '센터 이름', req: true, ph: '예) 행복주야간보호센터' },
    { id: 'shortName', label: '짧은 이름', ph: '예) 행복', help: '큰 제목 "○○이 함께합니다"에 쓰여요. 비우면 이름에서 자동으로 만들어요.' },
    { id: 'eng', label: '영문 이름 (선택)', ph: '예) HAENGBOK DAY CARE', help: '로고 위 작은 영문 줄에 쓰여요. 비우면 "DAY CARE"만 나와요.' },
    { id: 'careType', label: '급여 종류', def: '주·야간보호' },
    { id: 'sido', label: '시·도', def: '경기도' },
    { id: 'region', label: '시·군·구', req: true, ph: '예) 수원시 권선구' },
    { id: 'street', label: '도로명 주소 (건물·층까지)', req: true, ph: '예) 금호로 141 해담빌딩 3층' },
    { id: 'dong', label: '동(읍·면) 이름', ph: '예) 구운동' }
  ] },
  { id: 'contact', title: '2. 연락·주소·링크', fields: [
    { id: 'tel', type: 'tel', label: '대표 전화', req: true, ph: '예) 031-227-1120' },
    { id: 'url', type: 'url', label: '홈페이지 공개 주소', req: true, ph: 'https://조직이름.github.io/', help: '올릴 곳의 실제 주소예요. 미리보기 그림·검색 정보에 쓰여요. 아래 "자체 도메인"을 적으면 그 도메인이 이 칸보다 우선해요.' },
    { id: 'hostTarget', type: 'select', label: '올릴 곳 (내려받기 방식)', opts: [['github', 'GitHub Pages (기본)'], ['netlify', 'Netlify (서버 함수 방식)']], def: 'github', help: 'GitHub Pages 용 zip에는 CNAME(자체 도메인이 있을 때)과 .nojekyll이 들어가고 Netlify 설정 파일은 빠져요. Netlify 용 zip에는 netlify.toml·함수·_redirects가 들어가요.' },
    { id: 'ghOrg', type: 'text', label: 'GitHub 조직 이름 (조직이름.github.io · 선택)', ph: '예) ilwol-daycare', help: 'DNS 안내문의 연결 대상(조직이름.github.io)에 쓰여요. 비우면 위 공개 주소가 github.io 모양일 때 거기서 알아내요.' },
    { id: 'customDomain', type: 'text', label: '자체 도메인 (선택)', ph: '예) example.com', help: '센터장님이 산 도메인을 적으면 정규 주소·카톡 미리보기(og)·사이트맵·robots.txt·llms.txt가 모두 이 도메인으로 한 번에 바뀌고, 미리보기 그림 버전(?v=)도 새로 바뀌어요. http://·www.·뒤쪽 경로는 알아서 정리해요.' },
    { id: 'domainStatus', type: 'note', nid: 'domainStatus', text: '' },
    { id: 'netlifySub', type: 'text', label: '넷리파이 기본 주소 (Netlify로 올리고 자체 도메인을 쓸 때만 · 301 리다이렉트용 · 선택)', ph: '예) ilwol-daycare.netlify.app', help: '센터가 자체 도메인(.com 등)을 구매해 연결할 때 원래 넷리파이 주소를 적어두면 _redirects 파일이 중복 노출을 자동으로 막아줘요.' },
    { id: 'naverPlace', type: 'url', label: '네이버 스마트플레이스 주소 (GEO 로컬 연동 · 선택)', ph: 'https://map.naver.com/p/entry/place/... 또는 https://naver.me/...', help: '넣어 두면 네이버 지도(플레이스)와 홈페이지가 구조화 데이터(sameAs)로 하나로 묶여 지역 AI 추천 확률이 높아져요.' },
    { id: 'blog', type: 'url', label: '네이버 블로그 대표 주소 (권장)', ph: 'https://blog.naver.com/아이디', help: '식단표·활동사진 게시판이 네이버 블로그로 연결됩니다.' },
    { id: 'blogMeal', type: 'url', label: '식단표·프로그램표 게시판 링크 (선택)', ph: '비우면 위 네이버 블로그 대표 주소로 연결돼요', help: '블로그의 [이달의 식단표] 카테고리 주소를 넣으면 바로 열려요.' },
    { id: 'blogPhoto', type: 'url', label: '어르신 활동사진 게시판 링크 (선택)', ph: '비우면 위 네이버 블로그 대표 주소로 연결돼요', help: '블로그의 [활동소식/행사] 카테고리 주소를 넣으면 바로 열려요.' },
    { id: 'kakao', type: 'url', label: '카카오톡 채널 주소 (선택)', ph: 'https://pf.kakao.com/_xxxx/chat', help: '비우면 카톡 버튼이 나오지 않아요.' },
    { id: 'email', type: 'text', label: '이메일 (선택)' },
    { id: 'mapQuery', label: '지도 검색어', ph: '비우면 센터 이름', help: '네이버 지도·T맵 길찾기 버튼에 쓰여요.' },
    { id: 'transit', type: 'area', rows: 2, label: '대중교통 안내 (선택)', ph: '예) 호매실입구 정류장 이용' },
    { id: 'parking', type: 'area', rows: 2, label: '주차 안내 (선택)', ph: '예) 건물 주차 공간이 있어 방문 상담 시 편하게 오실 수 있습니다.' }
  ] },
  { id: 'ops', title: '3. 운영·송영·식사', fields: [
    { id: 'days', type: 'checks', label: '운영 요일', opts: DAYS, def: ['월', '화', '수', '목', '금', '토'] },
    { id: 'open', type: 'text', label: '운영 시작', def: '08:30', half: true },
    { id: 'close', type: 'text', label: '운영 끝', def: '18:30', half: true },
    { id: 'closed', label: '정기 휴무 (선택)', ph: '비우면 쉬는 요일로 자동 (예: 일요일 정기휴무)' },
    { id: 'holidayNote', label: '법정공휴일 안내', def: '법정공휴일은 탄력적으로 운영', help: '"휴무일" 줄에 정기 휴무와 함께 한 줄로 나와요.' },
    { id: 'shuttle', type: 'select', label: '차량 송영', opts: [['yes', '제공'], ['no', '제공 안 함']], def: 'yes' },
    { id: 'shuttleTime', label: '차량 운행 시간', ph: '예) 월~토 08:00~18:30', help: '비우면 운영 요일·시간과 같다고 보지 않고 문구를 생략해요.' },
    { id: 'shuttleAreas', type: 'area', rows: 2, label: '송영 가능 지역 (선택)', ph: '쉼표나 줄바꿈으로 나눠 쓰세요. 예) 구운동, 입북동, 호매실동', help: '센터에서 확인해 준 지역만 쓰세요. 비우면 "상담 시 확인"으로 안내해요.' },
    { id: 'meals', type: 'checks', label: '제공하는 식사', opts: MEALS, def: ['점심', '간식', '저녁'] },
    { id: 'cooking', type: 'select', label: '조리 방식', opts: [['direct', '센터에서 직접 조리'], ['out', '급식 업체에서 공급'], ['none', '표시 안 함']], def: 'direct' }
  ] },
  { id: 'org', title: '4. 장기요양기관 정보', fields: [
    { id: 'orgNo', label: '장기요양기관 기호', ph: '센터에서 받은 번호', help: '지어내지 마세요. 비우면 이 줄이 빠지고 점검에 주의 표시가 떠요.' },
    { id: 'rating', type: 'select', label: '공단 평가 등급', opts: [['new', '신규 기관'], ['A', 'A등급'], ['B', 'B등급'], ['C', 'C등급'], ['D', 'D등급'], ['E', 'E등급'], ['none', '표시 안 함']], def: 'new', help: '페이지 화면에는 나오지 않고 llms.txt(AI용)에만 들어가요.' },
    { id: 'designDate', type: 'date', label: '지정·신고일' },
    { id: 'capacity', label: '등록 정원 (명)', ph: '예) 33', half: true },
    { id: 'current', label: '현원 (선택)', ph: '예) 32명 (남 9 · 여 23)', half: true },
    { id: 'avail', label: '이용 가능 인원 (선택)', ph: '예) 1명', half: true },
    { id: 'availDate', type: 'date', label: '현원·이용가능 기준 날짜', half: true, help: '현원·이용 가능 인원은 페이지 화면에는 나오지 않고 llms.txt(AI용)에만 들어가요. 쓸 때는 기준 날짜를 꼭 함께 써요.' },
    { id: 'staff', type: 'area', rows: 5, label: '인력 현황 (줄마다 "직종 인원")', ph: '시설장 1\n사회복지사 1\n요양보호사 5', help: '페이지 화면에는 나오지 않고 llms.txt(AI용)에만 들어가요.' }
  ] },
  { id: 'fee', title: '5. 비용 (계산 예시)', fields: [
    { id: 'showCalc', type: 'check', label: '인터랙티브 본인부담금 계산기 넣기 (GEO 10번 기준 ⭐)', def: true, help: '보호자가 등급·일수·감경 여부를 눌러보고 카톡으로 공유할 수 있는 맞춤형 계산기예요. 아래 식비·간식비·수가가 자동 연동됩니다.' },
    { id: 'showFee', type: 'check', label: '급여비용 요약표 함께 보여주기', def: true },
    { id: 'remoteRates', type:'check', label:'중앙 수가 자동 동기화 (시행일이 지난 확정 고시만 적용)', def:true },
    { id:'ratesUrl',label:'중앙 수가 JSON 주소',def:'https://jiniya1227.github.io/care_v2/ltc-rates.json' },
    { id: 'feeYear', label: '급여비용 기준 연도', def: '2026', half: true },
    { id: 'feeBand', label: '이용 시간대', def: '8시간 이상~10시간 미만', half: true },
    { id: 'fee1', label: '1등급 (원)', def: '69730', third: true },
    { id: 'fee2', label: '2등급', def: '64590', third: true },
    { id: 'fee3', label: '3등급', def: '59640', third: true },
    { id: 'fee4', label: '4등급', def: '58010', third: true },
    { id: 'fee5', label: '5등급', def: '56360', third: true },
    { id: 'feeCog', label: '인지지원등급', def: '56360', third: true },
    { id: 'feeHelp', type: 'note', text: '※ 급여비용은 매년 보건복지부 고시로 바뀌어요. 기본값은 일월 최종안의 2026년 8시간 이상~10시간 미만 금액이고, <b>고시 금액을 직접 확인한 뒤</b> 센터의 이용 시간대에 맞게 고쳐 쓰세요. 본인부담 15%는 자동 계산돼 "계산 예시"로 표시돼요.' },
    { id: 'mealFee', label: '식재료비 1식 (원)', def: '3500', half: true },
    { id: 'snackFee', label: '간식비 1회 (원)', def: '1500', half: true },
    { id: 'mealFeeMonth', type: 'month', label: '식재료비 기준 연월', half:true, help:'식재료비 옆에 기준 연도만 표시합니다(예: 2026년 기준). 월은 표시하지 않아요.' },
    { id: 'snackFeeMonth', type: 'month', label: '간식비 기준 연월', half:true, help:'간식비 옆에 기준 연도만 표시합니다(예: 2026년 기준). 월은 표시하지 않아요.' }
  ] },
  { id: 'intro', title: '6. 소개·인사말·시설·프로그램', fields: [
    { id: 'heroStyle', type: 'select', label: '첫 화면 대표 이미지', opts: [['photo', 'AI 이미지 4장 (센터별로 올려 넣기)'], ['illust', '일러스트 3장']], def: 'photo', help: '사진처럼 보이는 4장은 AI로 만든 이미지예요. 실제 어르신 사진·얼굴은 올리지 마세요. (zip의 img 폴더에 들어가요)' },
    { id: 'zoomStyle', type: 'select', label: '사진 확대 표시 모양', opts: [['circle', '흰 원 + 확대 아이콘 (글자 없음, 기본)'], ['pill', '흰 알약 + 크게 보기 (글자 있음)']], def: 'circle', help: '시설 사진 오른쪽 아래에 보이는 표시예요. 사진을 누르면 크게 보여요.' },
    { id: 'heroImage1', type: 'photo', label: '첫 화면 이미지 1 · 대표(맨 처음 보임)', def: '', help: '센터마다 AI로 새로 만든 이미지를 넣으세요. 가로형(16:9) 권장 — 올리면 1400×788로 자동으로 맞춰져요. 비워 두면 제작기의 기본 예시 이미지가 나와요. 실제 어르신 사진·얼굴은 올리지 마세요.' },
    { id: 'heroCap1', label: '이미지 1 설명 글(한 줄)', ph: '예) 퍼즐을 맞추며 생각을 깨우는 시간', help: '이미지 아래 글씨와 이미지 대체 텍스트로 쓰여요. 올린 이미지에 맞게 써 주세요. 비우면 설명 글 없이 나와요.' },
    { id: 'heroImage2', type: 'photo', label: '첫 화면 이미지 2', def: '', help: '센터마다 AI로 새로 만든 이미지를 넣으세요. 가로형(16:9) 권장 — 올리면 1400×788로 자동으로 맞춰져요. 비워 두면 제작기의 기본 예시 이미지가 나와요. 실제 어르신 사진·얼굴은 올리지 마세요.' },
    { id: 'heroCap2', label: '이미지 2 설명 글(한 줄)', ph: '예) 퍼즐을 맞추며 생각을 깨우는 시간', help: '이미지 아래 글씨와 이미지 대체 텍스트로 쓰여요. 올린 이미지에 맞게 써 주세요. 비우면 설명 글 없이 나와요.' },
    { id: 'heroImage3', type: 'photo', label: '첫 화면 이미지 3', def: '', help: '센터마다 AI로 새로 만든 이미지를 넣으세요. 가로형(16:9) 권장 — 올리면 1400×788로 자동으로 맞춰져요. 비워 두면 제작기의 기본 예시 이미지가 나와요. 실제 어르신 사진·얼굴은 올리지 마세요.' },
    { id: 'heroCap3', label: '이미지 3 설명 글(한 줄)', ph: '예) 퍼즐을 맞추며 생각을 깨우는 시간', help: '이미지 아래 글씨와 이미지 대체 텍스트로 쓰여요. 올린 이미지에 맞게 써 주세요. 비우면 설명 글 없이 나와요.' },
    { id: 'heroImage4', type: 'photo', label: '첫 화면 이미지 4', def: '', help: '센터마다 AI로 새로 만든 이미지를 넣으세요. 가로형(16:9) 권장 — 올리면 1400×788로 자동으로 맞춰져요. 비워 두면 제작기의 기본 예시 이미지가 나와요. 실제 어르신 사진·얼굴은 올리지 마세요.' },
    { id: 'heroCap4', label: '이미지 4 설명 글(한 줄)', ph: '예) 퍼즐을 맞추며 생각을 깨우는 시간', help: '이미지 아래 글씨와 이미지 대체 텍스트로 쓰여요. 올린 이미지에 맞게 써 주세요. 비우면 설명 글 없이 나와요.' },
    { id: 'aiNote', type: 'check', label: '"AI로 만든 예시 이미지" 안내 문구 넣기 (권장)', def: true, help: '실제 센터 모습으로 오해하지 않도록 이미지 아래에 작은 글씨로 나와요.' },
    { id: 'hero1', label: '첫 화면 큰 제목 윗줄', def: '어르신의 즐거운 하루, 보호자의 안심에' },
    { id: 'hero2', label: '첫 화면 큰 제목 둘째 줄 (강조)', ph: '비우면 "○○이 함께합니다."' },
    { id: 'lead', type: 'area', rows: 3, label: '첫 화면 소개 글', def: '따뜻한 한 끼, 반가운 인사, 함께하는 즐거움.\n어르신께는 활기찬 하루를, 보호자님께는 마음 놓이는 일상을 전합니다.' },
    { id: 'greetQuote', label: '센터장 인사말 – 큰 글씨 한 줄', ph: '예) 부모님의 노후는 행복하게, 자녀분들의 일상은 편안하게.', help: '센터장에게 받은 실제 글만 쓰세요. 인사말 두 칸이 모두 비면 인사말 칸이 빠져요.' },
    { id: 'greetBody', type: 'area', rows: 6, label: '센터장 인사말 – 본문', ph: '문단 사이는 한 줄 비우세요.' },
    { id: 'pCog', label: '프로그램 – 인지 활동', def: '맞춤형 인지 활동 등으로 생각을 나누고 손끝으로 표현합니다.' },
    { id: 'pBody', label: '프로그램 – 신체 활동', def: '실버 신체 운동, 신체 프로그램 등 어르신께 맞는 움직임을 함께합니다.' },
    { id: 'pMusic', label: '프로그램 – 음악·여가', def: '노래교실, 시니어 뮤직, 놀이 활동과 생신 잔치로 함께하는 기쁨을 나눕니다.' },
    { id: 'campaign', type: 'check', label: '공단 공식 유튜브 캠페인 영상 넣기', def: true, help: '국민건강보험공단 공식 영상만 퍼가기(embed)해요. 영상 파일은 올리지 않아요.' },
    { id: 'introVideo', type: 'url', label: '센터장 소개 영상 유튜브 주소 (선택)', help: '센터가 직접 올린 영상 주소. 비우면 안 나와요.' }
  ] },
  { id:'facilitySection',title:'6-1. 센터 시설 안내 (시설별 최대 3장)',open:true,fields:[
    {id:'showFacilities',type:'check',label:'시설 사진 3칸 표시',def:true},
    {id:'facilityGuide',type:'note',text:'홈페이지의 센터 안내 블록 안에 시설 3칸이 표시됩니다. 첫째 생활시설·둘째 휴게시설은 고정이며, 셋째 제목만 변경할 수 있습니다. 각 칸에 실제 센터 시설 사진을 넣어 주세요. 사진이 없으면 준비 중으로 표시됩니다.'},
    {id:'facilityPhoto1',type:'photo',label:'생활시설 사진 1 · 대표',def:'',help:'시설별 최대 3장. 홈페이지에서는 좌우 화살표로 넘겨 보고, 사진을 누르면 확대됩니다.'},
    {id:'facilityPhoto1_2',type:'photo',label:'생활시설 사진 2',def:'',help:'시설별 최대 3장. 홈페이지에서는 좌우 화살표로 넘겨 보고, 사진을 누르면 확대됩니다.'},
    {id:'facilityPhoto1_3',type:'photo',label:'생활시설 사진 3',def:'',help:'시설별 최대 3장. 홈페이지에서는 좌우 화살표로 넘겨 보고, 사진을 누르면 확대됩니다.'},
    {id:'facilityPhoto2',type:'photo',label:'휴게시설 사진 1 · 대표',def:'',help:'시설별 최대 3장. 홈페이지에서는 좌우 화살표로 넘겨 보고, 사진을 누르면 확대됩니다.'},
    {id:'facilityPhoto2_2',type:'photo',label:'휴게시설 사진 2',def:'',help:'시설별 최대 3장. 홈페이지에서는 좌우 화살표로 넘겨 보고, 사진을 누르면 확대됩니다.'},
    {id:'facilityPhoto2_3',type:'photo',label:'휴게시설 사진 3',def:'',help:'시설별 최대 3장. 홈페이지에서는 좌우 화살표로 넘겨 보고, 사진을 누르면 확대됩니다.'},
    {id:'facilityPhoto3',type:'photo',label:'세 번째 시설 사진 1 · 대표',def:'',help:'시설별 최대 3장. 홈페이지에서는 좌우 화살표로 넘겨 보고, 사진을 누르면 확대됩니다.'},
    {id:'facilityPhoto3_2',type:'photo',label:'세 번째 시설 사진 2',def:'',help:'시설별 최대 3장. 홈페이지에서는 좌우 화살표로 넘겨 보고, 사진을 누르면 확대됩니다.'},
    {id:'facilityPhoto3_3',type:'photo',label:'세 번째 시설 사진 3',def:'',help:'시설별 최대 3장. 홈페이지에서는 좌우 화살표로 넘겨 보고, 사진을 누르면 확대됩니다.'},
    { id:'facilityThirdTitle',label:'세 번째 시설 카드 명칭',def:'족욕시설',help:'첫째 생활시설·둘째 휴게시설은 고정입니다. 셋째만 족욕시설·샤워시설·운동시설 등 실제 시설에 맞게 바꿔 주세요.' },
    { id: 'facilities', type: 'checks', label: '시설 안내 (실제 있는 것만 체크)', opts: Object.keys(FAC).map(k => [k, FAC[k].t]), def: [], help: '체크한 실제 시설을 생활시설·휴게시설·세 번째 시설의 3개 카드로 묶어 소개합니다. 없는 시설은 체크하지 마세요.' },
  ] },
  { id: 'faq', title: '7. 보호자 자주 묻는 질문 (FAQ)', fields: [
    { id: 'faq', type: 'area', rows: 14, readonly:true, label: '모든 센터 공통 FAQ (고정 문답 10개)', help: '센터별로 수정하지 않는 공통 안내입니다. 홈페이지에는 먼저 5개를 보여주고 나머지는 + 더보기로 펼칩니다. 같은 내용이 FAQPage와 llms.txt에 반영됩니다.' },
    { id:'faqCommonNote',type:'note',text:'식비·간식비의 실제 금액은 비용표와 계산기에 표시합니다. FAQ는 센터명·연도별 금액을 포함하지 않는 공통 문답입니다.' }
  ] },
  { id: 'look', title: '8. 색깔·카톡 미리보기', fields: [
    { id: 'preset', type: 'swatches', label: '분위기 테마 8종 (기본: ① 햇살마루)', def: 'warm' },
    { id: 'ogLead', label: '미리보기 그림 소개 한 줄', def: '어르신의 즐거운 하루, 보호자의 안심에 함께합니다' },
    { id: 'ogTitle', label: '링크 미리보기 제목 (선택)', ph: '비우면 "센터이름 | 지역 급여종류"' },
    { id: 'ogDesc', type: 'area', rows: 2, label: '링크 미리보기 설명 (선택)', ph: '비우면 자동으로 만들어요' },
    { id: 'ogVer', label: '미리보기 그림 버전 (?v=)', help: '그림을 바꿔 다시 올릴 때마다 숫자를 바꾸세요. 카카오톡이 옛 그림을 기억하지 않게 해요.' },
    { id: 'naverCode', label: '네이버 서치어드바이저 확인 코드 (선택)', ph: 'content 값만' },
    { id: 'googleCode', label: '구글 서치콘솔 확인 코드 (선택)', ph: 'content 값만' },
    { id: 'geoQuickFacts', type: 'check', label: 'AI 핵심 요약 박스 (AI Quick Facts) 넣기 (GEO 4번 기준 ⭐)', def: true, help: 'ChatGPT·클로드·네이버 AI 브리핑이 센터 핵심 정보를 즉시 인용하도록 돕는 구조화 요약표예요.' },

    { id: 'agencyName', label: '제작 대행사 표기 (GEO 배지·리포트용)', def: '마케팅지니', ph: '예) 마케팅지니' }
  ] }
];

const SAMPLE = {
  sample: true, name: '샘플주야간보호센터', shortName: '샘플', eng: 'SAMPLE DAY CARE', careType: '주·야간보호', sido: '경기도', region: '수원시 권선구', street: '샘플로 123 샘플빌딩 2층', dong: '샘플동',
  tel: '031-000-0000', url: 'https://sample-center.example.com/', netlifySub: '', naverPlace: '', blog: 'https://blog.naver.com/', blogMeal: '', blogPhoto: '', kakao: '', showCalc: true, geoQuickFacts: true, geoBadge: true, agencyName: '마케팅지니', email: '', mapQuery: '', transit: '샘플 정류장 이용 (예시)', parking: '건물 주차 공간 안내 (예시)',
  days: ['월', '화', '수', '목', '금', '토'], open: '08:30', close: '18:30', closed: '', holidayNote: '법정공휴일은 탄력적으로 운영',
  shuttle: 'yes', shuttleTime: '월~토 08:00~18:30', shuttleAreas: '샘플동, 예시동, 가상동', meals: ['점심', '간식', '저녁'], cooking: 'direct',
  orgNo: '00000000000', rating: 'new', designDate: '2026-01-01', capacity: '30', current: '25명 (예시)', avail: '5명', availDate: '2026-11-15',
  staff: '시설장 1\n사회복지사 1\n간호조무사 1\n요양보호사 5\n사무원 1\n조리원 1', showFee: true, feeYear: '2026', feeBand: '8시간 이상~10시간 미만',
  fee1: '69730', fee2: '64590', fee3: '59640', fee4: '58010', fee5: '56360', feeCog: '56360', mealFee: '3500', snackFee: '1500', nonCoverMonth: '2026-11',
  hero1: '어르신의 즐거운 하루, 보호자의 안심에', hero2: '', lead: '따뜻한 한 끼, 반가운 인사, 함께하는 즐거움.\n어르신께는 활기찬 하루를, 보호자님께는 마음 놓이는 일상을 전합니다.',
  greetQuote: '부모님의 노후는 행복하게, 자녀분들의 일상은 편안하게.', greetBody: '이 문장은 제작기 시험용 샘플 인사말입니다. 실제 센터에서는 센터장님께 받은 글을 넣어 주세요.\n\n어르신의 편안한 하루와 보호자님의 안심을 위해 늘 귀 기울이겠습니다. (샘플)',
  facilities: ['living', 'rest', 'foot'], pCog: '', pBody: '', pMusic: '', campaign: true, introVideo: '',
  preset: 'warm', ogLead: '어르신의 즐거운 하루, 보호자의 안심에 함께합니다', ogTitle: '', ogDesc: '', naverCode: '', googleCode: ''
};


const ILWOL = {
  "sample": false,
  "name": "일월주야간보호센터",
  "shortName": "일월",
  "eng": "ILWOL DAY CARE",
  "careType": "주·야간보호",
  "sido": "경기도",
  "region": "수원시 권선구",
  "street": "금호로 141 해담빌딩 3층",
  "dong": "구운동",
  "tel": "031-227-1120",
  "url": "https://ilwol-daycare.github.io/",
  "hostTarget": "github",
  "ghOrg": "ilwol-daycare",
  "customDomain": "",
  "netlifySub": "ilwol-daycare.netlify.app",
  "naverPlace": "https://map.naver.com/p/search/%EC%9D%BC%EC%9B%94%EC%A3%BC%EC%95%BC%EA%B0%84%EB%B3%B4%ED%98%B8%EC%84%BC%ED%84%B0",
  "blog": "https://blog.naver.com/ilwoldaycare",
  "blogMeal": "https://blog.naver.com/ilwoldaycare",
  "blogPhoto": "https://blog.naver.com/ilwoldaycare",
  "kakao": "http://pf.kakao.com/_HpNEn",
  "email": "",
  "mapQuery": "일월주야간보호센터",
  "transit": "호매실입구 정류장 이용",
  "parking": "건물 뒷편 1층 주차",
  "days": [
    "월",
    "화",
    "수",
    "목",
    "금",
    "토"
  ],
  "open": "08:30",
  "close": "18:30",
  "closed": "일요일 정기휴무",
  "holidayNote": "법정공휴일은 탄력적으로 운영",
  "shuttle": "yes",
  "shuttleTime": "월~토 08:00~18:30",
  "shuttleAreas": "",
  "meals": [
    "점심",
    "간식",
    "저녁"
  ],
  "cooking": "direct",
  "orgNo": "24111001079",
  "rating": "new",
  "designDate": "2024-10-01",
  "capacity": "33",
  "current": "32명 (남 9 · 여 23)",
  "avail": "1명",
  "availDate": "2026-11-02",
  "staff": "시설장 1\n사회복지사 1\n간호조무사 1\n요양보호사 5\n사무원 2\n조리원 1\n보조원 1",
  "showCalc": true,
  "showFee": true,
  "remoteRates": true,
  "ratesUrl": "https://jiniya1227.github.io/care_v2/ltc-rates.json",
  "feeYear": "2026",
  "feeBand": "8시간 이상~10시간 미만",
  "fee1": "69730",
  "fee2": "64590",
  "fee3": "59640",
  "fee4": "58010",
  "fee5": "56360",
  "feeCog": "56360",
  "mealFee": "3500",
  "snackFee": "1500",
  "nonCoverMonth": "2026-11",
  "heroStyle": "photo",
  "aiNote": true,
  "hero1": "어르신의 즐거운 하루, 보호자의 안심에",
  "hero2": "일월이 함께합니다.",
  "lead": "따뜻한 한 끼, 반가운 인사, 함께하는 즐거움.\n어르신께는 활기찬 하루를, 보호자님께는 마음 놓이는 일상을 전합니다.",
  "greetQuote": "부모님의 노후는 행복하게, 자녀분들의 일상은 편안하게.",
  "greetBody": "모든 것이 빠르게 변하는 요즘, 가족과 함께 보낼 시간의 여유조차 갖기 어렵습니다. 이런 환경에서 부모님을 생각하면 걱정과 염려가 따르는 것은 당연합니다.\n\n몸과 마음이 불편하신 부모님의 노후는 행복하게, 자녀분들의 일상은 편안하게 해 드리기 위해 2024년 10월 1일, 일월주야간보호센터가 문을 열었습니다.\n\n어르신들의 편안하고 행복한 쉼터가 될 수 있도록 모든 임직원이 최선을 다하겠습니다. 항상 어르신과 보호자님 곁에서 귀 기울이는 일월주야간보호센터를 기억해 주세요. 감사합니다.",
  "facilities": [
    "living",
    "rest",
    "bath",
    "foot",
    "counsel",
    "massage"
  ],
  "pCog": "맞춤형 인지 활동 등으로 생각을 나누고 손끝으로 표현합니다.",
  "pBody": "실버 신체 운동, 신체 프로그램 등 어르신께 맞는 움직임을 함께합니다.",
  "pMusic": "노래교실, 시니어 뮤직, 놀이 활동과 생신 잔치로 함께하는 기쁨을 나눕니다.",
  "campaign": true,
  "introVideo": "",
  "faq": "장기요양보험은 누가 이용할 수 있나요?\n65세 이상 어르신 또는 65세 미만이라도 치매·뇌혈관질환 등 법에서 정한 노인성 질병으로 일상생활에 도움이 필요한 분이 장기요양인정을 신청할 수 있습니다. 공단의 인정 조사와 등급판정을 거쳐 이용 대상과 급여 종류가 정해집니다.\n\n장기요양등급은 어떻게 신청하나요?\n국민건강보험공단 지사 또는 노인장기요양보험 홈페이지에서 신청 방법과 필요한 서류를 확인할 수 있습니다. 신청 후 공단의 인정 조사, 의사소견서 제출, 등급판정 절차가 진행됩니다. 가족 등 대리 신청도 가능하며, 자세한 절차는 공단 1577-1000으로 문의해 주세요.\n\n주야간보호·방문요양·요양원은 어떻게 다른가요?\n주야간보호는 하루 중 일정 시간 센터를 이용하고 가정으로 돌아오는 서비스이며, 방문요양은 요양보호사가 가정을 방문해 일상생활을 돕는 서비스입니다. 요양원은 시설에 입소해 생활하는 서비스입니다. 이용 가능한 급여 종류는 장기요양인정서와 개인별장기요양이용계획서에서 확인해 주세요.\n\n본인부담금은 얼마나 내나요?\n일반 수급자의 급여 본인부담률은 주야간보호·방문요양 등 재가급여 15%, 요양원 등 시설급여 20%입니다. 감경·면제 대상 여부와 이용 시간·일수에 따라 실제 금액이 달라집니다. 식재료비·간식비 등 비급여 비용은 별도이며, 홈페이지의 비용표와 계산기로 예상 금액을 확인할 수 있습니다.\n\n식재료비·간식비도 공단에서 지원하나요?\n식재료비·간식비 등 비급여 항목은 장기요양 급여비용과 별도로 본인이 부담합니다. 항목과 금액은 기관마다 다를 수 있으므로 홈페이지의 비급여 안내와 이용계약서를 확인해 주세요. 급여 본인부담 감경이 적용되더라도 비급여 비용은 별도로 확인해야 합니다.\n\n장기요양등급에 따라 무엇이 달라지나요?\n공단의 조사와 등급판정위원회 심의를 통해 1~5등급 또는 인지지원등급이 정해집니다. 등급에 따라 이용 가능한 급여 종류와 재가급여 월 한도액 등이 달라집니다. 실제 이용 계획은 장기요양인정서와 개인별장기요양이용계획서를 기준으로 확인합니다.\n\n재가급여 월 한도액을 넘으면 어떻게 되나요?\n재가급여는 등급별 월 한도액 범위 안에서 이용하며, 한도액을 초과한 급여비용은 전액 본인부담이 될 수 있습니다. 주야간보호 이용 조건 등에 따라 한도액 추가 산정이 가능한 경우도 있으므로, 여러 서비스를 함께 이용할 때는 기관과 공단에 월 이용 계획을 확인해 주세요.\n\n본인부담금 감경·면제는 어떻게 확인하나요?\n소득·재산 및 수급 자격 등 관련 기준에 따라 급여 본인부담금이 감경되거나 면제될 수 있습니다. 의료급여 수급권자도 자격에 따라 적용 기준이 다를 수 있으므로 일률적으로 판단하지 않습니다. 본인의 적용 여부는 공단이 발급한 관련 서류 또는 공단 1577-1000에서 확인해 주세요.\n\n일요일·공휴일에도 이용할 수 있나요?\n운영 요일과 공휴일 이용 가능 여부는 기관마다 다르므로 홈페이지의 운영시간 안내 또는 상담으로 확인해 주세요. 일요일·공휴일에 급여를 이용하면 서비스 종류와 해당 고시에 따라 가산이 적용될 수 있으며, 실제 본인부담금과 월 한도액 사용에도 영향을 줄 수 있습니다.\n\n등급 갱신·변경이나 판정 결과에 대한 문의는 어디에 하나요?\n장기요양인정서의 유효기간을 확인하고 기간이 끝나기 전에 공단에 갱신 절차를 문의해 주세요. 심신 상태가 달라졌다면 등급 변경을 신청할 수 있으며, 판정 결과에 대한 심사청구 등 절차도 공단에서 안내받을 수 있습니다. 신청 기한과 필요한 서류는 개인별 상황에 따라 확인해 주세요.",
  "preset": "sage",
  "ogLead": "어르신의 즐거운 하루, 보호자의 안심에 함께합니다",
  "ogTitle": "날마다 행복한 하루",
  "ogDesc": "어르신의 즐거운 하루 일월이 함께합니다",
  "ogVer": "20261119-v3",
  "naverCode": "",
  "googleCode": "",
  "geoQuickFacts": true,
  "geoBadge": true,
  "agencyName": "마케팅지니",
  "buildVersion": "3.2-ilwol-ui-20261118",
  "facilityThirdTitle": "족욕·목욕시설",
  "facilityPhoto1": "",
  "facilityPhoto2": "",
  "facilityPhoto3": "",
  "showFacilities": true,
  "logoImage": "",
  "mealFeeMonth": "2026-11",
  "snackFeeMonth": "2026-11",
  "facilityPhoto2_2": "",
  "facilityPhoto2_3": "",
  "facilityPhoto3_2": "",
  "facilityPhoto1_2": "",
  "facilityPhoto3_3": "",
  "facilityPhoto1_3": ""
};

function commonFaqItems() { return [
  {
    "q": "장기요양보험은 누가 이용할 수 있나요?",
    "a": "65세 이상 어르신 또는 65세 미만이라도 치매·뇌혈관질환 등 법에서 정한 노인성 질병으로 일상생활에 도움이 필요한 분이 장기요양인정을 신청할 수 있습니다. 공단의 인정 조사와 등급판정을 거쳐 이용 대상과 급여 종류가 정해집니다."
  },
  {
    "q": "장기요양등급은 어떻게 신청하나요?",
    "a": "국민건강보험공단 지사 또는 노인장기요양보험 홈페이지에서 신청 방법과 필요한 서류를 확인할 수 있습니다. 신청 후 공단의 인정 조사, 의사소견서 제출, 등급판정 절차가 진행됩니다. 가족 등 대리 신청도 가능하며, 자세한 절차는 공단 1577-1000으로 문의해 주세요."
  },
  {
    "q": "주야간보호·방문요양·요양원은 어떻게 다른가요?",
    "a": "주야간보호는 하루 중 일정 시간 센터를 이용하고 가정으로 돌아오는 서비스이며, 방문요양은 요양보호사가 가정을 방문해 일상생활을 돕는 서비스입니다. 요양원은 시설에 입소해 생활하는 서비스입니다. 이용 가능한 급여 종류는 장기요양인정서와 개인별장기요양이용계획서에서 확인해 주세요."
  },
  {
    "q": "본인부담금은 얼마나 내나요?",
    "a": "일반 수급자의 급여 본인부담률은 주야간보호·방문요양 등 재가급여 15%, 요양원 등 시설급여 20%입니다. 감경·면제 대상 여부와 이용 시간·일수에 따라 실제 금액이 달라집니다. 식재료비·간식비 등 비급여 비용은 별도이며, 홈페이지의 비용표와 계산기로 예상 금액을 확인할 수 있습니다."
  },
  {
    "q": "식재료비·간식비도 공단에서 지원하나요?",
    "a": "식재료비·간식비 등 비급여 항목은 장기요양 급여비용과 별도로 본인이 부담합니다. 항목과 금액은 기관마다 다를 수 있으므로 홈페이지의 비급여 안내와 이용계약서를 확인해 주세요. 급여 본인부담 감경이 적용되더라도 비급여 비용은 별도로 확인해야 합니다."
  },
  {
    "q": "장기요양등급에 따라 무엇이 달라지나요?",
    "a": "공단의 조사와 등급판정위원회 심의를 통해 1~5등급 또는 인지지원등급이 정해집니다. 등급에 따라 이용 가능한 급여 종류와 재가급여 월 한도액 등이 달라집니다. 실제 이용 계획은 장기요양인정서와 개인별장기요양이용계획서를 기준으로 확인합니다."
  },
  {
    "q": "재가급여 월 한도액을 넘으면 어떻게 되나요?",
    "a": "재가급여는 등급별 월 한도액 범위 안에서 이용하며, 한도액을 초과한 급여비용은 전액 본인부담이 될 수 있습니다. 주야간보호 이용 조건 등에 따라 한도액 추가 산정이 가능한 경우도 있으므로, 여러 서비스를 함께 이용할 때는 기관과 공단에 월 이용 계획을 확인해 주세요."
  },
  {
    "q": "본인부담금 감경·면제는 어떻게 확인하나요?",
    "a": "소득·재산 및 수급 자격 등 관련 기준에 따라 급여 본인부담금이 감경되거나 면제될 수 있습니다. 의료급여 수급권자도 자격에 따라 적용 기준이 다를 수 있으므로 일률적으로 판단하지 않습니다. 본인의 적용 여부는 공단이 발급한 관련 서류 또는 공단 1577-1000에서 확인해 주세요."
  },
  {
    "q": "일요일·공휴일에도 이용할 수 있나요?",
    "a": "운영 요일과 공휴일 이용 가능 여부는 기관마다 다르므로 홈페이지의 운영시간 안내 또는 상담으로 확인해 주세요. 일요일·공휴일에 급여를 이용하면 서비스 종류와 해당 고시에 따라 가산이 적용될 수 있으며, 실제 본인부담금과 월 한도액 사용에도 영향을 줄 수 있습니다."
  },
  {
    "q": "등급 갱신·변경이나 판정 결과에 대한 문의는 어디에 하나요?",
    "a": "장기요양인정서의 유효기간을 확인하고 기간이 끝나기 전에 공단에 갱신 절차를 문의해 주세요. 심신 상태가 달라졌다면 등급 변경을 신청할 수 있으며, 판정 결과에 대한 심사청구 등 절차도 공단에서 안내받을 수 있습니다. 신청 기한과 필요한 서류는 개인별 상황에 따라 확인해 주세요."
  }
]; }
function commonFaqText() { return commonFaqItems().map(f => f.q+"\n"+f.a).join("\n\n"); }

function defaults() {
  const d = {};
  GROUPS.forEach(g => g.fields.forEach(f => {
    if (f.type === 'note' || f.type === 'button') return;
    d[f.id] = f.def !== undefined ? (Array.isArray(f.def) ? f.def.slice() : f.def) : (f.type === 'checks' ? [] : (f.type === 'check' ? false : ''));
  }));
  d.ogVer = todayYmd() + 'a';
  d.nonCoverMonth = todayIso().slice(0, 7);
  d.faq = commonFaqText();
  return d;
}


/* ============ [D] 입력값 → 계산된 값 ============ */
const P_DEF = {
  pCog: '맞춤형 인지 활동 등으로 생각을 나누고 손끝으로 표현합니다.',
  pBody: '실버 신체 운동, 신체 프로그램 등 어르신께 맞는 움직임을 함께합니다.',
  pMusic: '노래교실, 시니어 뮤직, 놀이 활동과 생신 잔치로 함께하는 기쁨을 나눕니다.'
};
function splitList(s) { return String(s || '').split(/[,\n、·]/).map(x => x.trim()).filter(Boolean); }
function ymdDots(s, sep) { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? m[1] + sep + m[2] + sep + m[3] : ''; }

function parseFaq(text) {
  return String(text || '').split(/\n\s*\n/).map(b => b.trim()).filter(Boolean).map(b => {
    const ls = b.split('\n').map(x => x.trim());
    const q = ls.shift().replace(/^Q\s*[.:：]\s*/i, '').trim();
    const a = ls.join(' ').replace(/^A\s*[.:：]\s*/i, '').trim();
    return { q, a };
  }).filter(x => x.q && x.a);
}


/* 수가 관련 함수·데이터는 공통 모듈(CORE)에 있다. 아래는 기존 이름을 그대로 쓰기 위한 별칭. */
const RATE_KEYS = CORE.RATE_KEYS, RATE_PRESETS = CORE.RATE_PRESETS, rateValid = CORE.rateValid, applyRate = CORE.applyRate, syncRate = CORE.syncRate;
function normalizeCosts(d) {
 d={...d};
 d.faq=commonFaqText();
 if(['navy','rose'].includes(d.preset))d.preset='warm';
 d.mealFee=String(CORE.price(d.mealFee)); d.snackFee=String(CORE.price(d.snackFee));   /* 0원도 그대로 0 */
 d.faq=CORE.substituteFees(d.faq,d.mealFee,d.snackFee);
 return d;
}

function derive(d) {
  d = normalizeCosts(d);
  const D = { d };
  D.theme = themeFor(d);
  D.name = d.name || '(센터 이름)';
  D.short = d.shortName || D.name.replace(/(주·야간보호센터|주야간보호센터|주간보호센터|데이케어센터|주야간보호|주간보호|데이케어|센터)$/, '') || D.name;
  D.tel = fmtPhone(d.tel) || '000-000-0000';
  D.telDigits = D.tel.replace(/\D/g, '');
  D.addrFull = [d.sido, d.region, d.street].filter(Boolean).join(' ') + (d.dong ? ' (' + d.dong + ')' : '');
  const site = CORE.resolveSiteUrl(d);   /* 자체 도메인 > 공개 주소 칸. 정규 주소·og·사이트맵·robots·llms.txt 가 모두 이 한 값에서 나온다 */
  D.url = site.url; D.urlSource = site.source; D.domain = site.domain;
  D.hostTarget = d.hostTarget === 'netlify' ? 'netlify' : 'github';
  D.dayText = dayLabel(d.days || []);
  const off = DAYS.filter(x => !(d.days || []).includes(x));
  D.hours = (D.dayText ? D.dayText + ' ' : '') + (d.open || '') + '~' + (d.close || '');
  D.closedText = d.closed || (off.length ? dayLabel(off).replace(/^([월화수목금토일])$/, '$1요일') + ' 정기휴무' : '연중무휴');
  D.shuttle = d.shuttle === 'yes';
  D.shuttleTime = d.shuttleTime || '';
  D.areas = splitList(d.shuttleAreas);
  D.meals = MEALS.filter(m => (d.meals || []).includes(m));
  D.mealsText = D.meals.join(' · ');
  D.cookText = d.cooking === 'direct' ? (D.meals.includes('점심') && D.meals.includes('저녁') ? '점심·저녁은 센터에서 직접 조리' : '식사는 센터에서 직접 조리') : (d.cooking === 'out' ? '식사는 급식 업체에서 공급' : '');
  D.staff = String(d.staff || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => { const m = l.match(/^(.+?)\s*(\d+)\s*명?$/); return m ? { role: m[1].trim(), n: parseInt(m[2], 10) } : null; }).filter(Boolean);
  D.staffTotal = D.staff.reduce((a, b) => a + b.n, 0);
  D.capacity = num(d.capacity);
  D.zoomStyle = d.zoomStyle === 'pill' ? 'pill' : 'circle';
  D.fees = ['fee1', 'fee2', 'fee3', 'fee4', 'fee5', 'feeCog'].map(k => num(d[k]));
  D.feeOk = !!d.showFee && D.fees.every(v => v);
  const pct = r => D.fees.map(v => v ? Math.floor((v * r + 50) / 100) : null); // 원 단위 반올림
  D.copay = pct(15); D.copay9 = pct(9); D.copay6 = pct(6);
  D.mealFee = num(d.mealFee); D.snackFee = num(d.snackFee);
  const nm = String(d.nonCoverMonth || '').match(/^(\d{4})-(\d{2})$/);
  D.asof = nm ? nm[1] + '년 기준' : '';
  const feeMonthLabel=v=>{const m=String(v||'').match(/^(\d{4})-(0[1-9]|1[0-2])$/);return m?m[1]+'년 기준':'';};
  D.mealAsOf=feeMonthLabel(d.mealFeeMonth||d.nonCoverMonth);
  D.snackAsOf=feeMonthLabel(d.snackFeeMonth||d.nonCoverMonth);
  D.ratingText = { new: '신규 기관', A: 'A등급', B: 'B등급', C: 'C등급', D: 'D등급', E: 'E등급', none: '' }[d.rating] || '';
  D.availAsof = ymdDots(d.availDate, '.') ? ymdDots(d.availDate, '.') + ' 기준' : '';
  D.hero2 = d.hero2 || (D.short + (hasBatchim(D.short) ? '이' : '가') + ' 함께합니다.');
  D.mapQ = d.mapQuery || D.name;
  D.title = (d.sample ? '[샘플] ' : '') + D.name + ' | ' + [d.region, d.careType].filter(Boolean).join(' ');
  D.cityShort = (d.region || '').split(/\s+/)[0].replace(/[시군]$/, '');
  const bits = [];
  bits.push([d.region, d.dong].filter(Boolean).join(' ') + ' ' + D.name + '.');
  if (D.meals.length) bits.push((D.cookText ? D.cookText + ', ' : '') + D.meals.join('·') + ' 제공,');
  if (D.shuttle) bits.push('차량 송영,');
  bits.push('인지·신체·여가 프로그램.');
  bits.push(D.hours + ', 상담 ' + D.tel);
  D.metaDesc = bits.join(' ').replace(/\s+/g, ' ').replace(/,\./g, '.').trim();
  D.ogTitle = d.ogTitle || ((d.sample ? '[샘플] ' : '') + D.name + ' | ' + [d.region, d.careType].filter(Boolean).join(' '));
  D.ogDesc = d.ogDesc || (d.hero1 + ' ' + D.short + (hasBatchim(D.short) ? '이' : '가') + ' 함께합니다. 상담 ' + D.tel);
  D.ogVer = d.ogVer || todayYmd();
  D.faq = commonFaqItems();
  D.blog = (d.blog || '').trim();
  D.blogMeal = (d.blogMeal || '').trim() || D.blog;
  D.blogPhoto = (d.blogPhoto || '').trim() || D.blog;
  D.naverPlace = (d.naverPlace || '').trim();
  D.netlifySub = (d.netlifySub || '').trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  D.showCalc = d.showCalc !== false;
  D.geoQuickFacts = d.geoQuickFacts !== false;
  D.geoBadge = d.geoBadge !== false;
  D.agency = (d.agencyName || '마케팅지니').trim();
  D.kakao = (d.kakao || '').trim();
  return D;
}

function defaultFaq(d) { return commonFaqText(); }

/* ============ [E] 일러스트(그림) 3장: 실제 사람 사진 대신 ============ */
function heroSvgs(D) {
  const T = D.theme, h = T.h, A = T.accent, S = T.second, TH = T.third;
  const nm = D.name, fs = Math.max(16, Math.min(32, Math.floor(340 / Math.max(nm.length, 1))));
  const sky1 = hsl2hex(h, 45, 97), sky2 = hsl2hex(h, 40, 89), g1 = hsl2hex(h, 30, 83), g2 = hsl2hex(h, 28, 75);
  const s1 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900"><defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky1}"/><stop offset="1" stop-color="${sky2}"/></linearGradient><radialGradient id="glow"><stop offset="0" stop-color="#f3cf8f" stop-opacity=".7"/><stop offset="1" stop-color="#f3cf8f" stop-opacity="0"/></radialGradient></defs><rect width="1600" height="900" fill="url(#sky)"/><circle cx="1130" cy="250" r="330" fill="url(#glow)"/><circle cx="1130" cy="250" r="105" fill="#e7b465"/><g stroke="#e7b465" stroke-width="10" stroke-linecap="round"><path d="M1130 100v-34M1130 400v34M980 250h-34M1280 250h34M1024 144l-24-24M1236 356l24 24M1024 356l-24 24M1236 144l24-24"/></g><g fill="#fff" opacity=".9"><rect x="250" y="170" width="210" height="54" rx="27"/><rect x="300" y="140" width="110" height="60" rx="30"/><rect x="1330" y="420" width="170" height="46" rx="23"/><rect x="1370" y="396" width="90" height="50" rx="25"/></g><path d="M0 690c220-50 420-60 640-30s520 40 960-20v260H0z" fill="${g1}"/><path d="M0 760c300-40 560-30 860 0s500 20 740-10v150H0z" fill="${g2}"/><rect x="590" y="330" width="440" height="390" rx="10" fill="#fff"/><rect x="590" y="330" width="440" height="70" rx="10" fill="${A}"/><rect x="590" y="370" width="440" height="30" fill="${A}"/><circle cx="640" cy="365" r="16" fill="#fff"/><text x="672" y="377" font-family="Noto Sans KR, Malgun Gothic, sans-serif" font-size="${fs}" font-weight="700" fill="#fff">${esc(nm)}</text><g fill="#d6e2e3"><rect x="625" y="430" width="100" height="80" rx="6"/><rect x="760" y="430" width="100" height="80" rx="6"/><rect x="895" y="430" width="100" height="80" rx="6"/><rect x="625" y="540" width="100" height="80" rx="6"/><rect x="895" y="540" width="100" height="80" rx="6"/></g><g fill="#f1d8a8" opacity=".9"><rect x="625" y="430" width="100" height="22" rx="6"/><rect x="895" y="540" width="100" height="22" rx="6"/></g><rect x="765" y="560" width="90" height="160" rx="6" fill="${S}"/><rect x="805" y="560" width="10" height="160" fill="#fff" opacity=".5"/><rect x="487" y="590" width="14" height="120" fill="${TH}"/><circle cx="494" cy="560" r="62" fill="#7f9c8f"/><circle cx="470" cy="600" r="40" fill="#6d8b7e"/><rect x="1117" y="600" width="14" height="110" fill="${TH}"/><circle cx="1124" cy="575" r="56" fill="#7f9c8f"/><circle cx="1150" cy="610" r="36" fill="#6d8b7e"/>${D.shuttle ? `<g transform="translate(250 600)"><path d="M0 40q0-40 40-40h200q30 0 46 26l40 64q8 12 8 26v44q0 20-20 20H20q-20 0-20-20z" fill="${S}"/><rect x="30" y="18" width="70" height="52" rx="8" fill="#d6e2e3"/><rect x="115" y="18" width="70" height="52" rx="8" fill="#d6e2e3"/><path d="M200 18h40q16 0 26 16l24 36h-90z" fill="#d6e2e3"/><rect x="0" y="104" width="334" height="10" fill="${A}"/><circle cx="80" cy="180" r="30" fill="#2a2a2a"/><circle cx="80" cy="180" r="12" fill="#ddd"/><circle cx="260" cy="180" r="30" fill="#2a2a2a"/><circle cx="260" cy="180" r="12" fill="#ddd"/><circle cx="150" cy="135" r="12" fill="#e7b465"/></g>` : ''}</svg>`;
  const s2 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${hsl2hex(h, 18, 95)}"/><stop offset="1" stop-color="${hsl2hex(h, 16, 88)}"/></linearGradient><filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#3c4a4e" flood-opacity=".18"/></filter></defs><rect width="1600" height="900" fill="url(#bg)"/><g fill="#fff" opacity=".55"><circle cx="210" cy="190" r="120"/><circle cx="1420" cy="720" r="160"/></g><rect x="380" y="190" width="840" height="560" rx="40" fill="#c9a77a" filter="url(#sh)"/><rect x="404" y="214" width="792" height="512" rx="28" fill="#d8b98d"/><g filter="url(#sh)"><circle cx="560" cy="350" r="78" fill="#fff"/><circle cx="760" cy="350" r="78" fill="#fff"/><circle cx="960" cy="350" r="78" fill="#fff"/></g><g fill="#7fa25a"><ellipse cx="540" cy="345" rx="34" ry="16" transform="rotate(-25 540 345)"/><ellipse cx="580" cy="360" rx="34" ry="16" transform="rotate(20 580 360)"/><ellipse cx="555" cy="375" rx="28" ry="12"/></g><g fill="#d9694a"><rect x="725" y="320" width="34" height="34" rx="6" transform="rotate(12 742 337)"/><rect x="765" y="340" width="34" height="34" rx="6" transform="rotate(-10 782 357)"/><rect x="735" y="360" width="30" height="30" rx="6"/></g><g><ellipse cx="960" cy="350" rx="50" ry="40" fill="#f6d36a"/><ellipse cx="960" cy="350" rx="50" ry="40" fill="none" stroke="#fff" stroke-width="6" stroke-dasharray="10 14"/></g><g filter="url(#sh)"><circle cx="620" cy="575" r="118" fill="#fff"/><circle cx="900" cy="575" r="118" fill="${A}"/></g><circle cx="620" cy="575" r="96" fill="#f4efe6"/><path d="M540 585q80-90 160 0q-80 40-160 0z" fill="#fff"/><circle cx="900" cy="575" r="96" fill="#e9c27e"/><g fill="#f7e2b5"><circle cx="870" cy="555" r="14"/><circle cx="925" cy="590" r="11"/><circle cx="905" cy="545" r="9"/></g><g fill="#7fa25a"><circle cx="880" cy="600" r="8"/><circle cx="935" cy="560" r="7"/></g><g fill="${TH}"><rect x="1070" y="420" width="16" height="280" rx="8"/><ellipse cx="1078" cy="420" rx="30" ry="44"/><rect x="1110" y="400" width="10" height="300" rx="5"/><rect x="1130" y="400" width="10" height="300" rx="5"/></g></svg>`;
  const s3 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${hsl2hex(h, 35, 95)}"/><stop offset="1" stop-color="${hsl2hex(h, 30, 89)}"/></linearGradient><filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#5a4630" flood-opacity=".16"/></filter></defs><rect width="1600" height="900" fill="url(#bg)"/><g fill="#fff" opacity=".6"><circle cx="1350" cy="200" r="140"/><circle cx="250" cy="760" r="170"/></g><g fill="#2a2a2a"><rect x="452" y="200" width="12" height="150" rx="6"/><rect x="560" y="176" width="12" height="150" rx="6"/><path d="M452 200l120-24v34l-120 24z"/><ellipse cx="430" cy="350" rx="36" ry="27" transform="rotate(-18 430 350)"/><ellipse cx="538" cy="326" rx="36" ry="27" transform="rotate(-18 538 326)"/></g><g fill="${A}"><rect x="680" y="250" width="10" height="110" rx="5"/><ellipse cx="664" cy="360" rx="26" ry="20" transform="rotate(-18 664 360)"/><path d="M690 250q40 10 30 50q-6-26-30-30z"/></g><g filter="url(#sh)"><g fill="${A}"><rect x="560" y="480" width="170" height="170" rx="18"/><circle cx="645" cy="480" r="32"/><circle cx="730" cy="565" r="32"/></g><g fill="${S}"><rect x="752" y="480" width="170" height="170" rx="18"/><circle cx="837" cy="650" r="32"/></g><g fill="${T.deep}"><rect x="560" y="672" width="170" height="130" rx="18"/></g><g fill="${TH}"><rect x="752" y="672" width="170" height="130" rx="18"/><circle cx="752" cy="737" r="30"/></g></g><g filter="url(#sh)"><path d="M1030 800l12-110h76l12 110z" fill="#e8796a"/><path d="M1140 800l12-110h76l12 110z" fill="#f2c75c"/><path d="M1250 800l12-110h76l12 110z" fill="#7aa7c7"/><path d="M1085 690l12-110h76l12 110z" fill="#8fbf7a"/><path d="M1195 690l12-110h76l12 110z" fill="#c79bd6"/><path d="M1140 580l12-110h76l12 110z" fill="#e8796a"/></g><g transform="translate(40 -90)"><g filter="url(#sh)"><path d="M1090 230c120-60 300-10 300 100 0 60-60 60-90 50s-50 20-40 50c10 40-60 70-140 40-110-40-140-200-30-240z" fill="#fff"/></g><circle cx="1150" cy="290" r="26" fill="#e8796a"/><circle cx="1230" cy="260" r="24" fill="#f2c75c"/><circle cx="1310" cy="290" r="22" fill="#7aa7c7"/><circle cx="1160" cy="380" r="24" fill="#8fbf7a"/><g transform="rotate(-35 1000 420)"><rect x="960" y="400" width="200" height="16" rx="8" fill="${TH}"/><path d="M1160 400q50 8 0 16z" fill="#2a2a2a"/></g></g><path d="M300 420c0-40 60-50 70-10 10-40 70-30 70 10 0 50-70 80-70 80s-70-30-70-80z" fill="#e8796a" opacity=".85"/></svg>`;
  const uri = s => 'data:image/svg+xml,' + encodeURIComponent(s);
  return [uri(s1), uri(s2), uri(s3)];
}

/* ============ [F] 구조화 정보(JSON-LD · GEO 6종 멀티 스키마) ============ */
const MULTI_PAGES = [
  { file: 'index.html', title: '홈', navTitle: '홈', pri: '1.0' },
  { file: 'about.html', title: '센터소개·시설안내', navTitle: '센터소개', pri: '0.9' },
  { file: 'program.html', title: '프로그램·식단표(블로그)', navTitle: '프로그램·식단', pri: '0.9' },
  { file: 'guide.html', title: '비용·본인부담금 계산기·FAQ', navTitle: '비용·계산기', pri: '0.9' },
  { file: 'contact.html', title: '오시는길·상담문의', navTitle: '오시는길', pri: '0.8' }
];

function jsonLdText(D, page) {
  page = page || 'index.html';
  const d = D.d;
  const pageUrl = CORE.pageUrl(D.url, page);
  const iso = todayIso();

  // 1. WebSite Schema
  const webSite = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': D.url + '#website',
    name: D.name,
    alternateName: d.eng || D.short,
    url: D.url,
    inLanguage: 'ko-KR',
    dateModified: iso
  };

  // 2. LocalBusiness + DayCare + MedicalBusiness (엔티티·공공기관 기호·비용 명세 포함)
  const biz = {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'DayCare', 'MedicalBusiness'],
    '@id': D.url + '#organization',
    name: D.name,
    alternateName: [D.short + '주간보호센터', d.eng].filter(Boolean),
    description: [d.region, d.dong].filter(Boolean).join(' ') + ' 장기요양기관(' + (d.careType || '주·야간보호') + '). ' + (D.cookText ? D.cookText + '하고 ' : '') + (D.mealsText ? D.mealsText + ' 식사를 제공합니다. ' : '') + '인지·신체·여가 프로그램을 운영합니다.',
    url: D.url,
    image: D.url + 'og.png',
    telephone: e164(d.tel),
    priceRange: '장기요양 급여비용 본인부담 15%(일반) / 감경 6~9%',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'KR',
      addressRegion: d.sido || '',
      addressLocality: d.region || '',
      streetAddress: d.street || ''
    },
    areaServed: D.areas.length ? D.areas : [d.sido, d.region, d.dong].filter(Boolean).join(' '),
    openingHoursSpecification: [{
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: (d.days || []).map(x => ENG_DAY[x]),
      opens: d.open,
      closes: d.close
    }],
    knowsAbout: ['노인주야간보호', '장기요양보험', '데이케어센터', '치매인지프로그램', '실버체육', '방문송영서비스']
  };
  if (d.orgNo) {
    biz.identifier = {
      '@type': 'PropertyValue',
      name: '장기요양기관기호',
      propertyID: 'NHIS_LTC_CODE',
      value: d.orgNo
    };
  }
  if (d.designDate) biz.foundingDate = d.designDate;
  if (D.capacity) biz.maximumAttendeeCapacity = D.capacity;
  if (d.email) biz.email = d.email;
  const same = [D.naverPlace, D.blog, D.kakao].filter(Boolean);
  if (same.length) biz.sameAs = same;

  // 3. Service & OfferCatalog Schema (급여비용·식비·간식비 구조화)
  if (D.feeOk) {
    const nm6 = ['1등급', '2등급', '3등급', '4등급', '5등급', '인지지원등급'];
    biz.hasOfferCatalog = {
      '@type': 'OfferCatalog',
      name: (d.feeYear || '2026') + '년 ' + (d.careType || '주·야간보호') + ' 급여비용 및 본인부담금 (' + (d.feeBand || '8~10시간') + ', 계산 예시)',
      itemListElement: nm6.map((gName, idx) => ({
        '@type': 'Offer',
        name: gName + ' 1일 본인부담금 (일반 15% 계산 예시)',
        description: '1일 급여비용 ' + won(D.fees[idx]) + '원 중 일반 본인부담 15% ' + won(D.copay[idx]) + '원 (40% 감경 시 ' + won(D.copay9[idx]) + '원, 60% 감경 시 ' + won(D.copay6[idx]) + '원)',
        price: String(D.copay[idx]),
        priceCurrency: 'KRW'
      })).concat([
        {'@type':'Offer',name:'식재료비 1식 (비급여)',price:String(D.mealFee ?? 0),priceCurrency:'KRW'},
        {'@type':'Offer',name:'간식비 1회 (비급여)',price:String(D.snackFee ?? 0),priceCurrency:'KRW'}
      ])
    };
  }

  // 4. BreadcrumbList Schema (현재 페이지 계층)
  const curMeta = MULTI_PAGES.find(p => p.file === page) || MULTI_PAGES[0];
  const crumbs = [{ '@type': 'ListItem', position: 1, name: D.name + ' 홈', item: D.url }];
  if (page !== 'index.html') {
    crumbs.push({ '@type': 'ListItem', position: 2, name: curMeta.title, item: pageUrl });
  }
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs
  };

  const out = [webSite, biz, breadcrumb];

  // 5. FAQPage Schema
  if (D.faq.length && (page === 'index.html' || page === 'guide.html' || page === 'contact.html')) {
    out.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: D.faq.map(f => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a }
      }))
    });
  }

  // 6. VideoObject Schema (캠페인/소개 영상 미디어 이해도 향상)
  if (d.campaign && page === 'index.html') {
    out.push({
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      name: '노인장기요양보험 제도 안내 캠페인 영상 (국민건강보험공단 공식)',
      description: '국민건강보험공단이 제공하는 노인장기요양보험 주야간보호 서비스 안내 영상입니다. 어르신의 돌봄과 기능 회복, 가족의 부양 부담 경감을 돕는 제도 소개를 담고 있습니다.',
      thumbnailUrl: ['https://i.ytimg.com/vi/5OTooUpgcic/maxresdefault.jpg'],
      uploadDate: '2024-01-01',
      embedUrl: 'https://www.youtube.com/embed/5OTooUpgcic'
    });
  }

  return out;
}
const ldString = o => JSON.stringify(o, null, 2).replace(/</g, '\\u003c');

/* ============ [G] llms.txt · sitemap.xml · robots.txt (GEO 최적화) ============ */
function buildLlms(D) {
  const d = D.d, L = [];
  const ex4Day = D.copay[3] || 8700;
  const exMeal = CORE.nonCoverExample(D.mealFee, D.snackFee, D.meals.includes('저녁'));
  const exMonth = (ex4Day + exMeal) * 22;

  L.push('# ' + D.name + (d.eng ? ' (' + d.eng + ')' : ''));
  L.push('');
  L.push('> ' + [d.sido, d.region, d.dong].filter(Boolean).join(' ') + '에 위치한 장기요양기관(' + (d.careType || '주·야간보호') + ')입니다. ' + (D.mealsText ? D.mealsText + ' 식사' + (D.cookText ? '(' + D.cookText + ')' : '') + ', ' : '') + (D.shuttle ? '가정 앞 차량 송영 서비스, ' : '') + '맞춤형 인지·신체·여가 프로그램을 운영합니다.' + (d.sample ? ' (제작기 시험용 샘플이며 실제 센터가 아닙니다)' : ''));
  L.push('');
  L.push('## AI 추천·답변용 핵심 요약 (Quick Facts for AI Assistants)');
  L.push('- **어떤 곳인가요?**: ' + [d.sido, d.region, d.dong].filter(Boolean).join(' ') + ' 어르신 주야간보호센터(데이케어센터)');
  L.push('- **누가 이용할 수 있나요?**: 노인장기요양보험 1~5등급 및 인지지원등급 수급자 (등급 신청 전 어르신도 등급 신청 절차 무료 상담 가능)');
  L.push('- **위치 및 주소**: ' + D.addrFull + (d.transit ? ' (' + d.transit + ')' : ''));
  L.push('- **상담 대표전화**: ' + D.tel);
  L.push('- **운영 요일·시간**: ' + D.hours + ' (' + D.closedText + (d.holidayNote ? ', ' + d.holidayNote : '') + ')');
  L.push('- **월 예상 비용(4등급·일반 15%·8~10시간·22일 계산 예시)**: 월 약 ' + won(exMonth) + '원 (급여 본인부담금 + 식재료비·간식비 포함 예시, 홈페이지 내 본인부담금 계산기에서 조건별 즉시 계산 가능)');
  L.push('');
  L.push('## 기본 정보');
  L.push('- 기관명: ' + D.name);
  L.push('- 급여 종류: ' + (d.careType || '주·야간보호'));
  L.push('- 주소: ' + D.addrFull);
  L.push('- 전화: ' + D.tel);
  L.push('- 운영시간: ' + D.hours + ' (' + D.closedText + ')');
  if (d.holidayNote) L.push('- 법정공휴일: ' + d.holidayNote);
  if (D.shuttle) L.push('- 차량 송영: ' + (D.shuttleTime || '운행 시간은 상담 시 안내') + (D.areas.length ? ' / 가능 지역: ' + D.areas.join(', ') : ' / 운행 지역은 상담 시 확인'));
  if (D.mealsText) L.push('- 식사: ' + D.mealsText + (D.cookText ? ' (' + D.cookText + ')' : ''));
  if (d.parking) L.push('- 주차: ' + d.parking.replace(/\s+/g, ' '));
  if (d.transit) L.push('- 대중교통: ' + d.transit.replace(/\s+/g, ' '));
  L.push('');
  L.push('## 장기요양기관 공식 등록 정보 (E-E-A-T 신뢰 신호)');
  if (d.orgNo) L.push('- 장기요양기관 기호: ' + d.orgNo + ' (국민건강보험공단 노인장기요양보험 등록기관)');
  if (D.ratingText) L.push('- 공단 평가 등급: ' + D.ratingText);
  if (d.designDate) L.push('- 지정·신고일: ' + ymdDots(d.designDate, '.'));
  if (D.capacity) L.push('- 등록 정원: ' + D.capacity + '명');
  if (d.current) L.push('- 현원: ' + d.current + (D.availAsof ? ' (' + D.availAsof + ')' : ''));
  if (d.avail) L.push('- 이용 가능 인원: ' + d.avail + (D.availAsof ? ' (' + D.availAsof + ')' : ''));
  if (D.staff.length) L.push('- 전문 인력 현황: ' + D.staff.map(s => s.role + ' ' + s.n + '명').join(', ') + ' (총 ' + D.staffTotal + '명)');
  L.push('');
  L.push('## 주요 시설 및 프로그램');
  const facs = (d.facilities || []).filter(k => FAC[k]);
  if (facs.length) L.push('- 보유 시설: ' + facs.map(k => FAC[k].t + '(' + FAC[k].p + ')').join(', '));
  L.push('- 인지 활동: ' + (d.pCog || P_DEF.pCog));
  L.push('- 신체 활동: ' + (d.pBody || P_DEF.pBody));
  L.push('- 음악·여가 활동: ' + (d.pMusic || P_DEF.pMusic));
  L.push('');
  L.push('## 비용 안내 ('+d.feeYear+'년 '+(CORE.isProposal(d)?'의결안':'고시')+' 기준 계산 예시)');
  if (D.feeOk) {
    const nm6 = ['1등급', '2등급', '3등급', '4등급', '5등급', '인지지원등급'];
    L.push('- ' + d.feeYear + '년 ' + (CORE.isProposal(d) ? '의결안(확정 전) ' : '') + '기준 ' + (d.careType || '') + ' 1일당 급여비용(' + d.feeBand + '): ' + nm6.map((n, i) => n + ' ' + won(D.fees[i]) + '원').join(', '));
    L.push('- 일반 수급자 본인부담금(15% 계산 예시, 노인장기요양보험법 제40조): ' + nm6.map((n, i) => n + ' ' + won(D.copay[i]) + '원').join(', '));
    L.push('- 40% 감경 대상자 본인부담금(9% 계산 예시): ' + nm6.map((n, i) => n + ' ' + won(D.copay9[i]) + '원').join(', '));
    L.push('- 60% 감경 대상자 본인부담금(6% 계산 예시): ' + nm6.map((n, i) => n + ' ' + won(D.copay6[i]) + '원').join(', '));
    L.push('- 주야간보호 8시간 이상 월 15일 이상 이용 시 월 한도액 증액(1·2등급 +10%, 3~5등급 +20%) 규정이 적용됩니다.');
    L.push('- 감경 여부는 건강보험료 순위 등 법령 기준에 따라 국민건강보험공단이 판단하며, 센터가 임의로 할인·면제하지 않습니다(노인장기요양보험법 제35조 준수).');
  } else L.push('- 본인부담금은 급여비용의 15%입니다(「노인장기요양보험법」 제40조). 정확한 금액은 상담 시 안내합니다.');
  if (D.mealFee != null) L.push('- 식재료비(비급여): 1식 ' + won(D.mealFee) + '원' + (D.mealAsOf ? ' (' + D.mealAsOf + ')' : ''));
  if (D.snackFee != null) L.push('- 간식비(비급여): 1회 ' + won(D.snackFee) + '원' + (D.snackAsOf ? ' (' + D.snackAsOf + ')' : ''));
  if (D.faq.length) {
    L.push(''); L.push('## 자주 묻는 질문 (FAQ)');
    D.faq.forEach(f => { L.push(''); L.push('### Q. ' + f.q); L.push('A. ' + f.a); });
  }
  L.push(''); L.push('## 멀티페이지 사이트맵 및 공식 채널 링크');
  L.push('- [홈 (메인 요약)](' + D.url + ')');
  L.push('- [센터소개·시설·하루일과](' + D.url + 'about.html)');
  L.push('- [프로그램·이달의 식단표·활동사진](' + D.url + 'program.html)');
  L.push('- [이용안내·본인부담금 계산기·FAQ](' + D.url + 'guide.html)');
  L.push('- [오시는길·상담문의](' + D.url + 'contact.html)');
  if (D.naverPlace) L.push('- [네이버 스마트플레이스(지도·위치)](' + D.naverPlace + ')');
  if (D.blog) L.push('- [공식 네이버 블로그(실제 활동 소식)](' + D.blog + ')');
  if (D.blogMeal && D.blogMeal !== D.blog) L.push('- [이달의 식단표·프로그램표 게시판](' + D.blogMeal + ')');
  if (D.blogPhoto && D.blogPhoto !== D.blog) L.push('- [어르신 활동사진 게시판](' + D.blogPhoto + ')');
  if (D.kakao) L.push('- [카카오톡 채널 상담](' + D.kakao + ')');
  L.push('- [국민건강보험공단 노인장기요양보험](https://www.longtermcare.or.kr)');
  return L.join('\n') + '\n';
}

function buildSitemap(D) {
  const iso = todayIso();
  const urls = MULTI_PAGES.map(p => {
    const loc = CORE.pageUrl(D.url, p.file);
    return '  <url>\n    <loc>' + esc(loc) + '</loc>\n    <lastmod>' + iso + '</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>' + p.pri + '</priority>\n  </url>';
  }).join('\n');
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + '\n</urlset>\n';
}

function buildRobots(D) {
  if (D.d.sample) return '# 샘플(시험용) 페이지: 검색에 나오지 않게 막습니다.\nUser-agent: *\nDisallow: /\n';
  const ai = [
    'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
    'ClaudeBot', 'Claude-Web', 'Claude-SearchBot', 'anthropic-ai',
    'PerplexityBot', 'Perplexity-User',
    'Google-Extended', 'GoogleOther',
    'Applebot-Extended',
    'Yeti', 'NaverBot',
    'DuckAssistBot', 'cohere-ai'
  ];
  return '# GEO(생성형 AI 검색 최적화) 설계 적용: 모든 검색 로봇과 AI 답변 엔진의 수집·인용을 허용합니다.\nUser-agent: *\nAllow: /\n\n# 국내외 검색 및 생성형 AI 크롤러 명시적 허용\n' +
    ai.map(a => 'User-agent: ' + a + '\nAllow: /\n').join('\n') +
    '\nSitemap: ' + D.url + 'sitemap.xml\n# AI 전용 구조화 문서(LLMs.txt): ' + D.url + 'llms.txt\n';
}


/* 자체 도메인 연결 및 클린 URL 리다이렉트 (_redirects) */
function buildRedirects(D) {
  const lines = [
    '# Netlify _redirects — GEO 기준 02: 도메인 정규화(301 리디렉션) 및 멀티페이지 클린 URL 지원'
  ];
  const primary = D.url.replace(/\/$/, '');
  const hostMatch = primary.match(/^https:\/\/([^\/]+)/i);
  const host = hostMatch ? hostMatch[1] : '';
  if (D.netlifySub && host && D.netlifySub.toLowerCase() !== host.toLowerCase()) {
    lines.push('https://' + D.netlifySub + '/* ' + primary + '/:splat 301!');
    lines.push('http://' + D.netlifySub + '/* ' + primary + '/:splat 301!');
  }
  if (host && !host.startsWith('www.') && !host.endsWith('.netlify.app') && !host.includes('example.com')) {
    lines.push('https://www.' + host + '/* ' + primary + '/:splat 301!');
    lines.push('http://www.' + host + '/* ' + primary + '/:splat 301!');
    lines.push('http://' + host + '/* ' + primary + '/:splat 301!');
  }
  lines.push('/home /index.html 301');
  lines.push('/about /about.html 200');
  lines.push('/program /program.html 200');
  lines.push('/guide /guide.html 200');
  lines.push('/contact /contact.html 200');
  return lines.join('\n') + '\n';
}
/* ============ [H] 홈페이지(index.html) 만들기 ============ */
function themeCss(D) {
  const T = D.theme, n = D.name.length;
  const fsM = n <= 9 ? 'clamp(20px,6.2vw,26px)' : (n <= 12 ? 'clamp(17px,5.2vw,22px)' : 'clamp(15px,4.4vw,19px)');
  return ':root{--gold:' + T.accent + ';--gold-soft:' + T.soft + ';--slate:' + T.second + ';--taupe:' + T.third + ';--char:' + T.dark + ';--teal:' + T.second + ';--green:' + T.second +
    ';--green-deep:' + T.deep + ';--sand:' + T.sand + ';--light-gold:' + T.light + ';--ink:' + T.dark + ';--ink-soft:' + T.inkSoft + ';--ink-faint:' + T.inkFaint + ';--bg:' + T.bg +
    ';--soft:' + T.soft + ';--line:' + T.line + ';--hero-glow:' + T.glow + ';--hero-shade:' + T.shade + ';--hero-1:' + T.hero1 + ';--hero-2:' + T.hero2 + ';--hero-3:' + T.hero3 +
    ';--footer:' + T.foot + ';--logo-fs:' + fsM + '}' + (n > 9 ? '\n@media (min-width:721px){.logo b{font-size:clamp(26.4px,2.64vw,' + (n > 12 ? 24 : 28) + 'px) !important}}' : '');
}
const ICON = {
  car: '<rect x="8" y="14" width="48" height="32" rx="6"/><path d="M8 30h48M18 14v16M30 14v16M42 14v16"/><circle cx="20" cy="50" r="5"/><circle cx="44" cy="50" r="5"/>',
  bowl: '<path d="M8 34h48a24 24 0 0 1-48 0Z"/><path d="M24 24c0-5 5-5 5-10M34 24c0-5 5-5 5-10"/><path d="M6 34h52"/>',
  brain: '<path d="M26 10a12 12 0 0 0-12 12v2a10 10 0 0 0 0 18 10 10 0 0 0 18 6V10"/><path d="M38 10a12 12 0 0 1 12 12v2a10 10 0 0 1 0 18 10 10 0 0 1-18 6V10"/><path d="M20 30h6M38 30h6M22 40h4M38 40h4"/>',
  music: '<path d="M24 46V14l28-6v32"/><circle cx="18" cy="46" r="6"/><circle cx="46" cy="40" r="6"/><path d="M24 22l28-6"/>',
  chat: '<path d="M8 14h32a4 4 0 0 1 4 4v14a4 4 0 0 1-4 4H22l-8 7v-7H8a4 4 0 0 1-4-4V18a4 4 0 0 1 4-4Z"/><path d="M48 24h8a4 4 0 0 1 4 4v14a4 4 0 0 1-4 4h-4v7l-8-7H32a4 4 0 0 1-4-4v-2"/><path d="M14 24h20M14 30h12"/>',
  cal: '<rect x="8" y="12" width="48" height="44" rx="6"/><path d="M8 24h48M20 6v12M44 6v12"/><path d="M18 34h8M30 34h8M42 34h4M18 44h8M30 44h8"/>',
  puzzle: '<path d="M12 12h18v10a5 5 0 1 0 0 10v10H12V32a5 5 0 1 1 0-10Z"/><path d="M34 12h18v30H42a5 5 0 1 0-10 0h0"/><path d="M12 46h18v6H12zM34 46h18v6H34z"/>',
  bike: '<circle cx="16" cy="46" r="10"/><circle cx="50" cy="46" r="10"/><path d="M16 46l10-18h16l8 18M26 28l-4-8h-6M42 28l-6 18"/>',
  cake: '<rect x="10" y="30" width="44" height="24" rx="4"/><path d="M10 40q5 5 11 0t11 0 11 0 11 0"/><path d="M22 30v-8M32 30v-8M42 30v-8"/><path d="M22 18q-2-3 0-6 2 3 0 6M32 18q-2-3 0-6 2 3 0 6M42 18q-2-3 0-6 2 3 0 6"/>'
};
const svg64 = p => '<svg viewBox="0 0 64 64" aria-hidden="true">' + p + '</svg>';

/* 첫 화면 대표 이미지(AI로 만든 이미지 3장). 파일은 제작기 안에 들어 있고, zip에는 img 폴더로 함께 담겨요. */
const HERO_IMGS = {};
const HERO_PHOTO = [
  { file: 'hero-1.webp', pos: '50% 35%', alt: '직원과 함께 퍼즐을 맞추며 웃는 어르신들', cap: '퍼즐을 맞추며 생각을 깨우는 시간' },
  { file: 'hero-2.webp', pos: '50% 45%', alt: '노래하는 어르신과 박수 치며 함께 웃는 어르신들, 직원', cap: '노래하고 박수 치며 함께 웃는 시간' },
  { file: 'hero-3.webp', pos: '50% 45%', alt: '둥글게 앉아 라켓으로 풍선을 치며 웃는 어르신들과 직원', cap: '풍선을 치며 몸을 가볍게 깨우는 시간' },
  { file: 'hero-4.webp', pos: '50% 50%', alt: '칸칸이 밥·국·반찬을 담은 따뜻한 식판', cap: '따뜻하게 차려 내는 정성 담은 한 끼' }
];
function heroFiles(d) {
  if (d.heroStyle === 'illust') return [];
  return HERO_PHOTO.filter((p, i) => !String(d['heroImage' + (i + 1)] || '')).map(p => { const bin = atob(HERO_IMGS[p.file]), a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return { name: 'img/' + p.file, data: a }; });
}
function buildCalcHtml(D, d) {
  if (!D.showCalc) return '';
  const mealNote = ' (식재료비 '+esc(D.mealAsOf||'기준월 미입력')+' · 간식비 '+esc(D.snackAsOf||'기준월 미입력')+', 우리 센터 기준 자동 입력)';
  return `
    <div class="ltc-wrap rv" id="ltcCalcRoot">
      <div class="head" data-en="Copay Calculator" style="margin-bottom:28px">
        <h2>장기요양 <em>본인부담금 계산기</em> </h2>
        <p>어르신 등급과 이용 일수를 선택하면 <b>${esc(D.name)}</b>의 식재료비·간식비 기준에 맞춰 한 달 예상 비용을 바로 확인하실 수 있습니다.</p>
      </div>
      <div class="ltc-grid">
        <div class="ltc-left">
          <div class="ltc-card">
            <h3>1. 어르신 정보 선택 <small>${esc(d.feeYear)}년 ${CORE.isProposal(d) ? '의결안(확정 전) ' : ''}기준</small></h3>
            <div class="ltc-field">
              <div class="ltc-label"><span>장기요양 등급</span></div>
              <div class="ltc-chips c3" id="ltcGrade"></div>
            </div>
            <div class="ltc-field">
              <div class="ltc-label"><span>본인부담 구분</span></div>
              <div class="ltc-chips c2" id="ltcReduce"></div>
            </div>
          </div>

          <div class="ltc-card">
            <h3>2. 이용할 서비스·일수 선택</h3>
            <div class="ltc-tabs" role="tablist">
              <button type="button" class="ltc-tab" data-mode="0" aria-selected="true"><span>주야간보호</span></button>
              <button type="button" class="ltc-tab" data-mode="1" aria-selected="false"><span>방문요양</span></button>
              <button type="button" class="ltc-tab" data-mode="2" aria-selected="false"><span>요양원</span></button>
            </div>

            <!-- [탭 0] 주야간보호 -->
            <div class="ltc-mode-pane" data-pane="0">
              <div class="ltc-field">
                <div class="ltc-label"><span>하루 이용 시간</span><small>(보통 8~10시간)</small></div>
                <div class="ltc-chips c3" id="ltcBand"></div>
              </div>
              <div class="ltc-field">
                <div class="ltc-step-row">
                  <div class="ltc-step-info"><b>이용일수</b><small>보통 20~25일</small></div>
                  <div class="ltc-stepper">
                    <button type="button" data-step-target="day.wk" data-step="-1" aria-label="1일 줄이기">−</button>
                    <input type="text" id="ltcDayWk" value="22" inputmode="numeric" aria-label="평일 토요일 이용일수">
                    <span>일</span>
                    <button type="button" data-step-target="day.wk" data-step="1" aria-label="1일 늘리기">+</button>
                  </div>
                </div>
                <div class="ltc-step-row">
                  <div class="ltc-step-info"><b>공휴일 이용일수</b></div>
                  <div class="ltc-stepper">
                    <button type="button" data-step-target="day.hol" data-step="-1" aria-label="1일 줄이기">−</button>
                    <input type="text" id="ltcDayHol" value="0" inputmode="numeric" aria-label="공휴일 이용일수">
                    <span>일</span>
                    <button type="button" data-step-target="day.hol" data-step="1" aria-label="1일 늘리기">+</button>
                  </div>
                </div>
              </div>

              <div class="ltc-field">
                <div class="ltc-label"><span>식사·간식 (비급여)</span></div>
                <div class="ltc-chips c2" id="ltcMeal"></div>
                <div class="ltc-money-grid">
                  <div class="ltc-money">
                    <label for="ltcMealPrice">식재료비</label>
                    <div><input type="text" id="ltcMealPrice" inputmode="numeric"><span>원</span></div>
                  </div>
                  <div class="ltc-money">
                    <label for="ltcSnackPrice">간식비</label>
                    <div><input type="text" id="ltcSnackPrice" inputmode="numeric"><span>원</span></div>
                  </div>
                </div>
              </div>

              <div class="ltc-toggle-box">
                <div class="ltc-toggle-head" id="ltcWithVisitWrap">
                  <div>
                    <b>방문요양 함께 이용</b>
                  </div>
                  <button type="button" class="ltc-switch" id="ltcWithVisit" role="switch" aria-checked="false" aria-label="방문요양 함께 이용"></button>
                </div>
                <div class="ltc-subpanel" id="ltcVisitSubPanel" hidden>
                  <div class="ltc-label"><span>1회 방문요양 시간</span><small>3시간 30분 이상은 1·2등급만 가능</small></div>
                  <div class="ltc-chips c4" id="ltcVminSub"></div>
                  <div class="ltc-step-row" style="margin-top:10px">
                    <div class="ltc-step-info"><b>한 달 방문 횟수</b></div>
                    <div class="ltc-stepper">
                      <button type="button" data-step-target="day.visit.wk" data-step="-1">−</button>
                      <input type="text" id="ltcSubVisitWk" value="8" inputmode="numeric">
                      <span>회</span>
                      <button type="button" data-step-target="day.visit.wk" data-step="1">+</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- [탭 1] 방문요양 단독 비교 -->
            <div class="ltc-mode-pane" data-pane="1" hidden>
              <div class="ltc-field">
                <div class="ltc-label"><span>1회 방문 시간</span><small>3시간 30분 이상은 1·2등급만 가능</small></div>
                <div class="ltc-chips c4" id="ltcVminMain"></div>
              </div>
              <div class="ltc-field">
                <div class="ltc-step-row">
                  <div class="ltc-step-info"><b>이용일수</b><small>하루 1회 방문 기준</small></div>
                  <div class="ltc-stepper">
                    <button type="button" data-step-target="visit.wk" data-step="-1">−</button>
                    <input type="text" id="ltcVisitWk" value="22" inputmode="numeric">
                    <span>일</span>
                    <button type="button" data-step-target="visit.wk" data-step="1">+</button>
                  </div>
                </div>
                <div class="ltc-step-row">
                  <div class="ltc-step-info"><b>일요일 방문일수</b><small>1회 비용 30% 가산</small></div>
                  <div class="ltc-stepper">
                    <button type="button" data-step-target="visit.sun" data-step="-1">−</button>
                    <input type="text" id="ltcVisitSun" value="0" inputmode="numeric">
                    <span>일</span>
                    <button type="button" data-step-target="visit.sun" data-step="1">+</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- [탭 2] 요양원 비교 -->
            <div class="ltc-mode-pane" data-pane="2" hidden>
              <div class="ltc-field">
                <div class="ltc-label"><span>시설 종류</span><small>시설급여 본인부담률 일반 20%</small></div>
                <div class="ltc-chips c2" id="ltcFtype"></div>
              </div>
              <div class="ltc-field">
                <div class="ltc-step-row">
                  <div class="ltc-step-info"><b>한 달 입소 일수</b><small>보통 30일 기준 (하루 3끼 식비 포함)</small></div>
                  <div class="ltc-stepper">
                    <button type="button" data-step-target="fac.days" data-step="-1">−</button>
                    <input type="text" id="ltcFacDays" value="30" inputmode="numeric">
                    <span>일</span>
                    <button type="button" data-step-target="fac.days" data-step="1">+</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="ltc-card">
            <h3>3. 감경 대상별 예상 비용</h3>
            <div class="ltc-cmp-list" id="ltcReduceCmp"></div>
            <h3 style="margin-top:22px">4. 서비스별 비교</h3>
            <div class="ltc-cmp-list" id="ltcServiceCmp"></div>
          </div>
        </div>

        <div class="ltc-right ltc-result-col">
          <div class="ltc-hero">
            <div class="ltc-hero-top">
              <span class="ltc-hero-badge" id="ltcHeroBadge">주야간보호</span>
              <span class="ltc-hero-cond" id="ltcHeroCond"></span>
            </div>
            <div class="ltc-hero-label">본인 부담</div>
            <div class="ltc-hero-amount" id="ltcHeroAmt">0원</div>
            <div class="ltc-hero-parts" id="ltcHeroParts"></div>
            <div class="ltc-gauge" id="ltcGaugeBox">
              <div class="ltc-gauge-track"><div class="ltc-gauge-fill" id="ltcGaugeFill" style="width:0%"></div></div>
              <div class="ltc-gauge-txt"><span id="ltcGaugeUsed"></span><span id="ltcGaugeLim"></span></div>
            </div>
            <div class="ltc-tip" id="ltcHeroTip"></div>
          </div>

          <div class="ltc-card" style="margin-top:16px">
            <h3>상세 내역</h3>
            <ul class="ltc-ledger" id="ltcLedger"></ul>
            <div class="ltc-2027" id="ltc2027Box"></div>
            <div class="ltc-actions">
              <button type="button" class="btn line" id="ltcResetBtn">처음부터</button>
              <button type="button" class="btn gold" id="ltcShareBtn">링크 복사</button>
            </div>
            <p class="fee-law" style="margin-top:12px">
              ※ 위 결과는 ${esc(d.feeYear)}년 장기요양 급여비용 ${CORE.isProposal(d) ? '의결안(확정 전 금액)' : '고시'} 기준으로 산출한 <b>예상 금액</b>이며, 본인부담금은 법령에 따라 정해집니다(「노인장기요양보험법」 제35조에 따라 임의 감액 불가). 정확한 비용은 상담 시 안내해 드립니다.
            </p>
          </div>
        </div>
      </div>
    </div>`;
}

/* GEO 기준 04: 콘텐츠 적합성·답변 활용성 (AI Quick Facts 시맨틱 요약 박스) */
function buildQuickFactsHtml(D, d) {
  return `
    <aside id="org" class="geo-summary rv" aria-label="${esc(D.name)} 핵심 정보 요약">
      <header class="geo-summary-head">
        <h2 class="geo-summary-title">센터 안내</h2>
        <p class="geo-summary-name">${esc(D.name)}</p>
        <p class="geo-summary-meta">${esc(d.careType || '주·야간보호')}${D.capacity ? ' · 등록 정원 '+D.capacity+'명' : ''}</p>
      </header>
      ${D.geoQuickFacts ? `<div class="geo-summary-layout">
        <dl class="geo-dl">
          <div><dt>운영 시간</dt><dd>${esc(D.dayText)} ${esc(d.open)}–${esc(d.close)}<small>${esc(D.closedText)}${d.holidayNote ? ' · '+esc(d.holidayNote) : ''}</small></dd></div>

          <div><dt>식사 안내</dt><dd>${D.meals.length ? esc(D.mealsText)+' 제공' : '상담 시 안내'}${D.cookText ? '<small>'+esc(D.cookText)+'</small>' : ''}</dd></div>
          <div class="geo-location"><dt>센터 위치</dt><dd>${esc([d.sido,d.region].filter(Boolean).join(' '))}<small>${esc(d.street)}${d.dong ? ' ('+esc(d.dong)+')' : ''}</small><a href="contact.html">오시는 길 보기</a></dd></div>
        </dl>
      </div>` : ''}
      ${buildFacilitiesHtml(D,d)}
      <div class="geo-summary-footer" role="group" aria-label="기관 정보 확인">
        ${d.orgNo ? '<span>장기요양기관 기호 <b>'+esc(d.orgNo)+'</b></span>' : '<span>장기요양기관 안내</span>'}
        <a href="https://www.longtermcare.or.kr" target="_blank" rel="noopener">노인장기요양 기관정보확인 <span aria-hidden="true">↗</span><span class="institution-link-sr"> (새 창에서 열림)</span></a>
      </div>
    </aside>`;
}

function buildFacilitiesHtml(D,d) {
 if(d.showFacilities===false)return '';
 const titles=['생활시설','휴게시설',(d.facilityThirdTitle||'족욕시설').trim()||'족욕시설'];
 return `<section class="facility-overview facility-inline" id="space" aria-label="센터 시설 안내"><div class="facility-inline-heading"><h3>센터 시설 안내</h3></div><div class="facility-three">${titles.map((title,i)=>{
 const photos=[d['facilityPhoto'+(i+1)],d['facilityPhoto'+(i+1)+'_2'],d['facilityPhoto'+(i+1)+'_3']].filter(p=>/^(?:data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+|img\/[A-Za-z0-9._-]+\.(?:jpe?g|png|webp))$/.test(String(p||''))).slice(0,3);
 const picture=(photo,n)=>'<button type="button" class="facility-zoom facility-slide"'+(n?' hidden':'')+' data-gallery-title="'+esc(title)+'" aria-label="'+esc(title+' 사진 '+(n+1)+' 크게 보기')+'"><img class="facility-photo" src="'+photo+'" alt="'+esc(D.name+' '+title+' '+(n+1)+' — 실제 사진을 바탕으로 가공한 이미지')+'" loading="lazy" decoding="async"><span class="facility-zoom-hint' + (D.zoomStyle === 'circle' ? ' is-circle' : '') + '" aria-hidden="true">' + (D.zoomStyle === 'circle' ? '' : '크게 보기') + '</span></button>';
 const controls=photos.length>1?'<button type="button" class="facility-carousel-arrow facility-carousel-prev" data-facility-step="-1" aria-label="'+esc(title+' 이전 사진')+'">‹</button><button type="button" class="facility-carousel-arrow facility-carousel-next" data-facility-step="1" aria-label="'+esc(title+' 다음 사진')+'">›</button>':'';
 const media=photos.length?'<div class="facility-carousel" data-index="0" role="region" aria-roledescription="슬라이드" aria-label="'+esc(title+' 사진')+'">'+photos.map(picture).join('')+controls+'</div>':'<div class="facility-photo-empty"><span>시설 사진 준비 중</span></div>';
 return '<article class="facility-card facility-photo-card rv">'+media+'<h4>'+esc(title)+'</h4></article>';
 }).join('')}</div></section>`;
}


function buildInternalNavHtml(D, curPage) {
  const cards = [
    { file: 'index.html', tag: '01 · HOME', t: '홈 (메인 요약)', d: D.short + ' 핵심 강점과 전체 안내 한눈에 보기' },
    { file: 'about.html', tag: '02 · ABOUT & SPACE', t: '센터소개 · 시설안내', d: '인사말, 등록 정원, 생활실·목욕실·족욕 공간과 하루 일과' },
    { file: 'program.html', tag: '03 · PROGRAM & MEALS', t: '프로그램 · 식단표', d: '인지·신체·음악 활동 및 네이버 블로그 식단표·활동사진' },
    { file: 'guide.html', tag: '04 · COST CALCULATOR', t: '비용 · 본인부담 계산기', d: D.d.feeYear+'년 등급별 수가표와 한 달 예상 비용 자동 계산기' },
    { file: 'contact.html', tag: '05 · LOCATION', t: '오시는 길 · 상담문의', d: '도로명 주소, 대중교통·주차 안내 및 전화·방문 상담 절차' }
  ].filter(c => c.file !== curPage);
  return `
<nav class="geo-next-nav" aria-label="관련 페이지 안내">
  <div class="wrap">
    <div class="head" data-en="Explore More" style="margin-bottom:14px">
      <h2 style="font-size:clamp(26.4px,3vw,36px)">더 자세한 <em>센터 정보</em>를 확인해 보세요</h2>
    </div>
    <div class="geo-next-grid">
      ${cards.map(c => `<a class="geo-next-card" href="${c.file}"><div><small>${c.tag}</small><b>${esc(c.t)}</b></div><span>${esc(c.d)} →</span></a>`).join('\n      ')}
    </div>
  </div>
</nav>`;
}

function buildCenterLogo(d,T) {
 const photo=String(d.logoImage||'');
 if(/^(?:data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+|img\/[A-Za-z0-9._-]+\.(?:jpe?g|png|webp))$/.test(photo))return '<img class="center-logo-image" src="'+photo+'" alt="" aria-hidden="true" width="84" height="76" decoding="async">';
 return `<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="7" fill="${T.accent}"/><g stroke="${T.accent}" stroke-width="2.2" stroke-linecap="round"><path d="M16 2v4M16 26v4M2 16h4M26 16h4M6 6l2.8 2.8M23.2 23.2 26 26M6 26l2.8-2.8M23.2 8.8 26 6"/></g></svg>`;
}

function buildPage(d, opt) {
  d = normalizeCosts(d);
  opt = opt || {};
  const page = opt.page || 'index.html';
  const D = derive(d), T = D.theme;
  const css = ":root {\n    /* 대교 뉴이프 느낌의 차분한 4색 + 흰 바탕 */\n    --gold: #b08550; --gold-soft: #f5ede2; --slate: #66777e; --taupe: #8e8278; --char: #2a2a2a;\n    --teal: #1f5a58; --ink: #2a2a2a; --ink-soft: #5f5f5f; --ink-faint: #8c8c8c;\n    --bg: #ffffff; --soft: #f6f4f1; --line: #e6e2dc;\n  }\n\n  * { box-sizing: border-box; }\n  html { scroll-behavior: smooth; }\n  body {\n    margin: 0; background: var(--bg); color: var(--ink);\n    font-family: \"Noto Sans KR\", system-ui, sans-serif; font-size: 21.6px; line-height: 1.8;\n    word-break: keep-all; -webkit-font-smoothing: antialiased;\n  }\n  h1, h2, h3 { margin: 0; line-height: 1.4; }\n  p { margin: 0; }\n  a { color: inherit; }\n  img { max-width: 100%; }\n  h1, h2, h3, .quote { text-wrap: balance; }\n  p { text-wrap: pretty; }\n  .nw { white-space: nowrap; }\n  .wrap { max-width: 1240px; margin: 0 auto; padding: 0 24px; }\n  section { padding: 110px 0; scroll-margin-top: 100px; }\n  section.soft { background: var(--soft); }\n\n  /* 제목: 위에 짧은 굵은 선 + 굵은 제목 */\n  .head { max-width: 860px; margin-bottom: 50px; }\n  .head::before { content: \"\"; display: block; width: 72px; height: 6px; background: var(--slate); margin-bottom: 26px; }\n  .head h2 { font-size: clamp(33.6px, 4.32vw, 50.4px); font-weight: 800; letter-spacing: -1.2px; margin-bottom: 20px; }\n  .head h2 em { font-style: normal; color: var(--teal); }\n  .head p { color: var(--ink-soft); font-size: 22.8px; }\n  .head p b { color: var(--ink); }\n  .note { font-size: 18px; color: var(--ink-faint); margin-top: 22px; }\n\n  .btn {\n    display: inline-flex; align-items: center; justify-content: center; gap: 8px; text-decoration: none; cursor: pointer;\n    font: inherit; font-weight: 700; font-size: 20.4px; padding: 15px 28px; border-radius: 6px; border: 1px solid var(--char);\n  }\n  .btn.solid { background: var(--char); color: #fff; }\n  .btn.gold { background: var(--gold); color: #fff; border-color: var(--gold); }\n  .btn.line { background: #fff; color: var(--char); }\n\n  /* 스크롤하면 나타나기 */\n  .js .rv { opacity: 0; transform: translateY(24px); transition: opacity .8s ease, transform .8s ease; }\n  .js .rv.in { opacity: 1; transform: none; }\n  @media (prefers-reduced-motion: reduce) { .js .rv { opacity: 1; transform: none; transition: none; } html { scroll-behavior: auto; } }\n\n  /* 상단바: 흰색, 아래 얇은 선 */\n  .top { position: sticky; top: 0; z-index: 40; background: #fff; border-bottom: 1px solid var(--line); transition: box-shadow .3s; }\n  .top.shadow { box-shadow: 0 6px 20px rgba(0, 0, 0, .07); }\n  .top .wrap { display: flex; align-items: center; justify-content: space-between; gap: 24px; height: 104px; max-width: 1440px; }\n  .logo { display: flex; align-items: center; gap: 14px; text-decoration: none; white-space: nowrap; }\n  .logo svg { width: 64px; height: 64px; flex: none; }\n  .logo small { display: block; font-size: 16.8px; font-weight: 500; letter-spacing: 2px; color: var(--gold); line-height: 1.2; }\n  .logo b { display: block; font-size: 40.8px; font-weight: 800; letter-spacing: -1.2px; line-height: 1.2; color: var(--char); }\n  .top nav { display: flex; gap: 40px; margin-left: auto; font-size: 22.8px; font-weight: 700; }\n  .top nav a { text-decoration: none; white-space: nowrap; color: var(--ink); }\n  .top nav a:hover { color: var(--gold); }\n  .pill { text-decoration: none; white-space: nowrap; font-size: 25.2px; font-weight: 700; padding: 12px 24px; border-radius: 999px; background: var(--gold); color: #fff; margin-left: 12px; }\n  .menu-btn { display: none; font: inherit; font-size: 19.2px; font-weight: 700; background: #fff; border: 1px solid var(--char); color: var(--char); border-radius: 6px; padding: 8px 14px; cursor: pointer; }\n  @media (max-width: 1440px) { .top nav { gap: 28px; font-size: 21.6px; } .logo svg { width: 56px; height: 56px; } .logo b { font-size: 36px; } .pill { font-size: 22.8px; padding: 11px 20px; } }\n  @media (max-width: 1240px) { .top nav { gap: 20px; font-size: 20.4px; } }\n  @media (max-width: 1100px) {\n    .top .wrap { height: 84px; }\n    .top nav {\n      display: none; position: absolute; top: 100%; left: 0; right: 0; flex-direction: column; gap: 0; font-size: 21.6px;\n      background: #fff; border-top: 1px solid var(--line); box-shadow: 0 12px 24px rgba(0, 0, 0, .08);\n    }\n    .top nav a { padding: 16px 24px; border-bottom: 1px solid var(--line); }\n    .top.open nav { display: flex; }\n    .menu-btn { display: inline-block; }\n    .top .pill { display: none; }\n  }\n\n  /* 첫 화면: 글 + 가운데 큰 소개 영상 */\n  .hero { padding: 80px 0 110px; background: linear-gradient(180deg, var(--gold-soft) 0, var(--gold-soft) 62%, #fff 62%); }\n  .hero-text { text-align: center; max-width: 900px; margin: 0 auto 50px; }\n  .hero-text small { display: inline-block; font-size: 19.2px; font-weight: 700; letter-spacing: 3px; color: var(--gold); margin-bottom: 18px; }\n  .hero h1 { font-size: clamp(36px, 5.52vw, 64.8px); font-weight: 800; letter-spacing: -1.6px; margin-bottom: 20px; }\n  .hero h1 em { font-style: normal; color: var(--teal); }\n  .hero .lead { color: var(--ink-soft); font-size: 22.8px; }\n\n  /* 첫 화면 그림 슬라이드 (img 폴더의 hero-1~3.svg) */\n  .slider { position: relative; max-width: 1100px; margin: 0 auto; aspect-ratio: 16 / 9; overflow: hidden; box-shadow: 0 24px 60px rgba(60, 40, 10, .18); touch-action: pan-y; }\n  .slide {\n    position: absolute; inset: 0; margin: 0; opacity: 0; visibility: hidden; transition: opacity .8s ease, visibility .8s;\n    background: linear-gradient(150deg, #efe5d6, #d9c8ad);\n  }\n  .slide.on { opacity: 1; visibility: visible; }\n  .slide::before {\n    content: \"\"; position: absolute; left: 50%; top: 42%; width: 90px; height: 90px; transform: translate(-50%, -50%); opacity: .55;\n    background: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' fill='none' stroke='%23fff' stroke-width='1.4' stroke-linecap='round'%3E%3Ccircle cx='16' cy='16' r='6.5'/%3E%3Cpath d='M16 3v4M16 25v4M3 16h4M25 16h4M7 7l2.8 2.8M22.2 22.2 25 25M7 25l2.8-2.8M22.2 9.8 25 7'/%3E%3C/svg%3E\") center / contain no-repeat;\n  }\n  .slide img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 1; }\n  .slide figcaption {\n    position: absolute; left: 0; right: 0; bottom: 0; z-index: 2; padding: 80px 24px 54px; text-align: center; color: #fff;\n    font-size: clamp(21.6px, 2.88vw, 33.6px); font-weight: 500; letter-spacing: -.5px; text-shadow: 0 2px 10px rgba(0, 0, 0, .35);\n    background: linear-gradient(transparent, rgba(20, 16, 10, .5));\n  }\n  /* 그림 슬라이드: 글자를 진하게, 배경 그림자는 연하게 */\n  .slide img[src$=\".svg\"] ~ figcaption { color: var(--char); font-weight: 700; text-shadow: none; background: linear-gradient(transparent, rgba(255, 255, 255, .85) 60%); }\n  .slider:has(.slide.on img[src$=\".svg\"]) .s-arrow { border-color: rgba(42, 42, 42, .35); color: var(--char); background: rgba(255, 255, 255, .6); }\n  .slider:has(.slide.on img[src$=\".svg\"]) .s-dots button { border-color: var(--char); }\n  .slider:has(.slide.on img[src$=\".svg\"]) .s-dots button[aria-current=\"true\"] { background: var(--char); }\n  .s-arrow {\n    position: absolute; top: 50%; z-index: 3; width: 64px; height: 64px; margin-top: -32px; border-radius: 50%; cursor: pointer;\n    background: rgba(255, 255, 255, .12); border: 1.5px solid rgba(255, 255, 255, .85); color: #fff; font-size: 33.6px; line-height: 1;\n    display: grid; place-items: center; transition: background .3s;\n  }\n  .s-arrow:hover { background: rgba(255, 255, 255, .3); }\n  .s-prev { left: 22px; } .s-next { right: 22px; }\n  .s-dots { position: absolute; left: 0; right: 0; bottom: 20px; z-index: 3; display: flex; justify-content: center; gap: 12px; }\n  .s-dots button { width: 13px; height: 13px; padding: 0; border-radius: 50%; border: 1.5px solid #fff; background: transparent; cursor: pointer; }\n  .s-dots button[aria-current=\"true\"] { background: #fff; }\n  @media (max-width: 720px) { .s-arrow { width: 44px; height: 44px; margin-top: -22px; font-size: 24px; } .s-prev { left: 10px; } .s-next { right: 10px; } .slide figcaption { padding: 60px 56px 44px; } }\n\n  /* 주야간보호센터란? + 색깔 카드 4개 */\n  .tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }\n  .tile { position: relative; min-height: 270px; padding: 36px 32px; color: #fff; display: flex; flex-direction: column; justify-content: space-between; }\n  .tile.t1, .tile.t1 h3, .tile.t1 p, .tile.t1 svg { color:#fff !important; } .tile h3 { font-size: clamp(26.4px, 2.64vw, 33.6px); font-weight: 800; letter-spacing: -.8px; line-height: 1.35; }\n  .tile p { font-size: 19.2px; opacity: .92; margin-top: 10px; }\n  .tile svg { width: 84px; height: 84px; align-self: flex-end; fill: none; stroke: #fff; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; margin-top: 20px; }\n  .t1 { background: var(--gold); color:#fff; } .t2 { background: var(--slate); } .t3 { background: var(--taupe); } .t4 { background: var(--char); }\n  @media (max-width: 1000px) { .tiles { grid-template-columns: 1fr 1fr; } }\n  @media (max-width: 560px) { .tile { min-height: 0; } }   /* .tiles 1열은 아래쪽(.tiles 모바일 규칙)에 한 번만 둠 */\n\n  /* 한눈에 보는 숫자 */\n  .stats { display: grid; grid-template-columns: repeat(4, 1fr); margin-top: 60px; border-top: 2px solid var(--char); border-bottom: 1px solid var(--line); }\n  .stats div { padding: 34px 12px 30px; text-align: center; }\n  .stats div + div { border-left: 1px solid var(--line); }\n  .stats strong { display: block; font-size: clamp(48px, 6vw, 72px); font-weight: 800; letter-spacing: -2px; line-height: 1.1; color: var(--gold); }\n  .stats strong small { font-size: .42em; letter-spacing: 0; margin-left: 4px; color: var(--ink); }\n  .stats span { display: block; margin-top: 8px; font-size: 20.4px; font-weight: 500; color: var(--ink-soft); }\n  @media (max-width: 760px) { .stats div:nth-child(3) { border-left: 0; } }   /* .stats 2열·윗줄 규칙은 아래쪽 한 곳에만 둠 */\n\n  /* 시설 안내: 아이콘 카드 */\n  .facil { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }\n  .fc { background: #fff; border: 1px solid var(--line); border-top: 5px solid; padding: 30px 28px 32px; }\n  .fc.t1 { border-top-color: var(--gold); } .fc.t2 { border-top-color: var(--slate); } .fc.t3 { border-top-color: var(--taupe); } .fc.t4 { border-top-color: var(--char); }\n  .fc svg { width: 58px; height: 58px; fill: none; stroke: var(--gold); stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; margin-bottom: 18px; }\n  .fc.t2 svg { stroke: var(--slate); } .fc.t3 svg { stroke: var(--taupe); } .fc.t4 svg { stroke: var(--char); }\n  .fc h3 { font-size: 25.2px; font-weight: 800; letter-spacing: -.5px; margin-bottom: 8px; }\n  .fc p { color: var(--ink-soft); font-size: 19.8px; }\n  @media (max-width: 860px) { .facil { grid-template-columns: 1fr 1fr; } }\n  @media (max-width: 520px) { .facil { grid-template-columns: 1fr; } .fc { display: grid; grid-template-columns: 52px 1fr; column-gap: 16px; padding: 22px 20px; } .fc svg { width: 48px; height: 48px; margin: 0; grid-row: span 2; } }\n  .checks { list-style: none; padding: 0; margin: 28px 0 0; display: flex; flex-wrap: wrap; gap: 10px; }\n  .checks li { border: 1px solid var(--line); padding: 7px 16px; font-size: 19.2px; color: var(--ink-soft); background: #fff; }\n  .checks li::before { content: \" \"; color: var(--gold); font-weight: 800; }\n\n  /* 이달의 프로그램표·식단표 */\n  .monthly { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }\n  .month-card { border: 1px solid var(--line); background: #fff; }\n  .month-card .m-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 22px 26px; color: #fff; }\n  .month-card .m-head h3 { font-size: 26.4px; font-weight: 800; letter-spacing: -.5px; white-space: nowrap; }\n  .month-card .m-head small { font-size: 16.8px; font-weight: 700; opacity: .85; }\n  .m-body { padding: 34px 26px 36px; text-align: center; color: var(--ink-soft); }\n  .m-body svg { width: 54px; height: 54px; fill: none; stroke: var(--gold); stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; margin-bottom: 14px; }\n  .m-body p { font-size: 20.4px; }\n  .m-body .btn { margin-top: 20px; }\n  @media (max-width: 520px) { .m-body p br { display: none; } .m-body .btn { width: 100%; } }\n  @media (max-width: 860px) { .monthly { grid-template-columns: 1fr; } }\n\n  /* 보호자 후기 */\n  .reviews { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }\n  .review { background: #fff; border: 1px solid var(--line); padding: 34px 30px; position: relative; }\n  .review::before { content: \"“\"; position: absolute; top: 4px; left: 22px; font-size: 84px; font-weight: 800; color: var(--gold); line-height: 1; opacity: .35; }\n  .review p { color: var(--ink); font-size: 21px; margin-top: 18px; }\n  .review span { display: block; margin-top: 16px; font-size: 18px; color: var(--ink-faint); }\n  @media (max-width: 860px) { .reviews { grid-template-columns: 1fr; } }\n\n  /* 장기요양기관 정보 */\n  .org { display: grid; grid-template-columns: 300px 1fr; gap: 20px 50px; margin-top: 50px; padding: 40px; background: var(--soft); border-left: 6px solid var(--gold); }\n  .org-head h3 { font-size: 28.8px; font-weight: 800; letter-spacing: -.6px; margin-bottom: 8px; }\n  .org-head p { color: var(--ink-soft); font-size: 19.8px; }\n  .org .rows { display: grid; grid-template-columns: 1fr 1fr; column-gap: 40px; }\n  .org .rows li { grid-template-columns: 150px 1fr; }\n  .org .btn { grid-column: 2; justify-self: start; }\n  .org .seat { font-style: normal; font-weight: 800; color: var(--gold); }\n  .org .rows small { color: var(--ink-faint); font-size: 16.8px; margin-left: 4px; }\n  .staff { grid-column: 2; }\n  .staff h4 { font-size: 20.4px; font-weight: 800; margin-bottom: 12px; }\n  .staff h4 small { color: var(--ink-faint); font-weight: 500; margin-left: 6px; }\n  .staff ul { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; }\n  .staff li { background: #fff; border: 1px solid var(--line); padding: 8px 14px; font-size: 19.2px; color: var(--ink-soft); }\n  .staff li b { color: var(--gold); font-size: 21.6px; margin-right: 6px; }\n  .todo { color: var(--ink-faint) !important; font-style: italic; }\n  @media (max-width: 960px) { .org { grid-template-columns: 1fr; padding: 30px 24px; } .org .btn, .staff { grid-column: auto; } }\n  @media (max-width: 640px) { .org .rows { grid-template-columns: 1fr; } .org .rows li { grid-template-columns: 1fr; gap: 2px; } }\n\n  /* 인사말 */\n  .greet { display: grid; grid-template-columns: 1fr 1.2fr; gap: 60px; align-items: center; }\n  .quote { font-size: clamp(28.8px, 3.36vw, 40.8px); font-weight: 700; letter-spacing: -1px; line-height: 1.55; color: var(--teal); }\n  .greet .txt p + p { margin-top: 14px; }\n  .intro-video { margin-top: 56px; }\n  .intro-video[hidden] { display: none; }\n  .intro-video h3 { font-size: clamp(25.2px, 2.76vw, 32.4px); font-weight: 800; letter-spacing: -.6px; margin-bottom: 18px; text-align: center; }\n  .intro-video h3 em { font-style: normal; color: var(--gold); }\n  .iv-frame { max-width: 900px; margin: 0 auto; aspect-ratio: 16 / 9; background: var(--char); box-shadow: 0 20px 50px rgba(60, 40, 10, .16); }\n  .iv-frame iframe { width: 100%; height: 100%; border: 0; display: block; }\n  .iv-poster { position: relative; display: block; width: 100%; height: 100%; padding: 0; border: 0; cursor: pointer; background: var(--char); overflow: hidden; }\n  .iv-poster img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .6s ease; }\n  .iv-poster:hover img { transform: scale(1.03); }\n  .iv-poster::after { content: \"\"; position: absolute; left: 50%; top: 50%; width: 88px; height: 88px; margin: -44px 0 0 -44px; border-radius: 50%; background: color-mix(in srgb, var(--gold) 94%, transparent) url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M9 6.5v11l9-5.5z' fill='%23fff'/%3E%3C/svg%3E\") center / 46px no-repeat; box-shadow: 0 8px 24px rgba(0, 0, 0, .3); transition: transform .2s; }\n  .iv-poster:hover::after { transform: scale(1.08); }\n  @media (max-width: 720px) { .iv-poster::after { width: 64px; height: 64px; margin: -32px 0 0 -32px; background-size: 34px; } }\n  .iv-src { text-align: center; margin-top: 10px; font-size: 16.8px; color: var(--ink-faint); }\n  .asof { margin-left: 6px; font-size: 16.8px; color: var(--ink-faint); white-space: nowrap; }\n  .greet-label { display: block; font-size: 18px; font-weight: 700; color: var(--gold); letter-spacing: 1px; margin-bottom: 12px; }\n  .greet .txt p { color: var(--ink-soft); }\n  @media (max-width: 900px) { .greet { grid-template-columns: 1fr; gap: 30px; } }\n\n  /* 프로그램: 색깔 이름표 + 설명 */\n  .programs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }\n  .prog { background: #fff; border: 1px solid var(--line); }\n  .prog .tag { padding: 34px 30px; color: #fff; }\n  .prog .tag small { display: block; font-size: 18px; font-weight: 700; letter-spacing: 1px; opacity: .85; }\n  .prog .tag h3 { font-size: 31.2px; font-weight: 800; letter-spacing: -.8px; margin-top: 4px; }\n  .prog > p { padding: 26px 30px 32px; color: var(--ink-soft); font-size: 20.4px; }\n  @media (max-width: 900px) { .programs { grid-template-columns: 1fr; } }\n\n  /* 하루 일과 */\n  .day { list-style: none; margin: 0; padding: 0; border-top: 2px solid var(--char); }\n  .day li { display: grid; grid-template-columns: 80px 220px 1fr; gap: 24px; align-items: baseline; padding: 26px 0; border-bottom: 1px solid var(--line); }\n  .day .n { font-size: 36px; font-weight: 800; color: var(--gold); }\n  .day h3 { font-size: 25.2px; font-weight: 700; letter-spacing: -.5px; }\n  .day p { color: var(--ink-soft); font-size: 20.4px; }\n  @media (max-width: 760px) { .day li { grid-template-columns: 50px 1fr; gap: 4px 14px; } .day li p { grid-column: 2; } .day .n { font-size: 28.8px; } }\n\n  /* 이용 안내 */\n  .starts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }\n  .start { display: block; text-decoration: none; background: #fff; border: 1px solid var(--line); padding: 32px 28px; border-top: 4px solid var(--gold); transition: box-shadow .3s; }\n  .start:nth-child(2) { border-top-color: var(--slate); } .start:nth-child(3) { border-top-color: var(--taupe); }\n  .start:hover { box-shadow: 0 10px 30px rgba(0, 0, 0, .08); }\n  .start small { color: var(--ink-faint); font-weight: 700; font-size: 16.8px; }\n  .start h3 { font-size: 25.2px; margin: 8px 0; letter-spacing: -.5px; }\n  .start p { color: var(--ink-soft); font-size: 19.8px; }\n  @media (max-width: 860px) { .starts { grid-template-columns: 1fr; } }\n  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }\n  .box { background: #fff; border: 1px solid var(--line); padding: 34px; }\n  .box h3 { font-size: 26.4px; margin-bottom: 16px; letter-spacing: -.5px; }\n  .rows { list-style: none; margin: 0; padding: 0; }\n  .rows li { display: grid; grid-template-columns: 130px 1fr; gap: 12px; padding: 14px 0; border-top: 1px solid var(--line); font-size: 20.4px; }\n  .rows li span { color: var(--ink-soft); }\n  .box > p { color: var(--ink-soft); font-size: 20.4px; margin-bottom: 14px; }\n  .box .btn { margin-top: 22px; }\n  @media (max-width: 860px) { .two { grid-template-columns: 1fr; } }\n  .fee { margin-top: 16px; }\n  .fee h3 small { font-size: 16.8px; font-weight: 500; color: var(--ink-faint); margin-left: 8px; letter-spacing: 0; }\n  .fee-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }\n  .fee table { width: 100%; min-width: 680px; border-collapse: collapse; font-size: 19.2px; text-align: center; }\n  .fee th, .fee td { padding: 13px 10px; border-top: 1px solid var(--line); white-space: nowrap; }\n  .fee thead th { background: var(--char); color: #fff; font-weight: 700; border-top: 0; }\n  .fee tbody th { text-align: left; font-weight: 700; color: var(--ink); }\n  .fee td { color: var(--ink-soft); }\n  .fee .limit th, .fee .limit td { background: var(--gold-soft); color: var(--ink); font-weight: 700; }\n  .fee-note { margin-top: 16px; color: var(--ink-soft); font-size: 19.2px; line-height: 1.8; }\n  .fee-note b { color: var(--gold); }\n  .fee-more { margin-top: 22px; border: 1px solid var(--line); background: var(--soft); }\n  .fee-more summary { cursor: pointer; padding: 16px 20px; font-size: 20.4px; font-weight: 700; list-style: none; }\n  .fee-more summary::-webkit-details-marker { display: none; }\n  .fee-more summary::after { content: \"＋\"; float: right; color: var(--gold); }\n  .fee-more[open] summary::after { content: \"－\"; }\n  .fee-more-body { padding: 0 20px 20px; }\n  .fee .cut { min-width: 0; text-align: left; background: #fff; }\n  .fee .cut th, .fee .cut td { white-space: normal; }\n  .fee .cut td:last-child { text-align: center; white-space: nowrap; }\n  .fee .cut td b { color: var(--gold); font-size: 21.6px; }\n  .fee-list { margin: 16px 0 0; padding-left: 20px; color: var(--ink-soft); font-size: 19.2px; line-height: 1.8; }\n  .fee-list b { color: var(--ink); }\n  .fee-src { margin-top: 12px; font-size: 16.8px; color: var(--ink-faint); }\n  @media (max-width: 560px) {\n    .fee-more summary { padding: 14px 16px; font-size: 19.2px; }\n    .fee-more-body { padding: 0 12px 16px; }\n    .fee .cut { font-size: 17.4px; }\n    .fee .cut th, .fee .cut td { padding: 10px 6px; overflow-wrap: anywhere; word-break: break-all; }\n    .fee .cut td b { font-size: 19.2px; }\n  }\n  @media (max-width: 760px) { .fee-scroll::before { content: \"← 표를 옆으로 밀어서 보세요 →\"; display: block; font-size: 16.8px; color: var(--ink-faint); margin-bottom: 8px; position: sticky; left: 0; } }\n\n  /* 센터 소식(블로그 안내) */\n  .blog { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }\n  .bc { display: flex; flex-direction: column; padding: 30px 26px; color: #fff; min-height: 240px; transition: transform .25s, box-shadow .25s; }\n  .bc:hover { transform: translateY(-4px); box-shadow: 0 16px 30px rgba(40, 30, 20, .18); }\n  .bc svg { width: 56px; height: 56px; fill: none; stroke: #fff; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; margin-bottom: auto; }\n  .blog .bc { color:#fff !important; text-decoration:none; min-height:190px !important; } .blog .bc h3 { color:#fff !important; text-decoration:none; } .bc h3 { font-size: 26.4px; font-weight: 800; letter-spacing: -.5px; margin-top: 26px; }\n  .bc p { font-size: 19.2px; opacity: .92; margin-top: 4px; }\n  .bc span { margin-top: 14px; font-size: 18px; font-weight: 700; opacity: .9; }\n  .blog-cta { text-align: center; margin-top: 30px; }\n  @media (max-width: 1000px) { .blog { grid-template-columns: 1fr 1fr; } }\n  @media (max-width: 520px) { .bc { min-height: 0; padding: 22px 18px; } .bc svg { width: 42px; height: 42px; } .blog .bc { color:#fff !important; text-decoration:none; min-height:190px !important; } .blog .bc h3 { color:#fff !important; text-decoration:none; } .bc h3 { font-size: 22.8px; margin-top: 16px; } .blog-cta .btn { width: 100%; } }\n\n  /* 상담 절차: 먹색 띠 */\n  .consult { background: var(--char); color: #fff; }\n  .consult .head::before { background: var(--gold); }\n  .consult .head p { color: rgba(255, 255, 255, .72); }\n  .steps { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }\n  .steps li { border: 1px solid rgba(255, 255, 255, .18); padding: 34px 30px; }\n  .steps .n { display: block; font-size: 43.2px; font-weight: 800; color: var(--gold); line-height: 1; margin-bottom: 16px; }\n  .steps h3 { font-size: 25.2px; margin-bottom: 8px; }\n  .steps p { color: rgba(255, 255, 255, .72); font-size: 19.8px; }\n  .consult .cta { margin-top: 44px; display: flex; flex-wrap: wrap; align-items: center; gap: 16px 24px; }\n  .consult .cta .btn { font-size: 26.4px; }\n  .consult .cta p { color: rgba(255, 255, 255, .72); }\n  @media (max-width: 860px) { .steps { grid-template-columns: 1fr; } }\n\n  /* 자주 묻는 질문 */\n  .faq { border-top: 2px solid var(--char); }\n  .faq details { border-bottom: 1px solid var(--line); }\n  .faq summary { cursor: pointer; list-style: none; padding: 24px 44px 24px 0; font-weight: 700; font-size: 22.8px; position: relative; }\n  .faq summary::-webkit-details-marker { display: none; }\n  .faq summary::before { content: \"Q\"; display: inline-grid; place-items: center; width: 34px; height: 34px; margin-right: 14px; background: var(--gold); color: #fff; font-size: 19.2px; font-weight: 800; }\n  .faq summary::after { content: \"+\"; position: absolute; right: 6px; top: 20px; font-size: 33.6px; font-weight: 300; color: var(--ink-faint); }\n  .faq details[open] summary::after { content: \"−\"; }\n  .faq details p { color: var(--ink-soft); padding: 0 0 26px 48px; font-size: 20.4px; }\n\n  /* 오시는 길 */\n  .visit { display: grid; grid-template-columns: 1.2fr 1fr; gap: 16px; }\n  .visit .addr { font-size: 27.6px; font-weight: 700; letter-spacing: -.5px; margin-bottom: 8px; color: var(--ink); }\n  .visit .btns { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 24px; }\n  .btn.map-naver { background: #03c75a; border-color: #03c75a; color: #fff; }\n  .btn.map-kakao { background: #fee500; border-color: #fee500; color: #3a1d1d; }\n  .btn.map-tmap { background: #3d5afe; border-color: #3d5afe; color: #fff; }\n  .visit .tel { font-size: 45.6px; font-weight: 800; letter-spacing: -.5px; color: var(--gold); text-decoration: none; }\n  @media (max-width: 860px) { .visit { grid-template-columns: 1fr; } }\n\n  footer { background: var(--char); color: rgba(255, 255, 255, .6); padding: 54px 0; font-size: 18px; }\n  footer .wrap { display: grid; gap: 6px; }\n  footer strong { color: #fff; font-size: 24px; margin-bottom: 6px; }\n\n  /* PC에서 전화 버튼을 누르면 번호를 복사하고 안내 */\n  .toast {\n    position: fixed; left: 50%; bottom: 32px; z-index: 60; transform: translate(-50%, 20px); opacity: 0; pointer-events: none;\n    background: var(--char); color: #fff; padding: 16px 26px; border-radius: 10px; text-align: center; font-size: 19.2px; line-height: 1.6;\n    box-shadow: 0 10px 30px rgba(0, 0, 0, .3); transition: opacity .3s, transform .3s; width: max-content; max-width: calc(100vw - 32px);\n  }\n  .toast b { display: block; font-size: 31.2px; letter-spacing: .5px; color: #e8cfa6; }\n  .toast.show { opacity: 1; transform: translate(-50%, 0); }\n\n  /* 휴대폰 화면 */\n  @media (max-width: 720px) {\n    body { font-size: 19.8px; }\n    section { padding: 72px 0; }\n    .wrap { padding: 0 18px; }\n    .top .wrap { height: 80px; padding: 0 14px; }\n    .logo { gap: 10px; }\n    .logo svg { width: clamp(40px, 12vw, 50px); height: clamp(40px, 12vw, 50px); }\n    .logo b { font-size: clamp(24px, 7.44vw, 31.2px); letter-spacing: -.8px; }\n    .logo small { font-size: 13.2px; letter-spacing: 1.5px; }\n    .head { margin-bottom: 36px; }\n    .head::before { width: 54px; height: 5px; margin-bottom: 20px; }\n    .head p { font-size: 20.4px; }\n    .hero { padding: 54px 0 70px; background: linear-gradient(180deg, var(--gold-soft) 0, var(--gold-soft) 70%, #fff 70%); }\n    .hero-text { text-align: left; margin-bottom: 32px; }\n    .hero-text small { font-size: 15.6px; }\n    .hero .lead { font-size: 19.8px; }\n    .slider { margin: 0 -18px; aspect-ratio: 4 / 3; }\n    .tile { padding: 28px 24px; }\n    .tile svg { width: 64px; height: 64px; }\n    .facts b { font-size: 20.4px; }\n    .box { padding: 26px 20px; }\n    .rows li { grid-template-columns: 1fr; gap: 2px; }\n    .visit .addr { font-size: 24px; }\n    .visit .btns, .consult .cta { flex-direction: column; align-items: stretch; }\n    .visit .btns .btn, .consult .cta .btn, .box .btn { width: 100%; }\n    .faq summary { font-size: 20.4px; }\n    .faq details p { padding-left: 0; }\n    .pc-only { display: none; }\n    footer { padding-bottom: 90px; } /* 오른쪽 아래 넷리파이 표시에 마지막 줄이 가리지 않게 */\n  }\n\n  /* 글꼴 (2번 페이지와 같은 조합): 제목은 명조(Noto Serif KR), 본문은 고딕(Noto Sans KR), 영문·번호 포인트는 Cormorant Garamond 기울임 */\n  h1, h2, h3, h4, .logo b, .quote, .stats strong, .visit .tel, footer strong, .toast b { font-family: \"Noto Serif KR\", serif !important; font-weight: 700 !important; }\n  .logo small, .day .n, .steps .n { font-family: \"Cormorant Garamond\", Georgia, serif; font-style: italic; font-weight: 600; letter-spacing: .5px; }\n  .logo small { font-size: 19.2px; }\n  .day .n { font-size: 43.2px; }\n  .steps .n { font-size: 50.4px; }\n  @media (max-width: 720px) { .logo small { font-size: 15.6px; } .day .n { font-size: 33.6px; } }\n\n  /* ===== 4번 페이지 테마: 1·2·3번의 장점을 합침 =====\n     - 3번: 정보 구성(기관 정보·비용·감경·영상·블로그 안내)과 일러스트\n     - 2번: 짙은 분위기의 첫 화면, 명조 제목, 영문 기울임 라벨, 짙은 초록 상담 띠\n     - 1번: 따뜻한 크림 바탕과 둥근 버튼 */\n  :root {\n    --gold: #a98552; --gold-soft: #f4ede1; --slate: #3e5638; --taupe: #8a6d48; --char: #2f2b25;\n    --teal: #3e5638; --green: #3e5638; --green-deep: #2f4029; --sand: #c9b596; --light-gold: #e2c899;\n    --ink: #2f2b25; --ink-soft: #655e52; --ink-faint: #958c7d;\n    --bg: #fbf8f2; --soft: #f4ede1; --line: #e3d9c7;\n  }\n  .top { background: rgba(251, 248, 242, .95); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); }\n  .top nav, .top nav a { background: transparent; }\n  @media (max-width: 1100px) { .top nav { background: var(--bg); } }\n  .menu-btn { background: transparent; border-radius: 999px; }\n  .btn { border-radius: 999px; }\n  .btn.line { background: transparent; }\n\n  /* 섹션 제목 위 영문 기울임 라벨 (2번 방식) */\n  .head::before { width: 56px; height: 3px; background: var(--gold); }\n  .head[data-en]::before, .cost-eyebrow {\n    content: attr(data-en); width: auto; height: auto; background: none; margin-bottom: 6px;\n    font-family: \"Cormorant Garamond\", Georgia, serif; font-style: italic; font-weight: 500; font-size: 30px; letter-spacing: .3px; color: var(--gold);\n  }\n  .head h2 em { color: var(--gold); }\n  .consult .head[data-en]::before { color: var(--light-gold); }\n\n  /* 첫 화면: 짙고 따뜻한 분위기 (2번) + 그림 슬라이드 (3번) */\n  .hero {\n    color: #fff; padding: 96px 0 120px;\n    background:\n      radial-gradient(ellipse at 82% 6%, var(--hero-glow) 0, transparent 46%),\n      radial-gradient(ellipse at 6% 96%, var(--hero-shade) 0, transparent 52%),\n      linear-gradient(160deg, var(--hero-1) 0%, var(--hero-2) 55%, var(--hero-3) 100%);\n  }\n  .hero-text { margin-bottom: 56px; }\n  .en-tag { display: block; font-family: \"Cormorant Garamond\", Georgia, serif; font-style: italic; font-weight: 500; font-size: clamp(26.4px, 2.88vw, 36px); color: var(--light-gold); margin-bottom: 4px; }\n  .hero-text small { color: rgba(255, 255, 255, .7); letter-spacing: 2px; }\n  .hero h1 { color: #fff; text-shadow: 0 2px 18px rgba(0, 0, 0, .2); }\n  .hero h1 em { color: var(--light-gold); }\n  .hero .lead { color: rgba(255, 255, 255, .82); }\n  .hero-cta { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; margin-top: 30px; }\n  .hero-cta .btn.ghost { background: transparent; color: #fff; border-color: rgba(255, 255, 255, .7); }\n  .hero-cta .btn.ghost:hover { background: rgba(255, 255, 255, .12); }\n  .slider { border-radius: 20px; box-shadow: 0 30px 70px rgba(0, 0, 0, .35); }\n  @media (max-width: 720px) { .hero { padding: 56px 0 0; } .slider { border-radius: 0; } .hero-cta .btn { flex: 1 1 100%; } }\n  /* 슬라이드 점: 보이는 크기는 그대로, 손가락으로 누르는 범위만 넓게 */\n  .s-dots button { position: relative; }\n  .s-dots button::after { content: \"\"; position: absolute; inset: -14px -8px; }\n  /* 작은 휴대폰(갤럭시 360px 등): 제목 줄바꿈 허용 */\n  @media (max-width: 400px) {\n    .head h2 .nw, .hero h1 .nw { white-space: normal; }\n    .head h2 { font-size: 30px; }\n  }\n\n  /* 카드·타일: 둥글고 부드럽게 (1번) */\n  .tile, .bc, .fc, .box, .org, .month-card, .prog, .start, .fee-more, .stats { border-radius: 16px; }\n  .tile, .bc, .month-card, .prog { overflow: hidden; }\n  .org { border-left: 0; border-top: 5px solid var(--gold); }\n  .stats { border: 1px solid var(--line); background: #fff; }\n  /* 색 칸(타일·태그·카드 머리·블로그 카드)만 배경색을 칠하고, 시설 안내 카드(.fc)는 흰 바탕 + 위쪽 색 띠로 둔다 */\n  :is(.tile, .tag, .m-head, .bc).t1 { background: var(--gold); color:#fff; }\n  :is(.tile, .tag, .m-head, .bc).t2 { background: var(--green); }\n  :is(.tile, .tag, .m-head, .bc).t3 { background: var(--taupe); }\n  :is(.tile, .tag, .m-head, .bc).t4 { background: var(--green-deep); }\n  .fc { background: #fff; }\n  .fc.t4 { border-top-color: var(--green-deep); } .fc.t4 svg { stroke: var(--green-deep); }\n\n  /* 상담 띠·푸터: 짙은 초록 (2번) */\n  .consult { background: var(--green-deep); }\n  .steps .n { color: var(--light-gold); }\n  footer { background: var(--footer); }\n\n  /* ===== 제작기가 더한 부분 ===== */\n  /* 숫자 칸 개수에 맞추기 */\n  .stats { grid-template-columns: repeat(var(--n, 4), 1fr); }\n  @media (max-width: 760px) {\n    .stats { grid-template-columns: 1fr 1fr; }\n    .stats div { border-left: 0; border-top: 0; }\n    .stats div:nth-child(even) { border-left: 1px solid var(--line); }\n    .stats div:nth-child(n+3) { border-top: 1px solid var(--line); }\n  }\n\n  /* 샘플 표시 띠 */\n  .sample-bar { background: #fff3cd; color: #5c4400; text-align: center; font-size: 16.8px; font-weight: 700; padding: 8px 14px; line-height: 1.5; border-bottom: 1px solid #ecd9a0; }\n\n  /* 이름이 길 때 로고가 화면 밖으로 나가지 않게 */\n  .logo { min-width: 0; }\n  .logo > span { min-width: 0; }\n  @media (max-width: 720px) {\n    .logo { white-space: normal; flex: 1 1 auto; }\n    .logo b { font-size: var(--logo-fs, clamp(24px, 7.44vw, 31.2px)); line-height: 1.25; }\n    .menu-btn { flex: none; }\n  }\n\n  /* 휴대폰 아래 고정 버튼 (전화 · 카톡/길찾기) */\n  .mbar { display: none; }\n  @media (max-width: 720px) {\n    .mbar {\n      display: grid; grid-template-columns: 1fr 1fr; gap: 8px; position: fixed; left: 0; right: 0; bottom: 0; z-index: 50;\n      padding: 10px 12px calc(10px + env(safe-area-inset-bottom)); background: rgba(255, 255, 255, .96); border-top: 1px solid var(--line);\n      -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);\n    }\n    .mbar a { display: flex; align-items: center; justify-content: center; min-height: 48px; border-radius: 999px; font-weight: 700; font-size: 19.2px; text-decoration: none; white-space: nowrap; }\n    .mbar .m-tel { background: var(--gold); color: #fff; }\n    .mbar .m-sub { background: #fff; color: var(--char); border: 1px solid var(--char); }\n    .mbar .m-sub.kakao { background: #fee500; border-color: #fee500; color: #3a1d1d; }\n    footer { padding-bottom: 96px; }\n    .toast { bottom: 84px; }\n  }\n\n  /* PC: 오른쪽 아래 떠 있는 카톡 상담 버튼 (카톡 채널 주소가 있을 때만) */\n  .fab { position: fixed; right: 24px; bottom: 24px; z-index: 45; padding: 14px 22px; border-radius: 999px; background: #fee500; color: #3a1d1d; font-weight: 700; font-size: 19.2px; text-decoration: none; box-shadow: 0 8px 22px rgba(0, 0, 0, .18); }\n  @media (max-width: 720px) { .fab { display: none; } }\n\n  /* 비용표 설명 */\n  .fee-law { margin-top: 14px; font-size: 17.4px; color: var(--ink-faint); }\n  .calc-badge { display: inline-block; margin-left: 6px; padding: 2px 8px; border-radius: 999px; background: var(--gold-soft); color: var(--gold); font-size: 15px; font-weight: 700; vertical-align: middle; }\n\n  /* 일러스트 슬라이드(그림이 밝아서): 글자를 진하게 */\n  .slide img[src^=\"data:image/svg\"] ~ figcaption { color: var(--char); font-weight: 700; text-shadow: none; background: linear-gradient(transparent, rgba(255, 255, 255, .85) 60%); }\n  .slider:has(.slide.on img[src^=\"data:image/svg\"]) .s-arrow { border-color: rgba(42, 42, 42, .35); color: var(--char); background: rgba(255, 255, 255, .6); }\n  .slider:has(.slide.on img[src^=\"data:image/svg\"]) .s-dots button { border-color: var(--char); }\n  .slider:has(.slide.on img[src^=\"data:image/svg\"]) .s-dots button[aria-current=\"true\"] { background: var(--char); }\n\n  /* 줄 안의 긴 보충 설명은 줄바꿈 허용 */\n  .rows .sub { display: block; margin-top: 2px; font-size: 16.8px; line-height: 1.6; color: var(--ink-faint); }\n\n  /* 감경 대상자 본인부담 줄 */\n  .fee .rl { display: block; font-size: 15.6px; font-weight: 500; color: var(--ink-faint); margin-top: 2px; }\n  .fee tbody .cutrow td { color: var(--ink); font-weight: 500; }\n  .fee tbody .cutrow th { background: #fff; }\n\n  /* 참고 영상: 작게, 왼쪽 정렬 */\n  .refvideo { padding: 10px 0 80px; }\n  .refvideo .head { margin-bottom: 18px; }\n  .refvideo .head h2 { font-size: clamp(26.4px, 2.88vw, 33.6px); margin-bottom: 0; }\n  .refvideo .intro-video { margin: 0 auto; max-width: 900px; }\n  .refvideo .intro-video h3 { text-align: left; font-size: 24px; margin-bottom: 12px; }\n  .refvideo .iv-frame { max-width: 900px; margin: 0 auto; box-shadow: 0 20px 50px rgba(60, 40, 10, .16); }\n  .refvideo .iv-src { text-align: left; }\n  @media (max-width: 720px) { .refvideo { padding: 0 0 56px; } .refvideo .iv-poster::after { width: 56px; height: 56px; margin: -28px 0 0 -28px; background-size: 30px; } }\n\n  /* 타일 3의 짧은 설명은 한 줄로 (4칸일 때 좁아지지 않게 2칸 전환을 1240px로) */\n  .tile p.one { white-space: nowrap; }\n  @media (max-width: 1239px) { .tiles { grid-template-columns: 1fr 1fr; } }\n  @media (max-width: 560px) { .tiles { grid-template-columns: 1fr; } }\n  @media (max-width: 420px) { .tile p.one { white-space: normal; } }\n\n  /* 첫 화면 AI 이미지 안내 문구 */\n  .ai-note { max-width: 1100px; margin: 14px auto 0; text-align: right; font-size: 15.6px; line-height: 1.5; color: rgba(255, 255, 255, .72); }\n  @media (max-width: 720px) { .ai-note { text-align: left; margin: 0; padding: 12px 18px 22px; } }\n\n  /* 휴대폰: 첫 화면 이미지 비율을 조금 가로로(16:10) — 가장자리 얼굴이 덜 잘리게 */\n  @media (max-width: 720px) { .slider { aspect-ratio: 16 / 10; } }\n\n  /* 장기요양기관 정보 칸: 제목·설명을 없앴으니 한 칸으로, 링크 버튼은 크게 */\n  .org { grid-template-columns: 1fr; }\n  .org .btn { grid-column: auto; justify-self: start; font-size: 24px; padding: 18px 34px; line-height: 1.4; }\n  @media (max-width: 720px) { .org .btn { justify-self: stretch; width: 100%; font-size: 21.6px; padding: 16px 20px; text-align: center; border-radius: 28px; } }\n\n\n  /* ===== [2.0 추가] 멀티페이지 상단 서브 배너 · 현재 메뉴 표시 ===== */\n  .top nav a[aria-current=\"page\"] { color: var(--gold); position: relative; }\n  .top nav a[aria-current=\"page\"]::after {\n    content: \"\"; position: absolute; left: 0; right: 0; bottom: -8px; height: 3px; border-radius: 999px; background: var(--gold);\n  }\n  @media (max-width: 1100px) {\n    .top nav a[aria-current=\"page\"] { background: var(--soft); font-weight: 800; }\n    .top nav a[aria-current=\"page\"]::after { display: none; }\n  }\n  .sub-hero {\n    color: #fff; padding: 64px 0 60px;\n    background:\n      radial-gradient(ellipse at 82% 10%, var(--hero-glow) 0, transparent 48%),\n      linear-gradient(160deg, var(--hero-1) 0%, var(--hero-2) 60%, var(--hero-3) 100%);\n  }\n  .sub-hero .crumb { font-size: 16.8px; color: rgba(255, 255, 255, .7); margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }\n  .sub-hero .crumb a { color: rgba(255, 255, 255, .82); text-decoration: none; }\n  .sub-hero .crumb a:hover { text-decoration: underline; }\n  .sub-hero .en-tag { font-size: 26.4px; margin-bottom: 2px; }\n  .sub-hero h1 { font-size: clamp(33.6px, 4.56vw, 52.8px); font-weight: 800; letter-spacing: -1.2px; color: #fff; margin-bottom: 10px; }\n  .sub-hero h1 em { font-style: normal; color: var(--light-gold); }\n  .sub-hero p { color: rgba(255, 255, 255, .84); font-size: 21.6px; max-width: 760px; }\n  @media (max-width: 720px) {\n    .sub-hero { padding: 42px 0 40px; }\n    .sub-hero p { font-size: 19.2px; }\n  }\n\n  /* 메인 화면용 미니 계산기 배너 & 멀티페이지 바로가기 카드 */\n  .calc-teaser {\n    display: grid; grid-template-columns: 1.25fr 1fr; gap: 28px; align-items: center;\n    background: linear-gradient(145deg, var(--green-deep) 0%, var(--hero-2) 100%);\n    color: #fff; border-radius: 22px; padding: 44px 42px; box-shadow: 0 22px 50px rgba(35, 43, 29, .18);\n  }\n  .calc-teaser .ct-badge {\n    display: inline-block; padding: 5px 13px; border-radius: 999px; background: rgba(226, 200, 153, .2);\n    color: var(--light-gold); font-size: 16.8px; font-weight: 700; margin-bottom: 14px;\n  }\n  .calc-teaser h3 { font-size: clamp(28.8px, 3.6vw, 40.8px); color: #fff; margin-bottom: 12px; letter-spacing: -1px; }\n  .calc-teaser h3 em { font-style: normal; color: var(--light-gold); }\n  .calc-teaser p { color: rgba(255, 255, 255, .82); font-size: 20.4px; margin-bottom: 24px; }\n  .calc-teaser .ct-card {\n    background: #fff; color: var(--ink); border-radius: 18px; padding: 26px 24px; box-shadow: 0 12px 30px rgba(0, 0, 0, .2);\n  }\n  .calc-teaser .ct-card small { display: block; font-size: 16.2px; font-weight: 700; color: var(--ink-faint); }\n  .calc-teaser .ct-card strong {\n    display: block; font-size: 40.8px; font-weight: 800; color: var(--gold); letter-spacing: -1px; margin: 4px 0 6px;\n    font-family: \"Noto Serif KR\", serif;\n  }\n  .calc-teaser .ct-card .ct-sub { font-size: 17.4px; color: var(--ink-soft); padding-bottom: 14px; border-bottom: 1px solid var(--line); margin-bottom: 12px; }\n  .calc-teaser .ct-card ul { list-style: none; padding: 0; margin: 0; font-size: 17.4px; color: var(--ink-soft); display: grid; gap: 5px; }\n  .calc-teaser .ct-card ul li::before { content: \" \"; color: var(--gold); font-weight: 800; }\n  @media (max-width: 860px) { .calc-teaser { grid-template-columns: 1fr; padding: 30px 24px; } }\n\n  /* ===== [2.0 추가] 센터 맞춤형 장기요양 본인부담금 계산기 (guide.html 내장) ===== */\n  .ltc-wrap {\n    background: var(--soft); border: 1px solid var(--line); border-radius: 24px; padding: 36px 32px; margin-bottom: 32px;\n  }\n  .ltc-grid {\n    display: grid; grid-template-columns: 1.08fr .92fr; gap: 24px; align-items: start;\n  }\n  @media (max-width: 980px) {\n    .ltc-wrap { padding: 24px 18px; }\n    .ltc-grid { grid-template-columns: 1fr; }\n  }\n  .ltc-card {\n    background: #fff; border: 1px solid var(--line); border-radius: 20px; padding: 26px 24px;\n    box-shadow: 0 4px 16px rgba(40, 30, 20, .04);\n  }\n  .ltc-card + .ltc-card { margin-top: 16px; }\n  .ltc-card h3 {\n    font-size: 24px; font-weight: 800; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; gap: 8px;\n    font-family: \"Noto Sans KR\", sans-serif !important;\n  }\n  .ltc-card h3 small { font-size: 16.2px; font-weight: 500; color: var(--ink-faint); }\n  .ltc-field + .ltc-field { margin-top: 20px; padding-top: 18px; border-top: 1px dashed var(--line); }\n  .ltc-label {\n    display: flex; align-items: baseline; justify-content: space-between; gap: 8px;\n    font-size: 18.6px; font-weight: 700; color: var(--ink); margin-bottom: 10px;\n  }\n  .ltc-label small { font-size: 15.6px; font-weight: 500; color: var(--ink-faint); }\n\n  /* 서비스 탭 3종 */\n  .ltc-tabs {\n    display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; background: var(--soft); padding: 6px; border-radius: 16px; margin-bottom: 20px;\n  }\n  .ltc-tab {\n    border: 0; background: transparent; border-radius: 12px; padding: 12px 10px; cursor: pointer;\n    font: inherit; font-size: 19.2px; font-weight: 700; color: var(--ink-soft); transition: all .2s;\n    display: flex; flex-direction: column; align-items: center; gap: 2px;\n  }\n  .ltc-tab small { font-size: 14.4px; font-weight: 500; opacity: .8; }\n  .ltc-tab[aria-selected=\"true\"] {\n    background: var(--gold); color: #fff; box-shadow: 0 4px 12px rgba(0, 0, 0, .12);\n  }\n\n  /* 칩 버튼 그리드 */\n  .ltc-chips { display: grid; gap: 8px; }\n  .ltc-chips.c3 { grid-template-columns: repeat(3, 1fr); }\n  .ltc-chips.c2 { grid-template-columns: repeat(2, 1fr); }\n  .ltc-chips.c4 { grid-template-columns: repeat(4, 1fr); }\n  @media (max-width: 520px) {\n    .ltc-chips.c4 { grid-template-columns: repeat(2, 1fr); }\n  }\n  .ltc-chip {\n    border: 1.5px solid var(--line); background: #fff; border-radius: 12px; padding: 11px 8px; cursor: pointer;\n    font: inherit; font-size: 18px; font-weight: 700; color: var(--ink); text-align: center; transition: all .15s;\n    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; min-height: 52px;\n  }\n  .ltc-chip small { font-size: 14.4px; font-weight: 500; color: var(--ink-faint); }\n  .ltc-chip:hover:not(:disabled):not([aria-pressed=true]) { border-color: var(--gold); background: var(--gold-soft); }\n  .ltc-chip[aria-pressed=\"true\"] {\n    border-color: var(--green); background: var(--green); color: #fff;\n  }\n  .ltc-chip[aria-pressed=\"true\"] small { color: rgba(255, 255, 255, .85); }\n  .ltc-chip:disabled { opacity: .4; cursor: not-allowed; background: var(--soft); }\n\n  /* 스테퍼 (− 숫자 +) */\n  .ltc-step-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 0; }\n  .ltc-step-row + .ltc-step-row { border-top: 1px solid var(--line); padding-top: 12px; margin-top: 4px; }\n  .ltc-step-info b { display: block; font-size: 18.6px; color: var(--ink); }\n  .ltc-step-info small { display: block; font-size: 15.6px; color: var(--ink-faint); }\n  .ltc-stepper {\n    display: inline-flex; align-items: center; border: 1.5px solid var(--line); border-radius: 12px; background: #fff; overflow: hidden;\n  }\n  .ltc-stepper button {\n    width: 40px; height: 40px; border: 0; background: var(--soft); color: var(--ink); font-size: 24px; font-weight: 700; cursor: pointer;\n  }\n  .ltc-stepper button:hover { background: var(--gold-soft); color: var(--gold); }\n  .ltc-stepper input {\n    width: 52px; height: 40px; border: 0; text-align: center; font-size: 19.2px; font-weight: 800; color: var(--ink); background: #fff;\n  }\n  .ltc-stepper span { padding-right: 10px; font-size: 16.8px; color: var(--ink-soft); font-weight: 600; }\n\n  /* 금액 입력칸 */\n  .ltc-money-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }\n  .ltc-money {\n    display: flex; align-items: center; justify-content: space-between; border: 1.5px solid var(--line); border-radius: 12px; padding: 8px 12px; background: #fff;\n  }\n  .ltc-money label { font-size: 16.2px; font-weight: 700; color: var(--ink-soft); }\n  .ltc-money div { display: flex; align-items: center; gap: 4px; }\n  .ltc-money input {\n    width: 82px; border: 0; text-align: right; font-size: 19.2px; font-weight: 800; color: var(--ink); background: transparent;\n  }\n  .ltc-money span { font-size: 16.8px; color: var(--ink-faint); }\n\n  /* 방문요양 병행 토글 박스 */\n  .ltc-toggle-box {\n    background: var(--soft); border: 1px solid var(--line); border-radius: 14px; padding: 14px 16px; margin-top: 14px;\n  }\n  .ltc-toggle-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; cursor: pointer; }\n  .ltc-toggle-head b { font-size: 18px; display: block; }\n  .ltc-toggle-head small { font-size: 15.6px; color: var(--ink-soft); }\n  .ltc-switch {\n    position: relative; width: 48px; height: 28px; border-radius: 999px; background: #cdc6ba; border: 0; cursor: pointer; transition: background .2s; flex: none;\n  }\n  .ltc-switch::after {\n    content: \"\"; position: absolute; left: 3px; top: 3px; width: 22px; height: 22px; border-radius: 50%; background: #fff; transition: transform .2s;\n  }\n  .ltc-switch[aria-checked=\"true\"] { background: var(--green); }\n  .ltc-switch[aria-checked=\"true\"]::after { transform: translateX(20px); }\n  .ltc-subpanel { margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--line); }\n\n  /* 우측 결과 히어로 카드 */\n  .ltc-result-col { position: sticky; top: 118px; }\n  .ltc-hero {\n    background: linear-gradient(150deg, var(--green-deep) 0%, var(--hero-2) 100%);\n    color: #fff; border-radius: 20px; padding: 28px 26px; box-shadow: 0 16px 38px rgba(35, 43, 29, .18);\n  }\n  .ltc-hero-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }\n  .ltc-hero-badge {\n    display: inline-block; padding: 4px 12px; border-radius: 999px; background: var(--gold); color: #fff; font-size: 15.6px; font-weight: 700;\n  }\n  .ltc-hero-cond { font-size: 16.2px; color: rgba(255, 255, 255, .8); }\n  .ltc-hero-label { font-size: 18px; color: rgba(255, 255, 255, .85); font-weight: 500; }\n  .ltc-hero-amount {\n    font-size: clamp(40.8px, 4.8vw, 52.8px); font-weight: 800; color: var(--light-gold); letter-spacing: -1px; line-height: 1.2; margin: 4px 0 6px;\n    font-family: \"Noto Serif KR\", serif;\n  }\n  .ltc-hero-parts { font-size: 17.4px; color: rgba(255, 255, 255, .9); font-weight: 500; }\n\n  /* 한도 게이지 바 */\n  .ltc-gauge { margin-top: 16px; background: rgba(0, 0, 0, .22); border-radius: 14px; padding: 12px 14px; }\n  .ltc-gauge-track { height: 10px; border-radius: 999px; background: rgba(255, 255, 255, .18); overflow: hidden; margin-bottom: 8px; }\n  .ltc-gauge-fill { height: 100%; border-radius: 999px; background: var(--light-gold); transition: width .3s ease; }\n  .ltc-gauge-fill.over { background: #ff6b66; }\n  .ltc-gauge-txt { display: flex; justify-content: space-between; font-size: 15.6px; color: rgba(255, 255, 255, .86); }\n  .ltc-tip {\n    margin-top: 12px; padding: 11px 14px; border-radius: 12px; background: rgba(255, 255, 255, .12);\n    font-size: 16.8px; line-height: 1.55; color: #fff;\n  }\n  .ltc-tip b { color: var(--light-gold); }\n  .ltc-tip.over { background: rgba(217, 45, 39, .28); color: #ffd8d6; }\n\n  /* 상세 계산 내역 (.ltc-ledger) */\n  .ltc-ledger { list-style: none; padding: 0; margin: 0; font-size: 18px; }\n  .ltc-ledger li { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--line); }\n  .ltc-ledger li.zero { opacity: .45; }\n  .ltc-ledger li.over b { color: #c0392b; }\n  .ltc-ledger li.head { font-weight: 800; color: var(--gold); padding-top: 16px; border-bottom: 2px solid var(--line); font-size: 16.8px; }\n  .ltc-ledger li.sum { background: var(--soft); padding: 10px 12px; border-radius: 8px; font-weight: 700; margin: 4px 0; border-bottom: 0; }\n  .ltc-ledger li.total {\n    background: var(--gold-soft); padding: 14px 16px; border-radius: 12px; font-weight: 800; font-size: 20.4px; color: var(--ink); margin-top: 10px; border-bottom: 0;\n  }\n  .ltc-ledger li.total b { font-size: 24px; color: var(--gold); }\n  .ltc-ledger small { display: block; font-size: 15px; color: var(--ink-faint); font-weight: 400; }\n\n  /* 감경 비교 & 서비스별 비교 & 2027 미리보기 */\n  .ltc-cmp-list { display: grid; gap: 8px; }\n  .ltc-cmp-item {\n    display: flex; align-items: center; justify-content: space-between; gap: 10px;\n    padding: 11px 14px; border: 1px solid var(--line); border-radius: 12px; background: #fff; font-size: 18px;\n  }\n  .ltc-cmp-item.on { border-color: var(--gold); background: var(--gold-soft); font-weight: 700; }\n  .ltc-cmp-item button {\n    all: unset; cursor: pointer; display: flex; align-items: center; justify-content: space-between; width: 100%;\n  }\n  .ltc-2027 {\n    background: var(--soft); border: 1px solid var(--line); border-radius: 14px; padding: 16px; margin-top: 16px; font-size: 17.4px;\n  }\n  .ltc-2027-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; }\n  .ltc-2027-row b { font-size: 19.2px; color: var(--gold); }\n  .ltc-actions { display: grid; grid-template-columns: 1fr 1.6fr; gap: 10px; margin-top: 16px; }\n  .ltc-actions .btn { padding: 13px 16px; font-size: 19.2px; width: 100%; } /* [2026-11-19 계산기 한 줄 표기: 글자가 중간에서 줄바꿈되지 않게] */ #ltcCalcRoot .ltc-label{display:flex !important;flex-wrap:wrap;align-items:baseline;justify-content:space-between;column-gap:8px} #ltcCalcRoot .ltc-label span{white-space:nowrap} #ltcCalcRoot .ltc-label small{display:inline !important;margin-top:0 !important} #ltcReduce .ltc-chip{padding:11px 4px;overflow-wrap:normal} #ltcReduce .ltc-chip small{white-space:nowrap;letter-spacing:-.3px;overflow-wrap:normal} #ltcCalcRoot .ltc-ledger li{display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:10px;align-items:baseline;white-space:nowrap} #ltcCalcRoot .ltc-ledger li>span{display:contents;overflow-wrap:normal} #ltcCalcRoot .ltc-ledger li>span:only-child{display:block;grid-column:1/-1;white-space:normal;overflow-wrap:anywhere} #ltcCalcRoot .ltc-ledger li>b{grid-column:2;grid-row:1;white-space:nowrap;max-width:none;overflow-wrap:normal;text-align:right} #ltcCalcRoot .ltc-ledger li small{grid-column:1/-1;grid-row:2;white-space:nowrap;min-width:0;overflow:hidden;text-overflow:ellipsis;margin-top:2px} #ltcCalcRoot .ltc-ledger li.head{display:block} #ltcCalcRoot .ltc-hero-top{flex-wrap:wrap;row-gap:4px} #ltcServiceCmp .ltc-cmp-item button{display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:10px;align-items:baseline;min-width:0} #ltcServiceCmp .ltc-cmp-item button>span{display:contents;overflow-wrap:normal} #ltcServiceCmp .ltc-cmp-item button>b{grid-column:2;grid-row:1;white-space:nowrap} #ltcServiceCmp .ltc-cmp-item button small{grid-column:1/-1;grid-row:2;white-space:nowrap;min-width:0;overflow:hidden;text-overflow:ellipsis;font-size:14px;margin-top:2px} @media (max-width:480px){#ltcCalcRoot .ltc-ledger small{font-size:14px}}\n\n\n  /* ===== [3.0 GEO 추가] AI 핵심 요약 박스 (AI Quick Facts) & 내부 연결 카드 & GEO 푸터 배지 ===== */\n  .geo-summary {background:#fff;border:1px solid #deded4;border-radius:24px;padding:32px;margin-top:32px;box-shadow:0 8px 28px rgba(33,42,31,.06);color:#243129;}\n  .geo-summary-head {display:block;margin-bottom:26px;}\n  .geo-summary .geo-summary-center {margin:0 0 6px;font-size:18px;font-weight:700;color:#59664f;line-height:1.5;}\n  .geo-summary h2 {margin:0;font-size:33.6px;line-height:1.4;letter-spacing:-.7px;font-weight:800;color:#233129;}\n  .geo-summary .geo-summary-meta {margin:10px 0 0;font-size:16.8px;line-height:1.6;color:#62675f;}\n  .geo-summary-layout {display:grid;grid-template-columns:minmax(0,1fr) 310px;gap:24px;align-items:stretch;}\n  .geo-dl {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin:0;}\n  .geo-dl>div {display:flex;flex-direction:column;gap:9px;background:#f7f8f5;border:1px solid #e4e8df;border-radius:14px;padding:20px;min-width:0;}\n  .geo-dl .geo-location {grid-column:1 / -1;}\n  .geo-dl dt {font-size:18px;line-height:1.5;font-weight:700;color:#56614e;}\n  .geo-dl dd {margin:0;font-size:21.6px;line-height:1.6;font-weight:700;color:#263328;overflow-wrap:anywhere;}\n  .geo-dl dd small {display:block;margin-top:5px;font-size:18px;font-weight:400;line-height:1.65;color:#555e52;}\n  .geo-dl a {display:inline-block;margin-top:7px;font-size:18px;color:#314c37;text-decoration:underline;text-underline-offset:4px;}\n  .geo-summary-cost {display:flex;flex-direction:column;align-items:flex-start;background:#f3f0e7;border:1px solid #e1dac8;border-radius:16px;padding:26px;min-width:0;}\n  .geo-summary .geo-cost-label {margin:0 0 12px;font-size:20.4px;font-weight:700;color:#394432;line-height:1.5;}\n  .geo-summary .geo-cost-number {margin:0 0 12px;font-size:43.2px;font-weight:800;letter-spacing:-1.3px;line-height:1.3;color:#273e2b;font-variant-numeric:tabular-nums;white-space:nowrap;}\n  .geo-cost-number span {font-size:22.8px;letter-spacing:0;font-weight:600;margin-left:3px;}\n  .geo-summary .geo-cost-condition {margin:0;font-size:18px;line-height:1.7;color:#4e5748;}\n  .geo-summary .geo-cost-note {margin:12px 0 22px;font-size:16.8px;line-height:1.7;color:#626559;}\n  .geo-summary .geo-cost-link {display:flex;align-items:center;justify-content:center;min-height:48px;width:100%;padding:10px 14px;margin-top:auto;border-radius:10px;background:#304c37;color:white;font-size:19.2px;font-weight:700;line-height:1.5;text-decoration:none;transition:background .15s;}\n  .geo-summary .geo-cost-link:hover {background:#203625;}\n  .geo-summary a:focus-visible {outline:3px solid #294d84;outline-offset:4px;}\n  @media(max-width:1000px) {.geo-summary-layout{grid-template-columns:minmax(0,1fr) 280px;gap:18px}.geo-dl{grid-template-columns:1fr}.geo-summary-cost{padding:24px}.geo-cost-number{font-size:40.8px}}\n  @media(max-width:700px) {.geo-summary{padding:24px 20px;border-radius:20px}.geo-summary h2{font-size:28.8px}.geo-summary-head{margin-bottom:20px}.geo-summary-layout{grid-template-columns:1fr;gap:18px}.geo-dl{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.geo-dl>div{padding:16px}.geo-dl dd{font-size:20.4px}.geo-summary-cost{padding:24px}.geo-summary .geo-cost-number{font-size:43.2px}}\n  @media(max-width:480px) {.geo-dl{grid-template-columns:1fr}.geo-summary h2{font-size:27.6px}.geo-dl>div{padding:18px}.geo-summary .geo-cost-note{font-size:16.8px}.geo-summary-cost{padding:22px}}\n\n  .geo-summary .geo-summary-layout {grid-template-columns:minmax(0,1fr);}\n  .geo-summary .geo-dl {grid-template-columns:repeat(3,minmax(0,1fr));}\n  .geo-summary .geo-dl .geo-location {grid-column:auto;}\n  @media(max-width:860px){.geo-summary .geo-dl{grid-template-columns:repeat(2,minmax(0,1fr));}.geo-summary .geo-dl .geo-location{grid-column:1 / -1;}}\n  @media(max-width:520px){.geo-summary .geo-dl{grid-template-columns:1fr;}.geo-summary .geo-dl .geo-location{grid-column:auto;}}\n\n  .geo-summary .geo-summary-head {margin-bottom:22px;}\n  .geo-summary .geo-summary-meta {margin-top:8px;font-size:19.2px;color:#4d594a;}\n  .geo-summary .geo-summary-footer {display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px 24px;margin-top:20px;padding:12px 16px;border-radius:10px;border-top:1px solid #e2e5dc;background:#f7f8f5;color:#374731;font-size:16.8px;line-height:1.6;}\n  .geo-summary-footer b {color:#34422f;font-weight:600;font-variant-numeric:tabular-nums;}\n  .geo-summary .geo-summary-footer a {display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:10px 18px;border:1px solid #304c37;border-radius:10px;background:#304c37;color:#fff;font-size:18px;font-weight:700;line-height:1.5;text-decoration:none;text-align:center;box-sizing:border-box;}\n  .geo-summary .geo-summary-footer a:hover {background:#213b27;border-color:#213b27;color:#fff;}\n  .geo-summary .geo-summary-footer a:focus-visible {outline:3px solid #294d84;outline-offset:4px;}\n  @media(max-width:520px){.geo-summary .geo-summary-footer a{width:100%;margin-top:8px;}}\n  @media(max-width:520px){.geo-summary .geo-summary-footer{align-items:flex-start;flex-direction:column;gap:2px}.geo-summary h2{font-size:26.4px}}\n\n  .faq-more {margin-top:20px;}\n  .faq-more>summary {display:flex;align-items:center;justify-content:center;list-style:none;min-height:50px;padding:12px 20px;border:1px solid #ced7c8;border-radius:10px;background:#f5f7f2;color:#304c37;font-size:19.2px;font-weight:700;line-height:1.5;cursor:pointer;}\n  .faq-more>summary::-webkit-details-marker {display:none;}\n  .faq-more>summary:hover {background:#eaf0e5;}\n  .faq-more>summary:focus-visible {outline:3px solid #294d84;outline-offset:4px;}\n  .faq-more>summary .faq-more-hide {display:none;}\n  .faq-more[open]>summary .faq-more-show {display:none;}\n  .faq-more[open]>summary .faq-more-hide {display:inline;}\n  .faq-extra {margin-top:20px;}\n\n  .facility-overview{background:#f7f8f4;}\n  .facility-three{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px;}\n  .facility-card{background:#fff;border:1px solid #dfe5d9;border-radius:18px;padding:28px;display:flex;flex-direction:column;min-width:0;}\n  .facility-card-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;}\n  .facility-card-top svg{width:46px;height:46px;fill:none;stroke:#425b3d;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}\n  .facility-card-top span{color:#66705f;font-size:16.8px;font-weight:600;}\n  .facility-card h3{font-size:27.6px;font-weight:800;line-height:1.4;color:#263629;margin:0 0 14px;}\n  .facility-card p{font-size:19.2px;line-height:1.8;color:#535e4f;margin:0 0 24px;}\n  .facility-labels{list-style:none;margin:auto 0 0;padding:0;display:flex;gap:7px;flex-wrap:wrap;}\n  .facility-labels li{font-size:15.6px;line-height:1.5;padding:5px 9px;border-radius:6px;background:#f1f5ed;color:#45563d;}\n  .facility-visit{margin-top:22px;font-size:18px;line-height:1.7;color:#56624f;}\n  .facility-visit a{color:#304c37;text-decoration:underline;text-underline-offset:4px;}\n  .refvideo .intro-video{max-width:920px;margin-left:auto;margin-right:auto;}\n  @media(max-width:860px){.facility-three{grid-template-columns:1fr;gap:16px}.facility-card{padding:24px}.facility-card-top{margin-bottom:14px}.facility-card p{margin-bottom:18px}}\n\n  .facility-overview .facility-card {padding:26px 28px;}\n  .facility-overview .facility-card-top {margin-bottom:16px;}\n  .facility-overview .facility-card h3 {margin:0;}\n  @media(max-width:860px){.facility-overview .facility-card{padding:22px 24px}}\n\n  .geo-summary .facility-inline {margin:24px 0 0;padding:22px 0 0;background:transparent;border-top:1px solid #e2e5dc;}\n  .facility-inline-heading {margin-bottom:16px;}\n  .facility-inline-heading h3 {margin:0;color:#263629;font-size:24px;font-weight:700;line-height:1.5;}\n  .facility-inline .facility-three {gap:14px;}\n  .facility-inline .facility-card {padding:20px;border-radius:14px;box-shadow:none;}\n  .facility-inline .facility-card-top {margin-bottom:12px;}\n  .facility-inline .facility-card-top svg {width:38px;height:38px;}\n  .facility-inline .facility-card h4 {margin:0;font-size:24px;font-weight:700;color:#263629;line-height:1.4;}\n  @media(max-width:860px){.facility-inline .facility-three{grid-template-columns:repeat(3,minmax(0,1fr));}}\n  @media(max-width:600px){.facility-inline .facility-three{grid-template-columns:1fr;}.facility-inline .facility-card{padding:18px;}.facility-inline .facility-card-top{margin-bottom:8px;}}\n\n  .geo-summary .geo-summary-title {font-size:clamp(33.6px,4.32vw,50.4px);font-weight:800;line-height:1.35;letter-spacing:-1.2px;margin:0 0 12px;color:#263129;}\n  .geo-summary .geo-summary-name {font-size:25.2px;font-weight:700;line-height:1.5;margin:0 0 6px;color:#3a4935;}\n  @media(max-width:700px){.geo-summary .geo-summary-title{font-size:30px;}.geo-summary .geo-summary-name{font-size:21.6px;}}\n\n  .facility-inline .facility-photo-card {padding:0;overflow:hidden;}\n  .facility-photo {display:block;width:100%;height:auto;aspect-ratio:4/3;object-fit:cover;}\n  .facility-photo-empty {display:flex;align-items:center;justify-content:center;aspect-ratio:4/3;background:#edf1e8;color:#59674f;border-bottom:1px solid #dfe5d9;font-size:18px;line-height:1.5;}\n  .facility-inline .facility-photo-card h4 {padding:17px 20px;margin:0;}\n\n  .cost-eyebrow {margin:0 0 14px;line-height:1.3;}\n\n  .geo-summary .geo-summary-footer a {gap:8px;}\n  .institution-link-sr {position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}\n  /* 영상 대본 요약 (미디어 이해도 향상) */\n  .iv-summary {\n    max-width: 900px; margin: 12px auto 0; background: var(--soft); border: 1px solid var(--line);\n    border-radius: 10px; padding: 12px 16px; font-size: 17.4px; color: var(--ink-soft);\n  }\n  .iv-summary summary { cursor: pointer; font-weight: 700; color: var(--ink); }\n  .iv-summary p { margin-top: 8px; line-height: 1.65; }\n\n  /* 페이지 하단 내부 연결 네비게이션 (GEO 기준 05: 정보 구조·내부 연결성) */\n  .geo-next-nav {\n    padding: 56px 0; background: var(--soft); border-top: 1px solid var(--line);\n  }\n  .geo-next-grid {\n    display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-top: 18px;\n  }\n  .geo-next-card {\n    display: flex; flex-direction: column; justify-content: space-between;\n    background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 20px 20px;\n    text-decoration: none; transition: transform .2s, border-color .2s, box-shadow .2s;\n  }\n  .geo-next-card:hover { transform: translateY(-3px); border-color: var(--gold); box-shadow: 0 10px 24px rgba(40,30,20,.08); }\n  .geo-next-card small { font-size: 15px; font-weight: 700; color: var(--gold); }\n  .geo-next-card b { font-size: 21.6px; color: var(--ink); margin: 4px 0 6px; display: block; }\n  .geo-next-card span { font-size: 16.8px; color: var(--ink-faint); }\n  @media (max-width: 960px) { .geo-next-grid { grid-template-columns: 1fr 1fr; } }\n  @media (max-width: 520px) { .geo-next-grid { grid-template-columns: 1fr; } }\n\n  /* 푸터 GEO 인증 배지 & 엔티티 신뢰 신호 */\n  .geo-trust-bar {\n    margin-top: 14px; padding-top: 14px; border-top: 1px solid rgba(255, 255, 255, .14);\n    display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px;\n    font-size: 16.2px; color: rgba(255, 255, 255, .68);\n  }\n  .geo-badge-pill {\n    display: inline-flex; align-items: center; gap: 6px; padding: 5px 13px; border-radius: 999px;\n    background: rgba(226, 200, 153, .14); border: 1px solid rgba(226, 200, 153, .35);\n    color: var(--light-gold); font-size: 15.6px; font-weight: 700;\n  }\n\n\n  /* ===== 고저스(Gorgeous) 4색 멀티 하모니 & 딥 럭셔리 디테일 강화 ===== */\n  .tile, .bc, .prog, .month-card, .fc, .box {\n    box-shadow: 0 10px 28px rgba(35, 30, 22, .06);\n  }\n  .tile {\n    background-image: linear-gradient(160deg, rgba(255,255,255,.08) 0%, rgba(0,0,0,.12) 100%);\n  }\n  .prog .tag, .month-card .m-head, .bc {\n    background-image: linear-gradient(145deg, rgba(255,255,255,.07) 0%, rgba(0,0,0,.14) 100%);\n  }\n  footer { background: #1E2425 !important; }\n\n\n/* pc-wide-layout */\n@media (min-width:1101px) {\n .wrap {max-width:1640px;width:100%;padding-left:clamp(28px,3vw,64px);padding-right:clamp(28px,3vw,64px);}\n .top .wrap {max-width:none;width:100%;padding-left:clamp(24px,2vw,56px);padding-right:clamp(24px,2vw,56px);}\n .hero {padding-top:50px;padding-bottom:90px;}\n .hero .wrap {max-width:1800px;}\n .hero-text {max-width:1520px;width:100%;min-height:calc(100svh - 210px);display:flex;flex-direction:column;align-items:center;justify-content:center;margin:0 auto 56px;text-align:center;}\n .hero h1 {font-size:clamp(55.2px,4.92vw,93.6px);line-height:1.35;letter-spacing:-1.8px;max-width:100%;margin-bottom:28px;}\n .hero .lead {font-size:clamp(22.8px,1.62vw,30px);line-height:1.85;max-width:1160px;}\n .hero-cta {justify-content:center;}\n .slider {max-width:1520px;width:100%;}\n}\n\n/* facility-card-refined */\n.facility-inline .facility-three {gap:20px;}\n.facility-inline .facility-photo-card {--facility-accent:var(--gold);padding:0;overflow:hidden;border:1px solid var(--line);border-top:6px solid var(--facility-accent);border-radius:20px;background:#fff;box-shadow:0 5px 18px rgba(45,42,31,.035);}\n.facility-inline .facility-photo-card:nth-child(2) {--facility-accent:var(--slate);}\n.facility-inline .facility-photo-card:nth-child(3) {--facility-accent:var(--taupe);}\n.facility-inline .facility-photo-card .facility-photo {border:0;}\n.facility-inline .facility-photo-card .facility-photo-empty {background:linear-gradient(145deg,#fafaf6,var(--gold-soft));border-bottom:1px solid var(--line);color:var(--ink-soft);}\n.facility-inline .facility-photo-card h4 {padding:22px 24px 24px;font-size:27.6px;line-height:1.45;letter-spacing:-.4px;font-weight:700;color:var(--ink);background:#fff;}\n@media(max-width:600px){.facility-inline .facility-three{gap:16px;}.facility-inline .facility-photo-card{border-radius:16px;border-top-width:5px;}.facility-inline .facility-photo-card h4{padding:18px 20px;font-size:25.2px;}}\n\n/* readable-type-system */\nbody {font-size:24px;line-height:1.85;}\n.head {max-width:1440px;margin-bottom:42px;}\n.head h2 {font-size:clamp(36px,3.72vw,62.4px);line-height:1.4;letter-spacing:-1px;margin-bottom:24px;}\n.head p {font-size:26.4px;line-height:1.85;}\n.head[data-en]::before,.cost-eyebrow {font-size:36px;line-height:1.4;margin-bottom:12px;}\n.btn {font-size:22.8px;line-height:1.5;min-height:50px;}\n.tile h3,.prog h3,.start h3,.box h3 {font-size:30px;line-height:1.5;}\n.tile p,.prog p,.start p,.m-body p,.box>p,.day li p {font-size:22.8px;line-height:1.85;}\n.tile p.one {white-space:normal;}\n.rows {font-size:22.8px;line-height:1.8;}\n.faq summary {font-size:26.4px;line-height:1.65;}\n.faq details p {font-size:24px;line-height:1.9;}\n.geo-summary .geo-dl dt {font-size:20.4px;}\n.geo-summary .geo-dl dd {font-size:24px;line-height:1.7;}\n.geo-summary .geo-dl dd small {font-size:20.4px;line-height:1.8;}\n.geo-summary .geo-summary-meta {font-size:21.6px;}\n.geo-summary .geo-summary-footer {font-size:19.2px;}\n.geo-summary .geo-summary-footer a {font-size:20.4px;}\n.calc-badge,.ct-badge {font-size:16.8px;}\n.ct-sub,.ct-card small {font-size:20.4px;line-height:1.7;}\n.consult .head {max-width:100%;}\n.consult .head h2 {font-size:clamp(38.4px,3.72vw,62.4px);line-height:1.45;color:#fff;}\n.consult .head p,.consult .cta p {font-size:26.4px;line-height:1.9;color:#eef0e6;}\n.consult .steps {gap:24px;}\n.consult .steps li {padding:34px 30px;min-height:300px;border-color:rgba(255,255,255,.28);}\n.consult .steps .n {font-size:64.8px;line-height:1.2;margin-bottom:20px;}\n.consult .steps h3 {font-size:32.4px;line-height:1.5;margin-bottom:16px;color:#fff;}\n.consult .steps p {font-size:25.2px;line-height:1.9;color:#eef0e6;}\n.consult .cta .btn {font-size:28.8px;padding:18px 30px;}\n.sub-hero p {font-size:24px;line-height:1.8;max-width:1050px;}\n.iv-src,.facility-visit {font-size:20.4px;line-height:1.8;}\n@media(max-width:1100px){.consult .steps li{padding:28px 24px;}.consult .steps p{font-size:22.8px;}.consult .steps h3{font-size:28.8px;}}\n@media(max-width:720px){\n body{font-size:21.6px;line-height:1.8;}.head{margin-bottom:30px;}.head h2,.consult .head h2{font-size:33.6px;line-height:1.5;}.head p,.consult .head p,.consult .cta p{font-size:21.6px;line-height:1.85;}\n .head[data-en]::before,.cost-eyebrow{font-size:30px;}.btn{font-size:20.4px;min-height:48px;}.tile p,.prog p,.start p,.m-body p,.box>p,.day li p,.rows{font-size:21.6px;}\n .consult .steps li{padding:26px 24px;min-height:0;}.consult .steps .n{font-size:52.8px;margin-bottom:14px;}.consult .steps h3{font-size:27.6px;}.consult .steps p{font-size:21.6px;line-height:1.85;}.consult .cta .btn{font-size:25.2px;}\n .faq summary{font-size:22.8px;}.faq details p{font-size:21.6px;}.geo-summary .geo-dl dd{font-size:21.6px;}.geo-summary .geo-dl dd small{font-size:19.2px;}.sub-hero p{font-size:21.6px;}\n}\n\n/* full-width-media-cards */\n.refvideo .intro-video,.intro-video .iv-frame {max-width:none;width:100%;}\n.refvideo .intro-video .iv-frame {max-width:none;width:100%;aspect-ratio:16/9;}\n.refvideo .head {max-width:none;}\n.refvideo .iv-summary {max-width:none;width:100%;}\n@media(min-width:1101px){\n .wrap {width:calc(100% - 64px);max-width:1920px;padding-left:0;padding-right:0;}\n .top .wrap {width:calc(100% - 64px);max-width:none;padding-left:0;padding-right:0;}\n .hero .wrap {max-width:1920px;}\n .hero-text {max-width:none;}\n .slider {max-width:none;width:100%;}\n .head {max-width:none;}\n .tiles,.blog {gap:24px;}\n .tiles .tile {min-height:clamp(360px,25vw,500px);padding:38px clamp(24px,2vw,42px);}\n .tiles .tile.t1, .tile.t1 h3, .tile.t1 p, .tile.t1 svg { color:#fff !important; } .tile h3 {font-size:clamp(30px,2.2vw,42px);line-height:1.45;}\n .tiles .tile p {font-size:24px;line-height:1.85;white-space:normal;}\n .tiles .tile svg {width:100px;height:100px;margin-top:32px;}\n .blog .bc {min-height:clamp(320px,22vw,440px);padding:34px 28px;}\n .blog .bc svg {width:70px;height:70px;margin-bottom:26px;}\n .blog .blog .bc { color:#fff !important; text-decoration:none; min-height:190px !important; } .blog .bc h3 { color:#fff !important; text-decoration:none; } .bc h3 {font-size:30px;line-height:1.5;margin-top:0;}\n .blog .bc p {font-size:23px;line-height:1.8;}\n .blog .bc span {font-size:22px;line-height:1.6;margin-top:auto;padding-top:24px;}\n .refvideo .iv-poster::after {width:112px;height:112px;left:50%;top:50%;transform:translate(-50%,-50%);margin:0;}\n}\n@media(min-width:1800px){.wrap,.top .wrap{width:calc(100% - 96px);}}\n@media(max-width:720px){.refvideo .intro-video{width:100%;}.refvideo .iv-frame{width:100%;}.blog .bc{min-height:270px;}.tiles .tile{min-height:290px;}}\n\n/* mobile-cost-readability */\n@media(max-width:600px){\n#calc-preview .calc-teaser{padding:20px 14px !important;gap:22px !important;}\n#calc-preview .calc-teaser .ct-card{padding:20px 18px !important;border-radius:16px;min-width:0;}\n#calc-preview .calc-teaser .ct-card small{font-size:15px !important;line-height:1.7 !important;color:#455349 !important;word-break:keep-all;overflow-wrap:break-word;}\n#calc-preview .calc-teaser .ct-card strong{font-family:'Noto Sans KR',sans-serif !important;font-size:32px !important;line-height:1.35 !important;letter-spacing:-1px !important;margin:16px 0 12px !important;color:#203d2e !important;font-variant-numeric:tabular-nums;word-break:keep-all;}\n#calc-preview .calc-teaser .ct-card .ct-sub{font-size:16px !important;line-height:1.7 !important;color:#394b40 !important;word-break:keep-all;overflow-wrap:break-word;padding-bottom:16px !important;margin-bottom:16px !important;}\n#calc-preview .calc-teaser .ct-card ul{font-size:16px !important;line-height:1.7 !important;gap:12px !important;color:#394b40 !important;}\n#calc-preview .calc-teaser .ct-card li{word-break:keep-all;overflow-wrap:break-word;padding-left:14px;position:relative;}\n#calc-preview .calc-teaser .ct-card li::before{content:'•' !important;position:absolute;left:0;color:#49634e !important;}\n}\n\n\n/* naver-blog-action */\n#photos .naver-blog-link{display:inline-flex;align-items:center;justify-content:center;gap:9px;min-height:48px;margin-top:20px;padding:13px 24px;border:1px solid #039343;border-radius:999px;background:#03a94d;color:#fff !important;font-family:\"Noto Sans KR\",sans-serif;font-size:18px;font-weight:700;line-height:1.5;text-decoration:none;white-space:normal;word-break:keep-all;}\n#photos .naver-blog-link b{font-family:Arial,sans-serif;font-size:20px;font-weight:900;color:#fff;}\n#photos .naver-blog-link:hover{background:#008e40;}\n#photos .naver-blog-link:focus-visible{outline:3px solid #264b37;outline-offset:4px;}\n@media(max-width:480px){#photos .naver-blog-link{padding:12px 20px;font-size:17px;}}\n\n\n\n/* calculator-mobile-fit */\n@media(max-width:600px){\n #ltcCalcRoot,.ltc-wrap,.ltc-grid,.ltc-left,.ltc-right,.ltc-card,.ltc-tabs,.ltc-chips,.ltc-hero,.ltc-cmp-list,.ltc-ledger{min-width:0;max-width:100%;}\n .ltc-wrap{padding:16px 12px !important;}\n .ltc-card{padding:20px 16px !important;}\n .ltc-card h3{display:block !important;font-size:21px !important;line-height:1.45;word-break:keep-all;}\n .ltc-card h3 small{display:block;margin-top:3px;font-size:14px !important;}\n .ltc-label{display:block !important;font-size:16px !important;}\n .ltc-label small{display:block;margin-top:2px;font-size:13px !important;}\n .ltc-tabs{grid-template-columns:repeat(3,minmax(0,1fr)) !important;gap:4px;padding:4px;}\n .ltc-tab{min-width:0;padding:9px 3px;font-size:15px !important;line-height:1.4;overflow-wrap:anywhere;}\n .ltc-tab small{font-size:12px !important;line-height:1.35;}\n .ltc-chips.c3{grid-template-columns:repeat(3,minmax(0,1fr)) !important;}\n .ltc-chips.c2{grid-template-columns:repeat(2,minmax(0,1fr)) !important;}\n .ltc-chip{min-width:0;padding:9px 4px;font-size:16px !important;overflow-wrap:anywhere;}\n .ltc-chip small{font-size:12px !important;}\n .ltc-step-row{display:grid !important;grid-template-columns:minmax(0,1fr) auto;gap:6px;}\n .ltc-step-info{min-width:0;}\n .ltc-step-info b{font-size:16px !important;line-height:1.4;}\n .ltc-step-info small{font-size:13px !important;line-height:1.4;}\n .ltc-stepper button{width:32px;height:40px;}\n .ltc-stepper input{width:36px;}\n .ltc-stepper span{padding-right:6px;font-size:14px;}\n .ltc-money{min-width:0;gap:8px;}\n .ltc-cmp-item{min-width:0;gap:8px;padding:10px;font-size:15px !important;}\n .ltc-cmp-item button{min-width:0;gap:8px;}\n .ltc-cmp-item span{min-width:0;overflow-wrap:anywhere;}\n .ltc-cmp-item>b,.ltc-cmp-item button>b{flex:none;white-space:nowrap;font-size:15px;}\n .ltc-result-col{position:static;}\n .ltc-hero{padding:20px 16px;min-width:0;}\n .ltc-hero-top{flex-wrap:wrap;}\n .ltc-hero-cond{min-width:0;overflow-wrap:anywhere;}\n .ltc-hero-amount{font-size:clamp(32px,9vw,44px) !important;overflow-wrap:anywhere;}\n .ltc-gauge-txt{gap:8px;flex-wrap:wrap;}\n .ltc-ledger li{min-width:0;align-items:flex-start;gap:7px;font-size:15px !important;}\n .ltc-ledger li span{min-width:0;overflow-wrap:anywhere;}\n .ltc-ledger li>b{flex:none;max-width:45%;text-align:right;overflow-wrap:anywhere;font-size:15px;}\n .ltc-ledger li.total{font-size:17px !important;}\n .ltc-ledger li.total b{font-size:20px !important;}\n .ltc-actions{grid-template-columns:repeat(2,minmax(0,1fr)) !important;}\n .ltc-actions .btn{min-width:0;padding:10px 6px;font-size:15px !important;white-space:nowrap;}\n}\n\n/* mobile-readability-and-photo-controls */\n.facility-carousel .facility-zoom-hint {\n  top: 10px; right: 10px; bottom: auto;\n  padding: 2px 7px; border: 0; border-radius: 0;\n  background: transparent; box-shadow: none;\n  color: #fff; font: 700 34px/1 sans-serif;\n  text-shadow: 0 1px 3px rgba(0,0,0,.8);\n}\n.facility-carousel-arrow,\n.facility-carousel-arrow:hover {\n  width: 36px; height: 52px; min-height: 52px;\n  border: 0; border-radius: 0; background: transparent;\n  box-shadow: none; color: #fff;\n  font: 400 44px/1 sans-serif;\n  text-shadow: 0 1px 4px rgba(0,0,0,.9);\n}\n@media(max-width:600px) {\n  .ltc-tabs .ltc-tab { overflow-wrap: normal; word-break: keep-all; }\n  #ltcGrade, #ltcBand { grid-template-columns: repeat(2,minmax(0,1fr)) !important; }\n  #ltcGrade .ltc-chip, #ltcBand .ltc-chip {\n    font-size: 15px !important; white-space: nowrap; overflow-wrap: normal;\n  }\n  #ltcBand .ltc-chip:last-child { grid-column: 1 / -1; }\n  .facility-inline .facility-photo-card h4 { word-break: keep-all; }\n}\n@media(max-width:380px) {\n  .top .wrap { gap: 8px; }\n  .logo { gap: 5px; }\n  .logo b { font-size: 17px !important; letter-spacing: -.5px; white-space: nowrap; }\n  .logo small { font-size: 10px !important; white-space: nowrap; }\n  .menu-btn { font-size: 15px; padding: 6px 9px; }\n}\n\n/* [2026-11-19 모바일 가독성 v2] 누르는 칸 44px · 잔글씨 정리 · 글자 대비 */\n.menu-btn { min-height: 44px; min-width: 48px; }\n.facility-zoom .facility-zoom-hint.is-circle { width: 36px; height: 36px; padding: 0; gap: 0; justify-content: center; border-radius: 50%; }\n.visit .tel { display: block; white-space: nowrap; font-size: clamp(26px, 8.4vw, 45.6px); }\n.sub-hero .crumb a { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; min-width: 44px; padding: 0 8px; margin: 0 -8px; }\n.geo-location a, .iv-src a { display: inline-flex; align-items: center; min-height: 44px; }\n.iv-summary summary { padding: 10px 0; min-height: 44px; box-sizing: border-box; }\n.btn.map-naver { background: #027a37; border-color: #027a37; color: #fff; }\n.btn.map-naver:hover { background: #01642b; border-color: #01642b; }\n#photos .naver-blog-link { background: var(--green-deep); border-color: var(--green-deep); }\n#photos .naver-blog-link:hover { background: var(--green); border-color: var(--green); }\n.ltc-chip[aria-pressed=\"true\"] small { color: #fff; }\n#ltcCalcRoot .ltc-stepper button { width: 44px; height: 44px; }\n#ltcCalcRoot .ltc-stepper input { width: 44px; height: 44px; }\n#ltcCalcRoot .ltc-stepper span { padding-right: 6px; }\n@media (max-width: 399px) { #ltcCalcRoot .ltc-step-row { grid-template-columns: minmax(0, 1fr); row-gap: 6px; } }\n@media (max-width: 480px) { .nw { white-space: normal; } }\n#ltcCalcRoot .ltc-tab { min-height: 44px; }\n#ltcCalcRoot .ltc-money input { min-height: 44px; }\n#ltcCalcRoot .ltc-switch::before { content: \"\"; position: absolute; inset: -8px -4px; }\n#ltcServiceCmp .ltc-cmp-item button small { font-size: 14px; }\n#ltcCalcRoot .ltc-ledger li.inl { grid-template-columns: auto minmax(0, 1fr) auto; }\n#ltcCalcRoot .ltc-ledger li.inl small { grid-column: 2; grid-row: 1; margin: 0; padding-left: 6px; }\n#ltcCalcRoot .ltc-ledger li.inl > b { grid-column: 3; }\n@media (max-width: 480px) {\n  #ltcCalcRoot .ltc-ledger li.inl { font-size: 14px !important; column-gap: 6px; }\n  #ltcCalcRoot .ltc-ledger li.inl > b { font-size: 14px; }\n  #ltcCalcRoot .ltc-ledger li.inl small { font-size: 13px; padding-left: 0; }\n}\n@media (max-width: 389px) {\n  #ltcCalcRoot .ltc-ledger li.inl.long { grid-template-columns: minmax(0, 1fr) auto; }\n  #ltcCalcRoot .ltc-ledger li.inl.long small { grid-column: 1 / -1; grid-row: 2; margin-top: 2px; }\n  #ltcCalcRoot .ltc-ledger li.inl.long > b { grid-column: 2; }\n}\n@media (max-width: 359px) {\n  #ltcCalcRoot .ltc-ledger li.inl { grid-template-columns: minmax(0, 1fr) auto; }\n  #ltcCalcRoot .ltc-ledger li.inl small { grid-column: 1 / -1; grid-row: 2; margin-top: 2px; }\n  #ltcCalcRoot .ltc-ledger li.inl > b { grid-column: 2; }\n}\n@media (max-width: 720px) {\n  .logo small { font-size: 11.5px !important; }\n  body .head p, body .consult .head p, body .fc p, body .org-head p, body .start p, body .steps p, body .consult .steps p, body .tile p, body .bc p, body .prog p, body .m-body p, body .day li p, body .fee-note, body .fee-list, body .sub-hero p, body .checks li, body .staff li { font-size: 17px !important; line-height: 1.75 !important; }\n  #ltcReduce .ltc-chip small { font-size: 13px !important; }\n  #ltcCalcRoot .ltc-label small, #ltcCalcRoot .ltc-step-info small { font-size: 14px !important; }\n}\n\n/* mobile-calc-width */\n@media(max-width:600px){.ltc-grid{grid-template-columns:minmax(0,1fr) !important;}.ltc-left,.ltc-right,.ltc-card{min-width:0;max-width:100%;}}\n/* mobile-money-width */\n@media(max-width:600px){.ltc-money-grid{grid-template-columns:minmax(0,1fr) !important;}.ltc-money{min-width:0;max-width:100%;}.ltc-money input{min-width:0;max-width:100%;}}\n/* mobile-guide-readability */\n@media(max-width:600px){\n .start h3{font-size:21px !important;line-height:1.35 !important;word-break:keep-all;}\n .start p{font-size:17px !important;line-height:1.6 !important;word-break:keep-all;}\n .start .consult-phrase{display:inline-block;white-space:nowrap;}\n .box .rows li{font-size:17px !important;line-height:1.6 !important;word-break:keep-all;}\n .box .rows li .holiday-note,.box .rows li .grade-label{display:inline-block;white-space:nowrap;font-size:clamp(14px,4.15vw,17px);}\n .faq summary{font-size:18px !important;line-height:1.5 !important;padding:16px 38px 16px 0 !important;word-break:keep-all;}\n .faq summary::before{width:28px;height:28px;font-size:16px;margin-right:9px;}\n .faq summary::after{top:13px;}\n .faq details p{font-size:16px !important;line-height:1.7 !important;padding:0 0 20px 37px !important;word-break:keep-all;}\n}\n/* mobile-copy-linebreaks */\n#calc-preview .calc-teaser h3>br,.month-card .m-body .meal-summary br{display:initial !important;}\n#calc-preview .calc-teaser h3 .cost-title-line{display:inline-block;white-space:nowrap;}\n.month-card .m-body .meal-summary{word-break:keep-all;}\n.tiles .tile.t1 svg,.tiles .tile.t1 svg *,#photos .bc svg,#photos .bc svg *{stroke:#fff !important;color:#fff !important;}\n@media(max-width:600px){\n#calc-preview .calc-teaser h3 .cost-title-line{font-size:clamp(22px,6.5vw,28.8px);}\n.month-card .m-body .meal-summary{font-size:clamp(15px,4.6vw,19px) !important;line-height:1.8 !important;white-space:nowrap;}\n#campVideo .head h2{font-size:clamp(19px,6vw,30px) !important;letter-spacing:-1px;white-space:nowrap;}\n}\n\n/* balanced-media-size */\n.refvideo .intro-video {width:100%;max-width:1100px;margin-left:auto;margin-right:auto;}\n.refvideo .intro-video .iv-frame {width:100%;max-width:1100px;margin-left:auto;margin-right:auto;aspect-ratio:16/9;}\n@media(min-width:1101px){.hero .slider {width:100%;max-width:1360px;margin-left:auto;margin-right:auto;aspect-ratio:16/9;}.refvideo .iv-poster::after{width:88px;height:88px;}}\n\n/* unified-design-system */\nbody{font-size:22px;line-height:1.85;}\nsection{padding-top:88px;padding-bottom:88px;}\n.head{max-width:none;margin-bottom:36px;}\n.head h2,.consult .head h2,.geo-summary .geo-summary-title{font-size:clamp(40px,3vw,56px);line-height:1.4;letter-spacing:-1px;margin-bottom:20px;}\n.head p,.consult .head p{font-size:23px;line-height:1.85;}\n.head[data-en]::before,.cost-eyebrow{font-size:29px;line-height:1.4;margin-bottom:12px;}\n.tiles,.blog,.monthly,.programs,.steps{gap:22px;align-items:stretch;}\n.tile,.bc,.month-card,.prog,.start,.box,.facility-inline .facility-photo-card{border-radius:16px;box-shadow:0 5px 18px rgba(35,40,30,.045);}\n.geo-summary,.calc-teaser{border-radius:24px;}\n.tile,.bc,.prog,.start{padding:30px;}\n.tile h3,.bc h3,.prog h3,.start h3,.box h3,.consult .steps h3{font-size:28px;line-height:1.5;letter-spacing:-.5px;}\n.tile p,.bc p,.prog p,.start p,.m-body p,.day li p,.consult .steps p{font-size:23px;line-height:1.85;}\n.bc span{font-size:20px;line-height:1.7;font-weight:700;}\n.rows{font-size:21px;line-height:1.8;}\n.btn{min-height:54px;padding:14px 26px;font-size:21px;font-weight:700;line-height:1.5;border-radius:999px;}\n.hero .btn.gold,.consult .btn.gold,.btn.gold{color:#1f281c;}\n.tiles .tile.t1 h3,.tiles .tile.t1 p,.blog .bc.t1 h3,.blog .bc.t1 p,.blog .bc.t1 span{color:#1f281c;}\n.tiles .tile.t1 svg,.blog .bc.t1 svg{stroke:#1f281c;}\n.tile p,.bc p{opacity:1;}\n.calc-teaser{background:#fff;background-image:none;color:var(--ink);border:1px solid var(--line);box-shadow:0 6px 24px rgba(35,40,30,.05);padding:40px;gap:32px;}\n.calc-teaser h3{font-size:34px;line-height:1.5;color:var(--ink);}\n.calc-teaser h3 em{color:var(--green-deep);}\n.calc-teaser p{font-size:22px;line-height:1.85;color:var(--ink-soft);}\n.calc-teaser .ct-badge{background:var(--gold-soft);color:#3d4935;font-size:17px;}\n.calc-teaser .ct-card{background:var(--gold-soft);border:1px solid var(--line);border-radius:16px;padding:28px;box-shadow:none;}\n.calc-teaser .ct-card small,.calc-teaser .ct-card .ct-sub,.calc-teaser .ct-card ul{font-size:18px;line-height:1.8;color:var(--ink-soft);}\n.calc-teaser .ct-card strong{font-size:40px;line-height:1.4;color:var(--green-deep);}\n.geo-summary .geo-dl>div{padding:22px;border-radius:16px;}\n.geo-summary .geo-dl dt{font-size:18px;}.geo-summary .geo-dl dd{font-size:23px;}.geo-summary .geo-dl dd small{font-size:18px;}\n.geo-summary .geo-summary-footer a{min-height:52px;border-radius:12px;font-size:18px;}\n.facility-inline .facility-photo-card h4{font-size:26px;line-height:1.5;padding:20px 22px;}\n.consult .steps li{padding:32px;border-radius:16px;min-height:310px;}\n.consult .steps .n{font-size:48px;line-height:1.25;margin-bottom:18px;}\n.consult .head p,.consult .steps p,.consult .cta p{color:#f0f2e9;}\n.consult .cta p{font-size:21px;line-height:1.8;}\n.faq summary{font-size:24px;line-height:1.6;padding-top:24px;padding-bottom:24px;}\n.faq details p{font-size:22px;line-height:1.9;}\n.iv-src,.iv-summary,.sub-hero .crumb{font-size:18px;line-height:1.8;}\n@media(min-width:1101px){\n .wrap{max-width:1800px;}\n .hero h1{font-size:clamp(48px,4vw,76px);line-height:1.4;}\n .tiles .tile{min-height:clamp(340px,22vw,420px);padding:32px;}\n .blog .bc{min-height:330px;padding:30px;}\n .tiles .tile h3,.blog .bc h3{font-size:30px;line-height:1.5;}\n .tiles .tile p,.blog .bc p{font-size:23px;line-height:1.85;}\n .blog .bc span{font-size:20px;}\n .tiles .tile svg{width:88px;height:88px;}.blog .bc svg{width:60px;height:60px;}\n}\n@media(max-width:860px){.calc-teaser{padding:28px;gap:24px;}.consult .steps li{min-height:0;}}\n@media(max-width:720px){\n body{font-size:19px;line-height:1.8;}section{padding-top:56px;padding-bottom:56px;}\n .head{margin-bottom:26px;}.head h2,.consult .head h2,.geo-summary .geo-summary-title{font-size:30px;line-height:1.5;letter-spacing:-.5px;}\n .head p,.consult .head p{font-size:19px;}.head[data-en]::before,.cost-eyebrow{font-size:25px;}\n .tile,.bc,.prog,.start,.consult .steps li{padding:24px;}\n .tile h3,.bc h3,.prog h3,.start h3,.box h3,.consult .steps h3{font-size:24px;}\n .tile p,.bc p,.prog p,.start p,.m-body p,.day li p,.consult .steps p,.rows{font-size:19px;line-height:1.85;}\n .tiles .tile,.blog .bc{min-height:270px;}.btn{font-size:18px;min-height:50px;padding:12px 22px;}\n .calc-teaser h3{font-size:27px;}.calc-teaser p{font-size:19px;}.calc-teaser .ct-card strong{font-size:34px;}\n .geo-summary .geo-dl dd{font-size:21px;}.geo-summary .geo-dl dd small{font-size:17px;}.facility-inline .facility-photo-card h4{font-size:23px;}\n .faq summary{font-size:21px;}.faq details p{font-size:19px;}.iv-src,.iv-summary{font-size:17px;}\n}\n\n/* centered-content-width */\n@media(min-width:1101px){\n .wrap {width:calc(100% - 64px);max-width:1240px;padding-left:0;padding-right:0;margin-left:auto;margin-right:auto;}\n .hero .wrap {max-width:1360px;}\n .hero-text {max-width:1240px;}\n .top .wrap {width:calc(100% - 48px);max-width:none;padding-left:0;padding-right:0;}\n}\n\n/* compact-hero-image */\n.hero .slider {width:100%;max-width:1100px;margin-left:auto;margin-right:auto;aspect-ratio:16/9;}\n@media(min-width:1101px){.hero .wrap{max-width:1240px;}.hero .slider{width:100%;max-width:1100px;}}\n@media(max-width:720px){.hero .slider{width:100%;max-width:1100px;margin-left:auto;margin-right:auto;aspect-ratio:4/3;}}\n\n/* compact-official-video */\n.refvideo .intro-video,.refvideo .intro-video .iv-frame{width:100%;max-width:1100px;margin-left:auto;margin-right:auto;}\n\n/* accessible-primary-buttons */\n:root{--action-bg:#8b6d43;}\nhtml[data-theme=\"warm\"]{--action-bg:#8b6d43;}\nhtml[data-theme=\"sage\"]{--action-bg:#365B49;}\nhtml[data-theme=\"honey\"]{--action-bg:#9A6B24;}\nhtml[data-theme=\"teal\"]{--action-bg:#235A5C;}\nhtml[data-theme=\"lavender\"]{--action-bg:#5E4973;}\nhtml[data-theme=\"terracotta\"]{--action-bg:#96462E;}\nhtml[data-theme=\"citrus\"]{--action-bg:#A64424;}\nhtml[data-theme=\"royal\"]{--action-bg:#1F3A68;}\n.btn.gold,.hero .btn.gold,.consult .btn.gold{background:var(--action-bg);border-color:var(--action-bg);color:#fff;font-weight:700;text-shadow:none;opacity:1;}\n.hero .btn.gold{border:2px solid #d8c590;box-shadow:0 4px 14px rgba(0,0,0,.14);}\n.btn.gold:hover{box-shadow:0 5px 16px rgba(0,0,0,.18);color:#fff;}\n.btn.gold:focus-visible{outline:3px solid #c9ac64;outline-offset:4px;}\n\n/* center-logo-and-clear-calculator-link */\n.logo .center-logo-image {display:block;width:auto;max-width:140px;height:76px;object-fit:contain;flex-shrink:0;}\n.hero .hero-calculator-link{font-weight:800;text-shadow:none;box-shadow:0 5px 18px rgba(0,0,0,.18);}\n.hero .hero-calculator-link:hover{box-shadow:0 6px 22px rgba(0,0,0,.25);}\n.hero .hero-calculator-link:focus-visible{outline:3px solid #fff;outline-offset:5px;}\n@media(max-width:720px){.logo .center-logo-image{max-width:88px;height:48px;}}\n\n.facility-zoom{position:relative;display:block;width:100%;padding:0;border:0;background:transparent;cursor:zoom-in;color:inherit;}\n.facility-zoom:focus-visible{outline:4px solid var(--slate);outline-offset:-4px;}\n.facility-zoom-hint{position:absolute;right:12px;bottom:12px;padding:5px 10px;border-radius:6px;background:rgba(0,0,0,.72);color:white;font:600 16px/1.5 sans-serif;}\n.facility-lightbox{width:min(1320px,94vw);max-width:94vw;max-height:94dvh;padding:16px;border:0;border-radius:14px;background:#fff;color:#222;box-shadow:0 20px 80px #0008;}\n.facility-lightbox::backdrop{background:rgba(0,0,0,.82);}\n.facility-lightbox-bar{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:12px;font-size:20px;}\n.facility-lightbox-close{padding:8px 18px;min-height:44px;border:1px solid #bbb;border-radius:8px;background:#fff;color:#222;font:700 18px/1.4 sans-serif;cursor:pointer;}\n.facility-lightbox-image{display:block;width:100%;max-height:calc(90dvh - 90px);object-fit:contain;}\n@media(max-width:600px){.facility-lightbox{padding:10px;}.facility-lightbox-bar{font-size:18px;}}\n\n.facility-thumbnails{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:8px 8px 0;}\n.facility-thumbnails .facility-photo{aspect-ratio:4/3;border-radius:6px;}\n.facility-gallery-nav{display:flex;align-items:center;justify-content:center;gap:18px;margin-top:12px;}\n.facility-gallery-nav[hidden]{display:none;}\n.facility-gallery-note{font-size:17px;line-height:1.6;color:var(--ink-soft);margin:0 0 20px;}\n.facility-gallery-nav button{min-width:64px;min-height:44px;padding:8px 14px;background:#fff;color:#222;border:1px solid #bbb;border-radius:8px;font:600 18px/1.4 sans-serif;cursor:pointer;}\n.facility-gallery-count{font:600 18px/1.4 sans-serif;}\n.facility-lightbox-image{max-height:calc(90dvh - 155px);}\n\n/* Facility photos: one large slide with arrows and dots. */\n.facility-carousel{position:relative;isolation:isolate;touch-action:pan-y;background:#f4f1e9;}\n.facility-slide[hidden]{display:none!important;}\n.facility-carousel .facility-photo{width:100%;aspect-ratio:4/3;object-fit:cover;}\n.facility-carousel .facility-zoom-hint{top:10px;right:10px;bottom:auto;font-size:14px;pointer-events:none;}\n.facility-carousel-arrow{position:absolute;z-index:2;top:50%;transform:translateY(-50%);width:44px;height:44px;min-height:44px;padding:0;border:1px solid #fff;border-radius:50%;background:rgba(0,0,0,.42);color:#fff;font:400 36px/1 sans-serif;cursor:pointer;box-shadow:0 2px 7px #0003;}\n.facility-carousel-prev{left:10px;}.facility-carousel-next{right:10px;}\n.facility-carousel-arrow:hover{background:rgba(0,0,0,.7);}\n.facility-carousel button:focus-visible{outline:3px solid #fff;outline-offset:-4px;}\n/* [2026-11-19] 사진 넘기기 화살표: 어두운 반투명 원·테두리 없이 화살표 글자만(흰색 + 은은한 그림자로 밝은 사진에서도 보이게) */\n.facility-carousel-arrow,.facility-carousel-arrow:hover{width:44px;height:64px;min-height:44px;border:0;border-radius:0;background:transparent;box-shadow:none;color:#fff;font:400 48px/1 sans-serif;text-shadow:0 1px 3px rgba(0,0,0,.85),0 0 10px rgba(0,0,0,.5);}\n.facility-carousel-arrow:hover{transform:translateY(-50%) scale(1.15);}\n/* [2026-11-19] 사진 확대 표시: 흰 알약 + 확대 아이콘 + 글자(사진 오른쪽 아래). 검은 판 없이 또렷하게 */\n.facility-zoom .facility-zoom-hint{position:absolute;top:auto;bottom:10px;right:10px;left:auto;display:inline-flex;align-items:center;gap:6px;width:auto;height:32px;padding:0 13px 0 10px;border:1px solid rgba(0,0,0,.12);border-radius:999px;background:rgba(255,255,255,.96);color:#2a2a2a;font:600 14px/1 \"Noto Sans KR\",sans-serif;text-shadow:none;box-shadow:none;white-space:nowrap;pointer-events:none;}\n.facility-zoom .facility-zoom-hint::before{content:\"\";position:static;inset:auto;flex:none;width:16px;height:16px;background:center/contain no-repeat url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%232a2a2a' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5'/%3E%3C/svg%3E\");filter:none;}";
  const js = "(function () {\n  // CENTER: 이 페이지의 센터 정보 (제작기가 채워 줍니다)\n  var C = window.CENTER || {};\n\n  // CENTER_CONFIG.theme 값 하나만 바꾸면 4색 멀티 배색(t1~t4)과 딥 럭셔리 히어로 조명까지 전체가 함께 바뀝니다.\n  var LUXURY_THEMES = {\n    warm: {\n      name: '햇살마루', accent: '#82663f', soft: '#f4ede1', second: '#3e5638', third: '#4b3a28', dark: '#2f2b25', deep: '#2f4029',\n      light: '#e2c899', sand: '#c9b596', bg: '#fbf8f2', line: '#e3d9c7', inkSoft: '#655e52', inkFaint: '#70695e',\n      hero1: '#4a4232', hero2: '#33392a', hero3: '#2a3324', glow: 'rgba(226,200,153,.5)', shade: 'rgba(62,86,56,.75)'\n    },\n    sage: {\n      name: '편백정원', accent: '#365B49', soft: '#EBF0E6', second: '#896b3e', third: '#5F6F52', dark: '#242A2B', deep: '#223A2E',\n      light: '#E2C99B', sand: '#C4D9BE', bg: '#F7F9F4', line: '#DCE3D5', inkSoft: '#4E5952', inkFaint: '#646d67',\n      hero1: '#2C4236', hero2: '#23352B', hero3: '#1A2820', glow: 'rgba(226,201,155,.48)', shade: 'rgba(156,122,71,.55)'\n    },\n    teal: {\n      name: '맑은활력', accent: '#235A5C', soft: '#E3F0EE', second: '#8d6a3d', third: '#4F706B', dark: '#222A2B', deep: '#173B3D',\n      light: '#E4CE9E', sand: '#AAD8D1', bg: '#F5FAF9', line: '#D4E5E2', inkSoft: '#495B5C', inkFaint: '#5d6d6e',\n      hero1: '#20484A', hero2: '#1A3A3C', hero3: '#122A2C', glow: 'rgba(228,206,158,.48)', shade: 'rgba(35,90,92,.75)'\n    },\n    lavender: {\n      name: '고운선율', accent: '#5E4973', soft: '#EFE8F4', second: '#8b6a4c', third: '#786582', dark: '#28232E', deep: '#2E223B',\n      light: '#E6CEAA', sand: '#D9C5E6', bg: '#FAF7FC', line: '#E2D8EA', inkSoft: '#595063', inkFaint: '#6d6576',\n      hero1: '#3F304E', hero2: '#32263F', hero3: '#241B2E', glow: 'rgba(230,206,170,.48)', shade: 'rgba(158,120,86,.55)'\n    },\n    honey: {\n      name: '웃음가득', accent: '#8e6221', soft: '#F7EED8', second: '#3B573A', third: '#7E5E3D', dark: '#2C261D', deep: '#2D3A27',\n      light: '#F2D68B', sand: '#E8C97A', bg: '#FFFCF4', line: '#E8DEC6', inkSoft: '#615646', inkFaint: '#736859',\n      hero1: '#4E3B1E', hero2: '#383322', hero3: '#26291D', glow: 'rgba(242,214,139,.52)', shade: 'rgba(59,87,58,.72)'\n    },\n    terracotta: {\n      name: '정성한끼', accent: '#96462E', soft: '#F7E7DD', second: '#3D5A47', third: '#7D5D4B', dark: '#2D231F', deep: '#36231D',\n      light: '#ECC79E', sand: '#EABDA8', bg: '#FFF9F5', line: '#E8D7CC', inkSoft: '#635149', inkFaint: '#75645d',\n      hero1: '#4F2D22', hero2: '#3B2722', hero3: '#291E1B', glow: 'rgba(236,199,158,.5)', shade: 'rgba(61,90,71,.65)'\n    },\n    citrus: {\n      name: '감귤햇살', accent: '#A64424', soft: '#FCECD8', second: '#2E5848', third: '#8C6A3D', dark: '#2B241E', deep: '#233A30',\n      light: '#F4D88A', sand: '#F0CB85', bg: '#FFFDF7', line: '#EADECE', inkSoft: '#5E5347', inkFaint: '#73685d',\n      hero1: '#4C2C1E', hero2: '#353224', hero3: '#222A22', glow: 'rgba(244,216,138,.54)', shade: 'rgba(46,88,72,.72)'\n    },\n    royal: {\n      name: '단청품격', accent: '#1F3A68', soft: '#EFECE2', second: '#8e6b38', third: '#48635E', dark: '#22262E', deep: '#162747',\n      light: '#EDD196', sand: '#DFC48C', bg: '#FBF9F4', line: '#E2DDD0', inkSoft: '#4E535E', inkFaint: '#646873',\n      hero1: '#1E3258', hero2: '#1C2A44', hero3: '#141E30', glow: 'rgba(237,209,150,.52)', shade: 'rgba(173,131,68,.55)'\n    }\n  };\n\n  function applyCenterTheme(themeId) {\n    var key = (themeId && LUXURY_THEMES[themeId]) ? themeId : 'warm';\n    var T = LUXURY_THEMES[key];\n    var root = document.documentElement;\n    root.setAttribute('data-theme', key);\n    root.style.setProperty('--gold', T.accent);\n    root.style.setProperty('--gold-soft', T.soft);\n    root.style.setProperty('--slate', T.second);\n    root.style.setProperty('--taupe', T.third);\n    root.style.setProperty('--char', T.dark);\n    root.style.setProperty('--teal', T.second);\n    root.style.setProperty('--green', T.second);\n    root.style.setProperty('--green-deep', T.deep);\n    root.style.setProperty('--sand', T.sand);\n    root.style.setProperty('--light-gold', T.light);\n    root.style.setProperty('--ink', T.dark);\n    root.style.setProperty('--ink-soft', T.inkSoft);\n    root.style.setProperty('--ink-faint', T.inkFaint);\n    root.style.setProperty('--bg', T.bg);\n    root.style.setProperty('--soft', T.soft);\n    root.style.setProperty('--line', T.line);\n    root.style.setProperty('--hero-glow', T.glow);\n    root.style.setProperty('--hero-shade', T.shade);\n    root.style.setProperty('--hero-1', T.hero1);\n    root.style.setProperty('--hero-2', T.hero2);\n    root.style.setProperty('--hero-3', T.hero3);\n    root.style.setProperty('--footer', '#1E2425');\n    var logoCircle = document.querySelector('.logo svg circle');\n    var logoG = document.querySelector('.logo svg g');\n    if (logoCircle) logoCircle.setAttribute('fill', T.accent);\n    if (logoG) logoG.setAttribute('stroke', T.accent);\n    return T;\n  }\n  window.applyCenterTheme = applyCenterTheme;\n  window.LUXURY_THEMES = LUXURY_THEMES;\n  var initCfg = window.CENTER_CONFIG || {};\n  applyCenterTheme(initCfg.theme || (window.CENTER && window.CENTER.theme) || 'warm');\n\n\n  // 안내창 띄우기\n  var toastTimer;\n  function showToast(html) {\n    var toast = document.getElementById('toast');\n    toast.innerHTML = html;\n    toast.classList.add('show');\n    clearTimeout(toastTimer);\n    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 3500);\n  }\n\n  // 전화 버튼: 휴대폰은 바로 전화 연결, PC는 전화가 걸리지 않으므로 번호를 크게 보여주고 복사\n  var isPC = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;\n  if (isPC) {\n    document.addEventListener('click', function (e) {\n      var a = e.target.closest('a[href^=\"tel:\"]');\n      if (!a) return;\n      e.preventDefault();\n      var d = a.getAttribute('href').replace(/\\D/g, '');\n      var num = C.telText || d;\n      function show(copied) {\n        showToast('<b> ' + num + '</b>' + (copied ? '번호를 복사했어요. 휴대폰이나 전화기로 걸어 주세요.' : '휴대폰이나 전화기로 걸어 주세요.'));\n      }\n      try {\n        navigator.clipboard.writeText(num).then(function () { show(true); }, function () { show(false); });\n      } catch (err) { show(false); }\n    });\n    var tm = document.getElementById('tmapBtn');\n    if (tm) tm.addEventListener('click', function (e) {\n      e.preventDefault();\n      showToast('<b>T맵은 휴대폰에서 열려요</b>휴대폰으로 이 페이지를 열어 눌러 주세요. PC에서는 네이버 지도를 이용해 주세요.');\n    });\n  }\n\n  // 사진(일러스트) 슬라이드: 5초마다 자동으로 넘어가고, 화살표·점·손가락으로 넘겨 볼 수 있음\n  (function () {\n    var box = document.getElementById('slider');\n    if (!box) return;\n    var slides = box.querySelectorAll('.slide');\n    var dotsBox = box.querySelector('.s-dots');\n    var cur = 0, timer;\n    var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;\n    slides.forEach(function (s, i) {\n      var d = document.createElement('button');\n      d.type = 'button';\n      d.setAttribute('aria-label', (i + 1) + '번째 그림 보기');\n      d.addEventListener('click', function () { go(i); restart(); });\n      dotsBox.appendChild(d);\n    });\n    var dots = dotsBox.querySelectorAll('button');\n    function go(n) {\n      cur = (n + slides.length) % slides.length;\n      slides.forEach(function (s, i) { s.classList.toggle('on', i === cur); });\n      dots.forEach(function (d, i) { d.setAttribute('aria-current', i === cur ? 'true' : 'false'); });\n    }\n    function restart() {\n      clearInterval(timer);\n      if (!still) timer = setInterval(function () { go(cur + 1); }, 5000);\n    }\n    box.querySelector('.s-prev').addEventListener('click', function () { go(cur - 1); restart(); });\n    box.querySelector('.s-next').addEventListener('click', function () { go(cur + 1); restart(); });\n    box.addEventListener('mouseenter', function () { clearInterval(timer); });\n    box.addEventListener('mouseleave', restart);\n    var x0 = null;\n    box.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });\n    box.addEventListener('touchend', function (e) {\n      if (x0 === null) return;\n      var dx = e.changedTouches[0].clientX - x0;\n      if (Math.abs(dx) > 40) { go(cur + (dx < 0 ? 1 : -1)); restart(); }\n      x0 = null;\n    });\n    go(0);\n    restart();\n  })();\n\n  // 상단 메뉴: 내리면 그림자, 휴대폰에서는 '메뉴' 버튼으로 펼치기\n  (function () {\n    var top = document.getElementById('top');\n    var btn = document.getElementById('menuBtn');\n    window.addEventListener('scroll', function () { top.classList.toggle('shadow', window.scrollY > 10); }, { passive: true });\n    btn.addEventListener('click', function () {\n      var open = !top.classList.contains('open');\n      top.classList.toggle('open', open);\n      btn.setAttribute('aria-expanded', open ? 'true' : 'false');\n      btn.textContent = open ? '닫기' : '메뉴';\n    });\n    document.getElementById('nav').addEventListener('click', function (e) {\n      if (e.target.tagName === 'A' && top.classList.contains('open')) btn.click();\n    });\n  })();\n\n  // 스크롤하면 천천히 나타나기\n  (function () {\n    var items = document.querySelectorAll('.rv');\n    if (!('IntersectionObserver' in window)) { items.forEach(function (el) { el.classList.add('in'); }); return; }\n    var io = new IntersectionObserver(function (entries) {\n      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });\n    }, { rootMargin: '0px 0px -8% 0px' });\n    items.forEach(function (el) { io.observe(el); });\n  })();\n\n  // 주소 복사 버튼\n  var copyBtn = document.getElementById('copyBtn');\n  if (copyBtn) copyBtn.addEventListener('click', function () {\n    var btn = this;\n    function done(ok) { btn.textContent = ok ? '복사했어요 ' : '주소를 길게 눌러 복사해 주세요'; setTimeout(function () { btn.textContent = '주소 복사'; }, 2000); }\n    try {\n      navigator.clipboard.writeText(C.addr || '').then(function () { done(true); }, function () { done(false); });\n    } catch (e) { done(false); }\n  });\n\n  // 유튜브 영상 자리: data-youtube에 주소가 있을 때만 보여줌 (공식 채널 영상만 퍼가기)\n  // 처음에는 영상 표지 그림을 보여주고, 누르면 그 자리에서 재생\n  document.querySelectorAll('.intro-video').forEach(function (box) {\n    var url = (box.dataset.youtube || '').trim();\n    var m = url.match(/(?:youtu\\.be\\/|v=|shorts\\/|embed\\/)([\\w-]{11})/);\n    if (!m) return;\n    var id = m[1];\n    var h3 = box.querySelector('h3');\n    var title = h3 ? h3.textContent : (box.dataset.title || '참고 영상');\n    var frame = box.querySelector('.iv-frame');\n    var poster = document.createElement('button');\n    poster.type = 'button';\n    poster.className = 'iv-poster';\n    poster.setAttribute('aria-label', title + ' 재생');\n    var img = new Image();\n    img.alt = '';\n    img.decoding = 'async';\n    img.src = 'https://i.ytimg.com/vi/' + id + '/maxresdefault.jpg';\n    img.onload = function () { if (img.naturalWidth < 200) img.src = 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg'; };\n    img.onerror = function () { img.onerror = null; img.src = 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg'; };\n    poster.appendChild(img);\n    poster.addEventListener('click', function () {\n      // 내 컴퓨터에서 파일을 직접 열면 유튜브가 재생을 막으므로 유튜브 사이트에서 열기\n      if (location.protocol === 'file:') { window.open('https://www.youtube.com/watch?v=' + id, '_blank'); return; }\n      var f = document.createElement('iframe');\n      f.src = 'https://www.youtube.com/embed/' + id + '?autoplay=1&rel=0&playsinline=1';\n      f.title = title;\n      f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';\n      f.referrerPolicy = 'strict-origin-when-cross-origin';\n      f.allowFullscreen = true;\n      poster.replaceWith(f);\n    });\n    frame.appendChild(poster);\n    box.hidden = false;\n  });\n\n  // 미리보기(iframe srcdoc) 안에서 다른 페이지(about.html 등) 링크를 눌렀을 때 부모 제작기 탭을 전환\n  document.addEventListener('click', function (e) {\n    var a = e.target.closest('a[href]');\n    if (!a) return;\n    var href = a.getAttribute('href') || '';\n    var m = href.match(/^(index|about|program|guide|contact)\\.html(#.*)?$/);\n    if (m && window.parent && window.parent !== window && window.parent.__switchPreviewPage) {\n      e.preventDefault();\n      window.parent.__switchPreviewPage(m[1] + '.html', m[2] || '');\n    }\n  });\n\n\n  // ===== [2.0 추가] 장기요양 본인부담금 계산기 (guide.html 내장형) =====\n  (function () {\n    var root = document.getElementById('ltcCalcRoot');\n    if (!root) return;\n    var C = window.CENTER || {};\n\n    // 기본 수가 데이터 (2026 보건복지부 고시 기준 + 센터 커스텀 수가 연동)\n    var customDay8 = Array.isArray(C.fees) && C.fees.length === 6 && C.fees.every(Boolean) ? C.fees : [69730, 64590, 59640, 58010, 56360, 56360];\n    var DATA = {\n      year: 2026,\n      weeksPerMonth: 4.35,\n      limitBoost: { minDays: 15, minBand: 2, pct: { '1': 10, '2': 10, '3': 20, '4': 20, '5': 20, 'c': 0 } },\n      grades: [\n        { key: '1', name: '1등급',        limit: 2512900, fac: '1', day: [41820, 56060, customDay8[0]] },\n        { key: '2', name: '2등급',        limit: 2331200, fac: '2', day: [38720, 51930, customDay8[1]] },\n        { key: '3', name: '3등급',        limit: 1528200, fac: '3', day: [35740, 47940, customDay8[2]] },\n        { key: '4', name: '4등급',        limit: 1409700, fac: '3', day: [34120, 46300, customDay8[3]] },\n        { key: '5', name: '5등급',        limit: 1208900, fac: '3', day: [32490, 44650, customDay8[4]] },\n        { key: 'c', name: '인지지원등급', limit: 676320,  fac: null, day: [32490, 44650, customDay8[5]] }\n      ],\n      bands: ['3~6시간', '6~8시간', '8~10시간'],\n      visit: { 150: 50640, 180: 57020, 210: 63530, 240: 70080 },\n      visitLongFrom: 210, visitLongGrades: ['1', '2'],\n      facility: {\n        home:  { '1': 93070, '2': 86340, '3': 81540 },\n        group: { '1': 74590, '2': 69210, '3': 63800 }\n      },\n      rates: {\n        general: { label: '일반',          home: 15, fac: 20 },\n        r40:     { label: '감경 40%',      home: 9,  fac: 12 },\n        r60:     { label: '감경 60%',      home: 6,  fac: 8 },\n        free:    { label: '의료급여', home: 0,  fac: 0 }\n      },\n      surcharge: { dayHoliday: 30, visitSun: 30, visitHoliday: 50 },\n      defaults: {\n        meal: C.mealFee ?? 3500,\n        snack: C.snackFee ?? 1500,\n        mealType: C.hasDinner ? 'both' : 'lunch'\n      }\n    };\n\n    var snapshot = C.rateSnapshot;\n    if(snapshot) {\n      DATA.year=snapshot.year;\n      DATA.grades.forEach(function(g,i){g.limit=snapshot.limits[i];g.day=snapshot.day?snapshot.day[i].slice():g.day;g.day[2]=customDay8[i];});\n      if(snapshot.visit) DATA.visit=snapshot.visit;\n      if(snapshot.knownVisit180) DATA.visit[180]=snapshot.knownVisit180;\n      if(snapshot.facility) DATA.facility=snapshot.facility;\n      if(snapshot.surcharge) DATA.surcharge=snapshot.surcharge;\n    }\n    var partialYear = DATA.year !== 2026 && !(snapshot && snapshot.day && snapshot.visit && snapshot.facility);\n    var D2027 = (function () {\n      var d = JSON.parse(JSON.stringify(DATA));\n      var lim = { '1': 2891400, '2': 2682300, '3': 1586300, '4': 1462000, '5': 1254900, 'c': 700200 };\n      var day8 = { '1': 72190, '2': 66870, '3': 61750, '4': 60060, '5': 58350, 'c': 58350 };\n      d.grades.forEach(function (g) { g.limit = lim[g.key]; g.day[2] = day8[g.key]; });\n      d.visit[180] = 59190; d.visit[240] = 72740;\n      d.facility.home = { '1': 96380, '2': 89410, '3': 84440 };\n      return d;\n    })();\n\n    var MODE_NAMES = ['주야간보호', '방문요양', '요양원'];\n    var ROOM_NAMES = { multi: '다인실', double: '2인실', single: '1인실' };\n    var FTYPE_NAMES = { home: '요양원', group: '공동생활가정' };\n\n    function fmt(n) { return String(Math.round(n)).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ','); }\n    function won(n) { return fmt(n) + '원'; }\n    function num(v) { v = Math.floor(Number(String(v).replace(/[^\\d]/g, '')) || 0); return v > 0 ? v : 0; }\n    function clamp(v, lo, hi) { v = num(v); return Math.max(lo, Math.min(hi, v)); }\n    function gradeOf(k, D) { D = D || DATA; for (var i = 0; i < D.grades.length; i++) if (D.grades[i].key === String(k)) return D.grades[i]; return D.grades[3]; }\n    function rateOf(k, D) { D = D || DATA; return D.rates[k] || D.rates.general; }\n    function minLabel(m) { return m < 60 ? m + '분' : Math.floor(m / 60) + '시간' + (m % 60 ? ' ' + (m % 60) + '분' : ''); }\n    function surUnit(unit, pct) { return Math.floor(unit * (100 + pct) / 100); }\n    function visitAllowed(gKey, m, D) { D = D || DATA; return m < D.visitLongFrom || D.visitLongGrades.indexOf(String(gKey)) >= 0; }\n\n    function makeDefaultState() {\n      return {\n        mode: 0, grade: '4', reduce: 'general',\n        day: {\n          band: 2, wk: 22, hol: 0, meal: DATA.defaults.mealType, mealPrice: DATA.defaults.meal, snack: DATA.defaults.snack, boost: true,\n          withVisit: false, visit: { minutes: 180, wk: 8, sun: 0, hol: 0 }\n        },\n        visit: { minutes: 180, wk: 22, sun: 0, hol: 0 },\n        fac: { type: 'home', days: 30, room: 'multi', roomExtra: 0, meal: DATA.defaults.meal, snack: DATA.defaults.snack, beauty: 0 }\n      };\n    }\n    var S = makeDefaultState();\n\n    function finishHome(G, L, ratePct) {\n      var covered = Math.min(G, L);\n      return { burden: Math.floor(covered * ratePct / 1000) * 10, excess: Math.max(0, G - L), covered: covered };\n    }\n    function visitPart(gKey, v, D) {\n      var m = visitAllowed(gKey, v.minutes, D) ? v.minutes : 180;\n      var unit = D.visit[m];\n      var sunU = surUnit(unit, D.surcharge.visitSun), holU = surUnit(unit, D.surcharge.visitHoliday);\n      var wk = clamp(v.wk, 0, 31), sun = clamp(v.sun, 0, 31), hol = clamp(v.hol, 0, 31);\n      return { minutes: m, fixed: m !== v.minutes, unit: unit, sunU: sunU, holU: holU, wk: wk, sun: sun, hol: hol,\n        G: wk * unit + sun * sunU + hol * holU, count: wk + sun + hol };\n    }\n    function calcDay(S, D) {\n      D = D || DATA;\n      var g = gradeOf(S.grade, D), d = S.day, rate = rateOf(S.reduce, D);\n      var wk = clamp(d.wk, 0, 31), hol = clamp(d.hol, 0, 31), days = wk + hol;\n      var wkU = g.day[d.band], holU = surUnit(wkU, D.surcharge.dayHoliday);\n      var dayG = wk * wkU + hol * holU, G = dayG;\n      var rows = [];\n      rows.push({ label: '이용일수 ' + wk + '일', sub: D.bands[d.band] + ' · 하루 ' + won(wkU), amt: wk * wkU, cls: wk ? '' : 'zero' });\n      if (hol) rows.push({ label: '공휴일 ' + hol + '일', sub: '30% 가산 · 하루 ' + won(holU), amt: hol * holU });\n      var vis = null;\n      if (d.withVisit && g.key !== 'c') {\n        vis = visitPart(g.key, d.visit, D);\n        G += vis.G;\n        rows.push({ k: 'sum', label: '주야간보호 소계', amt: dayG });\n        rows.push({ label: '+ 방문요양 ' + vis.count + '회', sub: minLabel(vis.minutes) + ' · 1회 ' + won(vis.unit), amt: vis.G, cls: vis.count ? '' : 'zero' });\n      }\n      var boostPct = D.limitBoost.pct[g.key] || 0;\n      var longDays = d.band >= D.limitBoost.minBand ? days : 0;\n      var boost = (d.boost !== false && boostPct && longDays >= D.limitBoost.minDays) ? Math.floor(g.limit * boostPct / 100) : 0;\n      var L = g.limit + boost;\n      var fin = finishHome(G, L, rate.home);\n      var mealN = d.meal === 'both' ? 2 : 1;\n      var mealCost = num(d.mealPrice) * mealN * days, snackCost = num(d.snack) * days, nonCov = mealCost + snackCost;\n      rows.push({ k: 'sum', label: '급여비용', amt: G });\n      rows.push({ label: '월 한도액 (' + g.name + ')', amt: g.limit });\n      if (boost) rows.push({ label: '한도액 증액 (+' + boostPct + '%)', sub: '월 15일 이상 · 하루 8시간 이상', amt: boost });\n      rows.push({ label: '급여 본인부담 (' + rate.home + '%)', amt: fin.burden, cls: fin.burden ? '' : 'zero' });\n      if (fin.excess) rows.push({ label: '한도 초과분 (전액 본인부담)', amt: fin.excess, cls: 'over' });\n      rows.push({ k: 'head', label: '비급여 항목' });\n      rows.push({ label: (mealN === 2 ? '점심·저녁 ' : '점심 ') + won(num(d.mealPrice) * mealN), sub: '× ' + days + '일', amt: mealCost, cls: mealCost ? '' : 'zero' });\n      rows.push({ label: '간식비 ' + won(num(d.snack)), sub: '× ' + days + '일', amt: snackCost, cls: snackCost ? '' : 'zero' });\n      var total = fin.burden + fin.excess + nonCov;\n      rows.push({ k: 'total', label: '본인 부담', amt: total });\n      return {\n        mode: 0, g: g, G: G, L: L, boost: boost, boostPct: boostPct, dayG: dayG, vis: vis, rate: rate,\n        burden: fin.burden, excess: fin.excess, nonCov: nonCov, total: total, rows: rows, days: days,\n        cond: g.name + ' · ' + rate.label + ' · ' + D.bands[d.band] + ' · ' + days + '일' + (vis ? ' + 방문요양 ' + vis.count + '회' : ''),\n        parts: '급여 본인부담 ' + won(fin.burden) + (fin.excess ? ' + 한도초과 ' + won(fin.excess) : '') + ' + 식비·간식 ' + won(nonCov)\n      };\n    }\n    function calcVisit(S, D) {\n      D = D || DATA;\n      var g = gradeOf(S.grade, D), rate = rateOf(S.reduce, D);\n      if (g.key === 'c') return { mode: 1, unavailable: '인지지원등급은 방문요양을 이용할 수 없습니다.' };\n      var vc = visitPart(g.key, S.visit, D), G = vc.G;\n      var fin = finishHome(G, g.limit, rate.home);\n      var rows = [\n        { label: '이용일수 ' + vc.wk + '일', sub: minLabel(vc.minutes) + ' · 1회 ' + won(vc.unit), amt: vc.wk * vc.unit, cls: vc.wk ? '' : 'zero' }\n      ];\n      if (vc.sun) rows.push({ label: '일요일 ' + vc.sun + '일 (+30%)', amt: vc.sun * vc.sunU });\n      if (vc.hol) rows.push({ label: '공휴일 ' + vc.hol + '일 (+' + D.surcharge.visitHoliday + '%)', amt: vc.hol * vc.holU });\n      rows.push({ k: 'sum', label: '급여비용', amt: G });\n      rows.push({ label: '월 한도액 (' + g.name + ')', amt: g.limit });\n      rows.push({ label: '급여 본인부담 (' + rate.home + '%)', amt: fin.burden });\n      if (fin.excess) rows.push({ label: '한도 초과분', amt: fin.excess, cls: 'over' });\n      var total = fin.burden + fin.excess;\n      rows.push({ k: 'total', label: '본인 부담', amt: total });\n      return {\n        mode: 1, g: g, G: G, L: g.limit, boost: 0, rate: rate, burden: fin.burden, excess: fin.excess, nonCov: 0, total: total, rows: rows, days: vc.count,\n        cond: g.name + ' · ' + rate.label + ' · ' + minLabel(vc.minutes) + ' · ' + vc.count + '일',\n        parts: '급여 본인부담 ' + won(fin.burden) + (fin.excess ? ' + 한도초과 ' + won(fin.excess) : '')\n      };\n    }\n    function calcFac(S, D) {\n      D = D || DATA;\n      var g = gradeOf(S.grade, D), f = S.fac, rate = rateOf(S.reduce, D);\n      if (!g.fac) return { mode: 2, unavailable: '인지지원등급은 시설(요양원) 입소 대상이 아닙니다.' };\n      var days = clamp(f.days, 1, 31);\n      var daily = D.facility[f.type][g.fac], base = daily * days;\n      var burden = Math.floor(base * rate.fac / 1000) * 10;\n      var mealCost = num(f.meal) * 3 * days, snackCost = num(f.snack) * days, nonCov = mealCost + snackCost;\n      var total = burden + nonCov;\n      var rows = [\n        { label: '급여비용 ' + won(daily) + ' × ' + days + '일', sub: FTYPE_NAMES[f.type] + ' · ' + g.name, amt: base },\n        { label: '급여 본인부담 (' + rate.fac + '%)', amt: burden },\n        { k: 'head', label: '비급여 항목' },\n        { label: '식재료비 ' + won(num(f.meal)) + ' × 3끼', sub: '× ' + days + '일', amt: mealCost },\n        { label: '간식비 ' + won(num(f.snack)), sub: '× ' + days + '일', amt: snackCost },\n        { k: 'total', label: '본인 부담', amt: total }\n      ];\n      return {\n        mode: 2, g: g, G: base, L: 0, boost: 0, rate: rate, burden: burden, excess: 0, nonCov: nonCov, total: total, rows: rows, days: days,\n        cond: g.name + ' · ' + rate.label + ' · ' + FTYPE_NAMES[f.type] + ' · ' + days + '일',\n        parts: '급여 본인부담 ' + won(burden) + ' + 식비·간식 ' + won(nonCov)\n      };\n    }\n    function calc(S, mode, D) { return mode === 0 ? calcDay(S, D) : mode === 1 ? calcVisit(S, D) : calcFac(S, D); }\n\n    function setChips(box, items, activeVal, onPick) {\n      if (!box) return;\n      box.innerHTML = '';\n      items.forEach(function (it) {\n        var b = document.createElement('button');\n        b.type = 'button';\n        b.className = 'ltc-chip';\n        b.setAttribute('aria-pressed', it.value === activeVal ? 'true' : 'false');\n        if (it.disabled) b.disabled = true;\n        b.innerHTML = '<span>' + it.label + '</span>' + (it.sub ? '<small>' + it.sub + '</small>' : '');\n        b.addEventListener('click', function () { onPick(it.value); });\n        box.appendChild(b);\n      });\n    }\n\n    function render() {\n      if(partialYear) { S.mode=0; S.day.band=2; S.day.withVisit=false; }\n      var g = gradeOf(S.grade);\n      if(partialYear) {\n        ['ltcBand','ltcWithVisitWrap','ltcServiceCmp'].forEach(function(id){var x=document.getElementById(id);if(x)x.hidden=true;});\n        root.querySelectorAll('.ltc-tab').forEach(function(t){if(Number(t.dataset.mode)>0)t.hidden=true;});\n        if(!document.getElementById('partialRateNote')) {var note=document.createElement('p');note.id='partialRateNote';note.textContent='부분 수가: 주야간보호 8~10시간만 계산합니다. 다른 시간대·방문요양·요양원 비교는 확정 전체표 등록 후 제공됩니다.';root.prepend(note);}\n      }\n      // 탭\n      root.querySelectorAll('.ltc-tab').forEach(function (t) {\n        var m = Number(t.dataset.mode);\n        t.setAttribute('aria-selected', m === S.mode ? 'true' : 'false');\n      });\n      root.querySelectorAll('.ltc-mode-pane').forEach(function (p) {\n        p.hidden = Number(p.dataset.pane) !== S.mode;\n      });\n\n      // 등급·감경 칩\n      setChips(document.getElementById('ltcGrade'), DATA.grades.map(function (x) { return { value: x.key, label: x.name }; }), S.grade, function (v) { S.grade = v; render(); });\n      setChips(document.getElementById('ltcReduce'), Object.keys(DATA.rates).map(function (k) {\n        var r = DATA.rates[k];\n        return { value: k, label: r.label, sub: '재가 ' + r.home + '% · 시설 ' + r.fac + '%' };\n      }), S.reduce, function (v) { S.reduce = v; render(); });\n\n      // 주야간보호 시간대·식사\n      setChips(document.getElementById('ltcBand'), DATA.bands.map(function (b, i) { return { value: i, label: b, sub: won(g.day[i]) }; }), S.day.band, function (v) { S.day.band = v; render(); });\n      setChips(document.getElementById('ltcMeal'), [{ value: 'lunch', label: '점심만' }, { value: 'both', label: '점심·저녁' }], S.day.meal, function (v) { S.day.meal = v; render(); });\n\n      // 방문요양 시간\n      var vItems = [150, 180, 210, 240].map(function (m) { return { value: m, label: minLabel(m), sub: won(DATA.visit[m]), disabled: !visitAllowed(g.key, m) }; });\n      setChips(document.getElementById('ltcVminSub'), vItems, visitAllowed(g.key, S.day.visit.minutes) ? S.day.visit.minutes : 180, function (v) { S.day.visit.minutes = v; render(); });\n      setChips(document.getElementById('ltcVminMain'), vItems, visitAllowed(g.key, S.visit.minutes) ? S.visit.minutes : 180, function (v) { S.visit.minutes = v; render(); });\n\n      // 시설 종류\n      setChips(document.getElementById('ltcFtype'), [\n        { value: 'home', label: '요양원', sub: '노인요양시설' },\n        { value: 'group', label: '공동생활가정', sub: '9인 이하 소규모' }\n      ], S.fac.type, function (v) { S.fac.type = v; render(); });\n\n      // 방문요양 병행 스위치\n      var sw = document.getElementById('ltcWithVisit');\n      var subP = document.getElementById('ltcVisitSubPanel');\n      if (sw && subP) {\n        var canV = g.key !== 'c';\n        sw.setAttribute('aria-checked', (S.day.withVisit && canV) ? 'true' : 'false');\n        subP.hidden = !(S.day.withVisit && canV);\n      }\n\n      // 숫자 입력값 동기화\n      var bindVal = function (id, val) { var el = document.getElementById(id); if (el && document.activeElement !== el) el.value = val; };\n      bindVal('ltcDayWk', S.day.wk);\n      bindVal('ltcDayHol', S.day.hol);\n      bindVal('ltcMealPrice', fmt(S.day.mealPrice));\n      bindVal('ltcSnackPrice', fmt(S.day.snack));\n      bindVal('ltcSubVisitWk', S.day.visit.wk);\n      bindVal('ltcVisitWk', S.visit.wk);\n      bindVal('ltcVisitSun', S.visit.sun);\n      bindVal('ltcFacDays', S.fac.days);\n\n      // 계산 결과\n      var R = calc(S, S.mode, DATA);\n      var badgeEl = document.getElementById('ltcHeroBadge');\n      var condEl = document.getElementById('ltcHeroCond');\n      var amtEl = document.getElementById('ltcHeroAmt');\n      var partsEl = document.getElementById('ltcHeroParts');\n      var gaugeBox = document.getElementById('ltcGaugeBox');\n      var gaugeFill = document.getElementById('ltcGaugeFill');\n      var gaugeUsed = document.getElementById('ltcGaugeUsed');\n      var gaugeLim = document.getElementById('ltcGaugeLim');\n      var tipEl = document.getElementById('ltcHeroTip');\n      var ledgerEl = document.getElementById('ltcLedger');\n\n      badgeEl.textContent = MODE_NAMES[S.mode];\n      if (R.unavailable) {\n        condEl.textContent = g.name;\n        amtEl.textContent = '이용 대상 아님';\n        partsEl.textContent = R.unavailable;\n        gaugeBox.hidden = true;\n        tipEl.hidden = true;\n        ledgerEl.innerHTML = '<li><span>' + R.unavailable + '</span></li>';\n      } else {\n        condEl.textContent = R.cond;\n        amtEl.textContent = won(R.total);\n        partsEl.textContent = R.parts;\n\n        if (R.L > 0) {\n          gaugeBox.hidden = false;\n          var pct = Math.min(100, Math.round((R.G / R.L) * 100));\n          var rawPct = Math.round((R.G / R.L) * 100);\n          gaugeFill.style.width = pct + '%';\n          gaugeFill.classList.toggle('over', R.G > R.L);\n          gaugeUsed.textContent = '한도 ' + rawPct + '% 사용 (' + won(R.G) + ')';\n          gaugeLim.textContent = '월 한도 ' + won(R.L);\n\n          tipEl.hidden = false;\n          tipEl.classList.toggle('over', R.G > R.L);\n          if (R.G > R.L) {\n            tipEl.innerHTML = ' 월 한도액을 <b>' + won(R.excess) + '</b> 초과했습니다. 한도 초과 금액은 100% 본인부담이므로 이용 일수나 시간을 조절해 보세요.';\n          } else {\n            var rem = R.L - R.G;\n            var remVisit = Math.floor(rem / DATA.visit[180]);\n            var boostMsg = R.boost ? '<b>월 15일 이상(8시간↑)</b> 이용해 월 한도가 <b>+' + won(R.boost) + '</b> 늘어났어요! ' : '';\n            tipEl.innerHTML = ' ' + boostMsg + '남은 한도 <b>' + won(rem) + '</b>' + (!partialYear && !partialYear && g.key !== 'c' && remVisit > 0 ? '으로 방문요양(3시간)을 월 약 <b>' + remVisit + '회</b> 더 쓸 수 있어요.' : ' 안에서 여유 있게 이용하실 수 있어요.');\n          }\n        } else {\n          gaugeBox.hidden = true;\n          tipEl.hidden = false;\n          tipEl.classList.remove('over');\n          tipEl.innerHTML = ' 3~5등급 어르신은 등급판정위원회에서 시설입소 승인을 받은 경우에만 요양원 입소가 가능합니다.';\n        }\n\n        // 상세 내역\n        ledgerEl.innerHTML = R.rows.map(function (r) {\n          if (r.k === 'head') return '<li class=\"head\">' + r.label + '</li>';\n          var cls = [r.k || '', r.cls || '', (r.sub && r.sub.charAt(0) === '×') ? 'inl' : '', (r.sub && r.sub.charAt(0) === '×' && String(r.label).indexOf('끼') >= 0) ? 'long' : ''].filter(Boolean).join(' ');\n          return '<li class=\"' + cls + '\"><span>' + r.label + (r.sub ? '<small>' + r.sub + '</small>' : '') + '</span><b>' + won(r.amt) + '</b></li>';\n        }).join('');\n      }\n\n      // 감경 비교\n      var redBox = document.getElementById('ltcReduceCmp');\n      if (redBox && !R.unavailable) {\n        redBox.innerHTML = Object.keys(DATA.rates).map(function (rk) {\n          var T = JSON.parse(JSON.stringify(S)); T.reduce = rk;\n          var rx = calc(T, S.mode, DATA);\n          var rInfo = DATA.rates[rk];\n          var pctTxt = S.mode === 2 ? rInfo.fac + '%' : rInfo.home + '%';\n          return '<div class=\"ltc-cmp-item' + (rk === S.reduce ? ' on' : '') + '\"><span><b>' + pctTxt + '</b> · ' + rInfo.label + '</span><b>' + won(rx.total) + '</b></div>';\n        }).join('');\n      }\n\n      // 같은 조건 서비스별 비교\n      var srvBox = document.getElementById('ltcServiceCmp');\n      if (srvBox && !partialYear) {\n        srvBox.innerHTML = [0, 1, 2].map(function (m) {\n          var rx = calc(S, m, DATA);\n          var rightTxt = rx.unavailable ? '대상 아님' : won(rx.total);\n          return '<div class=\"ltc-cmp-item' + (m === S.mode ? ' on' : '') + '\"><button type=\"button\" data- pick-mode=\"' + m + '\"><span><b>' + MODE_NAMES[m] + '</b><small style=\"color:var(--ink-soft)\">' + (rx.cond || '') + '</small></span><b>' + rightTxt + ' ›</b></button></div>';\n        }).join('');\n        srvBox.querySelectorAll('button').forEach(function (b, idx) {\n          b.addEventListener('click', function () { S.mode = idx; render(); });\n        });\n      }\n\n      // 2027년 의결안 미리보기\n      var box2027 = document.getElementById('ltc2027Box');\n      if (box2027) {\n        box2027.hidden = true;\n        if(false) {\n        var r27 = calc(S, S.mode, D2027);\n        if (!R.unavailable && !r27.unavailable && (S.mode !== 0 || S.day.band === 2)) {\n          var diff = r27.total - R.total;\n          box2027.hidden = false;\n          box2027.innerHTML = '<div style=\"font-weight:800;margin-bottom:6px\"> 2027년 수가 미리보기 <small style=\"font-weight:500;color:var(--ink-faint)\">(장기요양위원회 의결안 기준)</small></div>' +\n            '<div class=\"ltc-2027-row\"><span>2026년 현재 예상</span><span>' + won(R.total) + '</span></div>' +\n            '<div class=\"ltc-2027-row\"><span>2027년 의결안 예상</span><b>' + won(r27.total) + ' (' + (diff >= 0 ? '+' : '') + won(diff) + ')</b></div>';\n        } else {\n          box2027.hidden = true;\n        }\n        }\n      }\n    }\n\n    // 이벤트 연결: 서비스 탭\n    root.querySelectorAll('.ltc-tab').forEach(function (t) {\n      t.addEventListener('click', function () { S.mode = Number(t.dataset.mode); render(); });\n    });\n\n    // 이벤트 연결: 스테퍼\n    root.querySelectorAll('[data-step-target]').forEach(function (btn) {\n      btn.addEventListener('click', function () {\n        var target = btn.dataset.stepTarget;\n        var delta = Number(btn.dataset.step);\n        if (target === 'day.wk') S.day.wk = clamp(S.day.wk + delta, 0, 31);\n        else if (target === 'day.hol') S.day.hol = clamp(S.day.hol + delta, 0, 31);\n        else if (target === 'day.visit.wk') S.day.visit.wk = clamp(S.day.visit.wk + delta, 0, 31);\n        else if (target === 'visit.wk') S.visit.wk = clamp(S.visit.wk + delta, 0, 31);\n        else if (target === 'visit.sun') S.visit.sun = clamp(S.visit.sun + delta, 0, 31);\n        else if (target === 'fac.days') S.fac.days = clamp(S.fac.days + delta, 1, 31);\n        render();\n      });\n    });\n\n    // 직접 입력\n    var bindInput = function (id, fn) {\n      var el = document.getElementById(id);\n      if (!el) return;\n      el.addEventListener('input', function () { fn(el.value); render(); });\n      el.addEventListener('blur', function () { render(); });\n    };\n    bindInput('ltcDayWk', function (v) { S.day.wk = clamp(v, 0, 31); });\n    bindInput('ltcDayHol', function (v) { S.day.hol = clamp(v, 0, 31); });\n    bindInput('ltcMealPrice', function (v) { S.day.mealPrice = clamp(v, 0, 100000); S.fac.meal = S.day.mealPrice; });\n    bindInput('ltcSnackPrice', function (v) { S.day.snack = clamp(v, 0, 100000); S.fac.snack = S.day.snack; });\n    bindInput('ltcSubVisitWk', function (v) { S.day.visit.wk = clamp(v, 0, 31); });\n    bindInput('ltcVisitWk', function (v) { S.visit.wk = clamp(v, 0, 31); });\n    bindInput('ltcVisitSun', function (v) { S.visit.sun = clamp(v, 0, 31); });\n    bindInput('ltcFacDays', function (v) { S.fac.days = clamp(v, 1, 31); });\n\n    // 방문요양 병행 토글\n    var swBtn = document.getElementById('ltcWithVisitWrap');\n    if (swBtn) swBtn.addEventListener('click', function () {\n      if (S.grade === 'c') return;\n      S.day.withVisit = !S.day.withVisit;\n      render();\n    });\n\n    // 처음부터 버튼\n    var resetBtn = document.getElementById('ltcResetBtn');\n    if (resetBtn) resetBtn.addEventListener('click', function () {\n      S = makeDefaultState();\n      render();\n    });\n\n    // 카톡 공유용 결과 복사 버튼 (센터 이름 + 전화번호 자동 포함!)\n    var shareBtn = document.getElementById('ltcShareBtn');\n    if (shareBtn) shareBtn.addEventListener('click', function () {\n      var txt = /^https?:$/.test(window.location.protocol) ? new URL('./', window.location.href).href : (C.url || window.location.href);\n      function done(ok) {\n        var toast = document.getElementById('toast');\n        if (toast) {\n          toast.innerHTML = '<b>' + (ok ? '홈페이지 주소를 복사했어요' : '복사가 제한된 환경이에요') + '</b>' + (ok ? '카카오톡 대화방에 붙여넣어 보내세요.' : '브라우저 주소창의 홈페이지 주소를 복사해 주세요.');\n          toast.classList.add('show');\n          setTimeout(function () { toast.classList.remove('show'); }, 3200);\n        }\n      }\n      try {\n        navigator.clipboard.writeText(txt).then(function () { done(true); }, function () { done(false); });\n      } catch (e) { done(false); }\n    });\n\n    render();\n  })();\n\n})();\n\n\n/* Facility photo carousel and enlargement. */\n(function(){\n var dialog,viewer,title,count,nav,trigger,previousOverflow,photos=[],index=0,swipeStart=null,suppressClickUntil=0;\n function setSlide(carousel,n){\n  if(!carousel)return;\n  var slides=Array.from(carousel.querySelectorAll('.facility-slide'));\n  n=(n+slides.length)%slides.length;carousel.dataset.index=String(n);\n  slides.forEach(function(slide,i){slide.hidden=i!==n;});\n }\n function show(n){index=(n+photos.length)%photos.length;var image=photos[index].querySelector('img');viewer.src=image.currentSrc||image.src;viewer.alt=image.alt;title.textContent=photos[index].getAttribute('data-gallery-title');count.textContent=(index+1)+' / '+photos.length;nav.hidden=photos.length<2;setSlide(photos[index].closest('.facility-carousel'),index);}\n document.addEventListener('click',function(event){\n  var control=event.target.closest('[data-facility-step]');\n  if(control){var carousel=control.closest('.facility-carousel'),n=Number(carousel.dataset.index||0)+Number(control.dataset.facilityStep);setSlide(carousel,n);return;}\n  var button=event.target.closest('.facility-zoom');if(!button)return;\n  if(Date.now()<suppressClickUntil){event.preventDefault();return;}\n  if(!dialog){\n   dialog=document.createElement('dialog');dialog.className='facility-lightbox';dialog.setAttribute('aria-label','센터 시설 사진 확대 보기');\n   var bar=document.createElement('div');bar.className='facility-lightbox-bar';title=document.createElement('strong');\n   var close=document.createElement('button');close.type='button';close.className='facility-lightbox-close';close.textContent='닫기';close.addEventListener('click',function(){dialog.close();});\n   bar.append(title,close);viewer=document.createElement('img');viewer.className='facility-lightbox-image';\n   nav=document.createElement('div');nav.className='facility-gallery-nav';\n   var previous=document.createElement('button');previous.type='button';previous.textContent='이전';previous.setAttribute('aria-label','이전 사진');previous.addEventListener('click',function(){show(index-1);});\n   var next=document.createElement('button');next.type='button';next.textContent='다음';next.setAttribute('aria-label','다음 사진');next.addEventListener('click',function(){show(index+1);});\n   count=document.createElement('span');count.className='facility-gallery-count';count.setAttribute('aria-live','polite');nav.append(previous,count,next);dialog.append(bar,viewer,nav);document.body.append(dialog);\n   dialog.addEventListener('click',function(e){if(e.target===dialog)dialog.close();});\n   dialog.addEventListener('keydown',function(e){if(e.key==='ArrowLeft'){e.preventDefault();show(index-1);}if(e.key==='ArrowRight'){e.preventDefault();show(index+1);}});\n   dialog.addEventListener('close',function(){document.body.style.overflow=previousOverflow;viewer.removeAttribute('src');trigger=photos[index]||trigger;if(trigger)trigger.focus();});\n  }\n  trigger=button;photos=Array.from(button.closest('.facility-card').querySelectorAll('.facility-zoom')).slice(0,3);show(photos.indexOf(button));\n  previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';dialog.showModal();\n });\n document.addEventListener('keydown',function(e){var carousel=e.target.closest('.facility-carousel');if(!carousel||!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();setSlide(carousel,Number(carousel.dataset.index||0)+(e.key==='ArrowRight'?1:-1));});\n document.addEventListener('touchstart',function(e){var carousel=e.target.closest('.facility-carousel');if(!carousel||e.touches.length!==1)return;swipeStart={carousel:carousel,x:e.touches[0].clientX,y:e.touches[0].clientY};},{passive:true});\n document.addEventListener('touchend',function(e){if(!swipeStart)return;var start=swipeStart;swipeStart=null;var touch=e.changedTouches[0];if(!touch)return;var dx=touch.clientX-start.x,dy=touch.clientY-start.y;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)){setSlide(start.carousel,Number(start.carousel.dataset.index||0)+(dx<0?1:-1));suppressClickUntil=Date.now()+400;}},{passive:true});\n})();";
  const slides = heroSvgs(D);
  const photo = d.heroStyle !== 'illust';
  const figs = photo
    ? HERO_PHOTO.map((p, i) => {
        const up = String(d['heroImage' + (i + 1)] || '');
        if (/^(?:data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+\/=]+|img\/[A-Za-z0-9._-]+\.(?:jpe?g|png|webp))$/.test(up)) {
          const cap = String(d['heroCap' + (i + 1)] || '').trim();
          return { src: up, alt: cap || (D.name + ' 소개 이미지 ' + (i + 1)), cap: cap, pos: '50% 50%' };
        }
        return { src: opt.preview ? 'data:image/webp;base64,' + HERO_IMGS[p.file] : 'img/' + p.file, alt: p.alt, cap: p.cap, pos: p.pos };
      })
    : [
      { src: slides[0], alt: '해가 뜨는 센터 건물' + (D.shuttle ? '과 송영 차량' : '') + ' 그림', cap: D.shuttle ? '아침이면 차량으로 모시러 가는 우리 동네 쉼터' : '어르신의 하루를 함께하는 우리 동네 쉼터' },
      { src: slides[1], alt: '밥과 국, 반찬이 차려진 한 상 그림', cap: '따뜻하게 차려 내는 정성 담은 한 끼' },
      { src: slides[2], alt: '음표와 퍼즐, 컵 쌓기 그림', cap: '생각하고, 움직이고, 함께 웃는 시간' }];
  // GEO 기준 07 & 08: 이미지 width/height 명시(CLS 방지) + fetchpriority/lazy 속성
  const heroFigs = figs.map((f, i) => '<figure class="slide' + (i === 0 ? ' on' : '') + '" aria-label="' + (i + 1) + ' / ' + figs.length + '"><img src="' + f.src + '" alt="' + esc(f.alt) + '" width="1400" height="788" ' + (i === 0 ? 'fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"') + (f.pos ? ' style="object-position:' + f.pos + '"' : '') + '>' + (f.cap ? '<figcaption>' + esc(f.cap) + '</figcaption>' : '') + '</figure>').join('\n      ');
  const naverMap = 'https://map.naver.com/p/search/' + encodeURIComponent(D.mapQ);
  const tmap = 'tmap://search?name=' + encodeURIComponent(D.mapQ);
  const tel = 'tel:' + D.telDigits;
  const row = (l, v) => '<li><b>' + esc(l) + '</b><span>' + v + '</span></li>';
  const faviconSvg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><circle cx='16' cy='16' r='8' fill='" + T.accent + "'/><g stroke='" + T.accent + "' stroke-width='2.4' stroke-linecap='round'><path d='M16 2v4M16 26v4M2 16h4M26 16h4M6 6l2.8 2.8M23.2 23.2 26 26M6 26l2.8-2.8M23.2 8.8 26 6'/></g></svg>";
  const favicon = 'data:image/svg+xml,' + encodeURIComponent(faviconSvg).replace(/'/g, '%27');
  const eng = d.eng ? esc(d.eng) : 'DAY CARE';
  const tag = d.eng ? esc(d.eng) + ' · ' + esc((D.cityShort + ' ' + (d.dong || '')).trim()) : esc((D.cityShort + ' ' + (d.dong || '')).trim());
  const greetParas = String(d.greetBody || '').split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
  const hasGreet = !!(d.greetQuote || greetParas.length);
  const facs = (d.facilities || []).filter(k => FAC[k]);
  const progs = { c: d.pCog || P_DEF.pCog, b: d.pBody || P_DEF.pBody, m: d.pMusic || P_DEF.pMusic };

  const nav = [
    ['홈', 'index.html'],
    ['센터소개', 'about.html'],
    ['프로그램·식단', 'program.html'],
    ['비용·계산기', 'guide.html'],
    ['오시는길', 'contact.html']
  ];

  const orgRows = [row('기관명', esc(D.name)), row('급여 종류', esc(d.careType || ''))];
  if (d.orgNo) orgRows.push(row('장기요양기관 기호', esc(d.orgNo)));
  if (D.capacity) orgRows.push(row('등록 정원', D.capacity + '명'));

  const opsRows = [row('운영시간', esc(D.hours))];
  if (D.shuttle) { opsRows.push(row('송영 지역', D.areas.length ? esc(D.areas.join(', ')) + '<small class="sub">운행 가능 여부는 상담 시 확인</small>' : '상담 시 확인')); }
  if (D.meals.length) opsRows.push(row('식사', esc(D.mealsText) + ' 제공' + (D.cookText ? '<small class="sub">' + esc(D.cookText) + '</small>' : '')));
  opsRows.push(row('휴무일', esc(D.closedText) + (d.holidayNote ? '<br><span class="holiday-note">' + esc(d.holidayNote) + '</span>' : '')));
  const costRows = [row('이용 대상', '장기요양 1~5등급·<span class="grade-label">인지지원등급 어르신</span>,<br>등급 외 어르신도 상담 가능'), row('본인부담금', '급여비용의 15%(일반)<small class="sub">감경 기준과 월 예상액은 위 계산기 참고</small>')];
  if (D.mealFee != null) costRows.push(row('식재료비', '1식 ' + won(D.mealFee) + '원' + (D.mealAsOf ? ' <small class="asof">' + esc(D.mealAsOf) + '</small>' : '')));
  if (D.snackFee != null) costRows.push(row('간식비', '1회 ' + won(D.snackFee) + '원' + (D.snackAsOf ? ' <small class="asof">' + esc(D.snackAsOf) + '</small>' : '')));

  const feeHtml = D.feeOk ? `
    <div class="box fee rv">
      <h3>${esc(d.careType || '')} 1일당 급여비용 <small>${esc(d.feeBand)} · ${esc(d.feeYear)}년 ${CORE.isProposal(d) ? '의결안(확정 전) ' : ''}기준 · 단위: 원</small></h3>
      <div class="fee-scroll">
        <table>
          <thead><tr><th>구분</th><th>1등급</th><th>2등급</th><th>3등급</th><th>4등급</th><th>5등급</th><th>인지지원</th></tr></thead>
          <tbody>
            <tr><th>급여비용</th>${D.fees.map(v => '<td>' + won(v) + '</td>').join('')}</tr>
            <tr class="limit"><th>본인부담 15% <small class="rl">일반</small></th>${D.copay.map(v => '<td>' + won(v) + '</td>').join('')}</tr>
            <tr class="cutrow"><th>본인부담 9% <small class="rl">40% 감경 대상자</small></th>${D.copay9.map(v => '<td>' + won(v) + '</td>').join('')}</tr>
            <tr class="cutrow"><th>본인부담 6% <small class="rl">60% 감경 대상자</small></th>${D.copay6.map(v => '<td>' + won(v) + '</td>').join('')}</tr>
          </tbody>
        </table>
      </div>
      <p class="fee-note">식재료비·간식비는 별도이고, 월 예상 비용은 위 <b>본인부담금 계산기</b> 또는 전화 상담으로 확인해 보세요.</p>
      <details class="fee-more">
        <summary>본인부담률 법령 기준 안내</summary>
        <div class="fee-more-body">
          <table class="cut">
            <thead><tr><th>구분</th><th>대상</th><th>본인부담</th></tr></thead>
            <tbody>
              <tr><th>일반</th><td>장기요양 수급자</td><td><b>15%</b></td></tr>
              <tr><th>40% 감경</th><td>건강보험료 순위 25% 초과~50% 이하</td><td><b>9%</b></td></tr>
              <tr><th>60% 감경</th><td>건강보험료 순위 0~25% 이하</td><td><b>6%</b></td></tr>
              <tr><th>의료급여 수급자</th><td>「국민기초생활보장법」에 따른 의료급여 수급자</td><td><b>0원</b></td></tr>
            </tbody>
          </table>
          <ul class="fee-list">
            <li>감경 여부는 국민건강보험공단이 가진 자료로 판단하며, 대부분 <b>직권으로 적용</b>되어 따로 신청하지 않아도 됩니다.</li>
            <li>보험료가 바뀌어 새로 감경 대상이 된 경우에는 <b>관할 공단 운영센터에 감경 신청서</b>를 내면 14일 이내에 결과를 알려 주고, 인정되면 환급됩니다.</li>
            <li>본인부담금은 법령에 따라 정해지며, 센터가 임의로 정하거나 조정하는 것이 아닙니다.</li>
          </ul>
          <p class="fee-src">출처: 국민건강보험공단 노인장기요양보험 안내 · 감경 여부가 궁금하시면 상담 때 함께 확인해 드립니다.</p>
        </div>
      </details>
    </div>` : '';

  const dayItems = [
    ['등원과 안부 인사', D.shuttle ? '반가운 인사로 시작하는 시간. 차량 이용 여부와 인계 장소를 상담 때 함께 확인해 보세요.' : '반가운 인사로 시작하는 시간. 등원 방식과 인계 장소를 상담 때 함께 확인해 보세요.'],
    ['몸과 마음 깨우기', '인지·신체 활동으로 하루를 엽니다. 어르신의 흥미와 참여 방식을 상담해 보세요.'],
    [D.meals.includes('점심') ? '따뜻한 점심' : '점심 시간 안내', D.meals.includes('점심') ? (D.cookText ? '직접 조리한 점심과 쉬는 시간. 식사 시 도움이 필요한 점을 미리 알려주세요.' : '점심과 쉬는 시간. 식사 시 도움이 필요한 점을 미리 알려주세요.') : '점심 식사 여부는 상담 시 확인해 주세요.'],
    [D.meals.includes('간식') ? '간식과 함께하는 즐거움' : '오후 활동', '미술·음악·놀이' + (D.meals.includes('간식') ? '와 오후 간식으로' : ' 등으로') + ' 함께하는 시간입니다.'],
    [D.meals.includes('저녁') ? '저녁 식사와 귀가' : '귀가 준비와 귀가', (D.meals.includes('저녁') ? '저녁까지 든든히 드시고 귀가합니다. ' : '하루를 마무리하고 귀가합니다. ') + '귀가 일정과 보호자 연락 방법을 상담해 보세요.']
  ];

  const secHero = `
<section class="hero" id="home">
  <div class="wrap">
    <div class="hero-text rv">
      <span class="en-tag">A warm day for every elder</span>
      <small>${tag}</small>
      <h1>${esc(d.hero1)}<br><em>${esc(D.hero2)}</em></h1>
      <p class="lead">${nl2br(d.lead)}</p>
      <div class="hero-cta"><a class="btn hero-calculator-link" style="background:#f3dfa9!important;color:#182a20!important;border:2px solid #f3dfa9!important;opacity:1!important" href="guide.html">본인부담금 계산해 보기</a><a class="btn ghost" href="${tel}"> ${esc(D.tel)}</a></div>
    </div>
    <div class="slider rv" id="slider" role="region" aria-roledescription="carousel" aria-label="${esc(D.name)} 대표 이미지">
      ${heroFigs}
      <button class="s-arrow s-prev" type="button" aria-label="이전 그림">‹</button>
      <button class="s-arrow s-next" type="button" aria-label="다음 그림">›</button>
      <div class="s-dots"></div>
    </div>
    ${photo && d.aiNote ? '<p class="ai-note">※ 첫 화면 이미지는 AI로 만든 예시 이미지이며, 실제 센터의 모습과 다를 수 있습니다.</p>' : ''}
  </div>
</section>`;

  const secAbout = `
<section id="about">
  <div class="wrap">
    <div class="head rv" data-en="About us">
      <h2>‘${esc(d.careType || '주·야간보호')}’ 센터란?</h2>
      <p>${esc(d.careType || '주·야간보호')} 서비스는 돌봄이 필요한 어르신께서 낮 시간 동안 센터에 머무르시며<br>식사와 돌봄, 인지·신체 활동을 함께하시는 서비스입니다.<br><b>${esc(D.name)}${hasBatchim(D.name) ? '은' : '는'} 따뜻한 인사와 즐거운 프로그램으로 어르신의 하루를 함께합니다.</b></p>
    </div>
    <div class="tiles">
      <div class="tile t1 rv">
        <div>${D.shuttle ? '<h3>이동 걱정 없이!<br>차량 송영 서비스</h3><p>' + esc(D.shuttleTime || '운행 시간은 상담 시 안내') + '</p>' : '<h3>전화 한 통으로<br>편하게 상담</h3><p>' + esc(D.tel) + '</p>'}</div>
        ${svg64(D.shuttle ? ICON.car : ICON.chat)}
      </div>
      <div class="tile t2 rv">
        <div>${D.meals.length ? '<h3>' + esc(D.meals.join('·')) + '<br>정성 담은 식사</h3><p>' + esc(D.cookText || '식사 안내는 상담 시 확인') + '</p>' : '<h3>어르신의 하루를<br>함께하는 돌봄</h3><p>식사·이동 도움은 상담 시 확인</p>'}</div>
        ${svg64(ICON.bowl)}
      </div>
      <div class="tile t3 rv"><div><h3>인지·신체<br>맞춤 활동</h3><p class="one">생각하고, 표현하고, 움직이는 시간</p></div>${svg64(ICON.brain)}</div>
      <div class="tile t4 rv"><div><h3>음악·여가로<br>웃음 가득한 하루</h3><p>노래교실, 놀이, 생신 잔치</p></div>${svg64(ICON.music)}</div>
    </div>

    ${buildQuickFactsHtml(D, d)}
  </div>
</section>`;

  const secGreet = hasGreet ? `
<section class="soft" id="greeting">
  <div class="wrap greet">
    <div class="rv">
      <small class="greet-label">센터장 인사말</small>
      ${d.greetQuote ? '<p class="quote">“' + esc(d.greetQuote) + '”</p>' : ''}
    </div>
    <div class="txt rv">
      ${greetParas.map(p => '<p>' + nl2br(p) + '</p>').join('\n      ')}
    </div>
  </div>
  ${d.introVideo ? `<div class="wrap">
    <div class="intro-video rv" id="introVideo" data-youtube="${esc(d.introVideo)}" hidden>
      <h3>센터장이 직접 소개하는 <em>${esc(D.name)}</em></h3>
      <div class="iv-frame"></div>
    </div>
  </div>` : ''}
</section>` : '';


  const secPrograms = `
<section class="soft" id="programs">
  <div class="wrap">
    <div class="head rv" data-en="Programs">
      <h2>오늘도 <em>즐거운</em> 이유</h2>
      <p>어르신의 상태와 흥미를 살피며 다양한 활동을 함께합니다.</p>
    </div>
    <div class="programs">
      <div class="prog rv"><div class="tag t2"><small>인지 활동</small><h3>생각하고,<br>표현하고</h3></div><p>${esc(progs.c)}</p></div>
      <div class="prog rv"><div class="tag t1"><small>신체 활동</small><h3>가볍게 몸을 깨우는 시간</h3></div><p>${esc(progs.b)}</p></div>
      <div class="prog rv"><div class="tag t4"><small>음악·여가 활동</small><h3>노래와 웃음이 있는 하루</h3></div><p>${esc(progs.m)}</p></div>
    </div>
    <p class="note">실제 일정과 참여 내용은 센터 운영에 따라 달라질 수 있습니다.</p>
  </div>
</section>`;

  const secMonthly = D.blogMeal ? `
<section id="monthly">
  <div class="wrap">
    <div class="head rv" data-en="This month">
      <h2>이달의 <em>프로그램표·식단표</em></h2>
      <p>매달 새로 바뀌는 프로그램과 식단 게시판은 네이버 블로그에서 바로 확인하실 수 있어요.</p>
    </div>
    <div class="monthly">
      <div class="month-card rv">
        <div class="m-head t2"><h3>이달의 프로그램표</h3></div>
        <div class="m-body">${svg64(ICON.cal)}<p class="meal-summary program-summary">요일별 활동 일정을<br>블로그 게시판에서 확인하세요.</p><a class="btn line" href="${esc(D.blogMeal)}" target="_blank" rel="noopener">프로그램표 게시판 가기 ↗</a></div>
      </div>
      <div class="month-card rv">
        <div class="m-head t1"><h3>이달의 식단표</h3></div>
        <div class="m-body">${svg64(ICON.bowl)}<p class="meal-summary">어르신께 대접하는 식단을<br>블로그 게시판에서 확인하세요.</p><a class="btn line" href="${esc(D.blogMeal)}" target="_blank" rel="noopener">식단표 게시판 가기 ↗</a></div>
      </div>
    </div>
  </div>
</section>` : '';

  const secDay = `
<section class="soft" id="day">
  <div class="wrap">
    <div class="head rv" data-en="A day at ${esc(D.short.replace(/[^A-Za-z0-9 ]/g, '') || 'our center')}">
      <h2>도착부터 귀가까지, <span class="nw">하루 흐름 예시</span></h2>
      <p>하루 흐름을 이해하기 위한 예시입니다. 실제 시간표는 상담 시 안내해 드립니다.</p>
    </div>
    <ol class="day rv">
      ${dayItems.map((x, i) => '<li><span class="n">0' + (i + 1) + '</span><h3>' + esc(x[0]) + '</h3><p>' + esc(x[1]) + '</p></li>').join('\n      ')}
    </ol>
  </div>
</section>`;

  const secBlogPhotos = D.blogPhoto ? `
<section class="soft" id="photos">
  <div class="wrap">
    <div class="head rv" data-en="Activity Board">
      <h2>어르신 활동사진은 <em>네이버 블로그</em>에서</h2>
      <p>어르신들의 일상 활동 모습과 행사 사진은 실시간으로 올라오는 네이버 블로그 게시판에서 보실 수 있어요.</p>
      <a class="btn naver-blog-link" href="${esc(D.blogPhoto)}" target="_blank" rel="noopener noreferrer" aria-label="네이버 블로그 새 창에서 열기"><b aria-hidden="true">N</b> 네이버 블로그 바로가기 ↗</a>
    </div>
    <div class="blog rv">
      <div class="bc t2">${svg64(ICON.puzzle)}<h3>인지활동</h3></div>
      <div class="bc t1">${svg64(ICON.bike)}<h3>신체활동</h3></div>
      <div class="bc t3">${svg64(ICON.music)}<h3>음악·여가</h3></div>
      <div class="bc t4">${svg64(ICON.cake)}<h3>생신·행사</h3></div>
    </div>
  </div>
</section>` : '';

  const ex4Day = D.copay[3] || 8700;
  const exMeal = CORE.nonCoverExample(D.mealFee, D.snackFee, D.meals.includes('저녁'));
  const exMonth = (ex4Day + exMeal) * 22;
  const secHomeTeaser = `
<section id="calc-preview">
  <div class="wrap">
    <p class="cost-eyebrow">Cost</p>
    <div class="calc-teaser rv">
      <div>
        <span class="ct-badge">${esc(d.feeYear)}년 ${CORE.isProposal(d) ? '의결안' : '고시'} · 계산 예시</span>
        <h3>한 달 이용 비용이 궁금하신가요?<br><em class="cost-title-line">본인부담 계산기로</em><br>바로 확인하세요</h3>
        <p>장기요양 등급(1~5등급·인지지원)과 이용 일수, 감경 대상 여부만 선택하면 급여 본인부담금과 식비·간식비를 합친 월 예상 금액을 계산해 드립니다.</p>
        <div style="display:flex;flex-wrap:wrap;gap:12px">
          <a class="btn gold" href="guide.html">본인부담금 계산기 열기 →</a>

        </div>
      </div>
      <div class="ct-card">
        <small>예시) 4등급 · 일반(15%) · 8~10시간<span style="white-space:nowrap"> · 월 22일 기준</span></small>
        <strong>월 약 ${won(exMonth)}원</strong>
        <div class="ct-sub">급여 본인부담 + 식재료비·간식비 포함</div>
      </div>
    </div>
  </div>
</section>`;

  const secGuide = `
<section id="guide">
  <div class="wrap">
    ${buildCalcHtml(D, d)}
    <div class="head rv" data-en="Cost">
      <h2>처음 알아보셔도, <span class="nw">차근차근 확인하실 수 있습니다.</span></h2>
      <p>등급 여부와 이용 일정, 비용까지. 보호자님이 궁금한 내용부터 살펴보세요.</p>
    </div>
    <div class="starts rv">
      <a class="start" href="contact.html"><small>01 · 장기요양 인정서가 있어요</small><h3>이용 조건을 확인하고 싶어요</h3><p>인정등급, 어르신의 상태, 지역을 알려주세요.</p></a>
      <a class="start" href="contact.html"><small>02 · 등급이 없거나 신청 중이에요</small><h3>어디서 시작하면 될까요?</h3><p>장기요양 신청부터 <span class="consult-phrase">맞춤 상담해드립니다.</span></p></a>
      <a class="start" href="#cost"><small>03 · 비용이 궁금해요</small><h3>어떤 비용을 확인하나요?</h3><p>본인부담금, 식재료비, 간식비를 확인하세요.</p></a>
    </div>
    <div class="two rv">
      <div class="box"><h3>운영${D.shuttle ? '·차량' : ''} 안내</h3><ul class="rows">${opsRows.join('')}</ul></div>
      <div class="box" id="cost">
        <h3>이용 대상·비용</h3>
        <ul class="rows">${costRows.join('')}</ul>
      </div>
    </div>
    ${feeHtml}
  </div>
</section>`;

  const secConsult = `
<section class="consult" id="consultation">
  <div class="wrap">
    <div class="head rv" data-en="Visit & consultation">
      <h2>전화 한 통으로, <span class="nw">우리 가족에게 필요한 것부터.</span></h2>
      <p>상담 전에 모든 서류를 갖추실 필요는 없습니다. 알고 계신 내용부터 편하게 말씀해 주세요.</p>
    </div>
    <ol class="steps rv">
      <li><span class="n">01</span><h3>전화로 이야기 나누기</h3><p>장기요양 인정 여부, 희망 이용 요일·거주지, 식사나 이동 시 도움이 필요한 점을 알려주세요.</p></li>
      <li><span class="n">02</span><h3>방문해 살펴보기</h3><p>방문 일정을 정한 뒤 센터 공간과 프로그램을 살펴보세요.</p></li>
      <li><span class="n">03</span><h3>이용 조건 확인하기</h3><p>총 예상 비용과 항목별 금액, 필요한 서류, ${D.shuttle ? '차량 이용 조건과 ' : ''}시작 가능 일정을 확인하세요.</p></li>
    </ol>
    <div class="cta rv">
      <a class="btn gold" href="${tel}"> ${esc(D.tel)}</a>
      <p>아직 등급이나 이용 일정을 모르셔도 괜찮습니다.</p>
    </div>
  </div>
</section>`;

  const secFaq = D.faq.length ? `
<section id="faq">
  <div class="wrap">
    <div class="head rv" data-en="Q & A"><h2>자주 묻는 질문</h2></div>
    <div class="faq rv">
      ${D.faq.slice(0,5).map(f => '<details><summary>' + esc(f.q) + '</summary><p>' + esc(f.a) + '</p></details>').join('\n      ')}
    </div>
    ${D.faq.length > 5 ? `<details class="faq-more rv">
      <summary><span class="faq-more-show">+ 더보기 (추가 ${D.faq.length-5}개 질문)</span><span class="faq-more-hide">− 추가 질문 접기</span></summary>
      <div class="faq faq-extra">${D.faq.slice(5).map(f=>'<details><summary>'+esc(f.q)+'</summary><p>'+esc(f.a)+'</p></details>').join('')}</div>
    </details>` : ''}
  </div>
</section>` : '';

  // GEO 기준 07: 미디어 이해도 향상 (영상 대본 요약 details 포함)
  const secCampVideo = d.campaign ? `<!-- 참고 영상: 국민건강보험공단 공식 유튜브 영상만 퍼가기(영상 파일은 올리지 않습니다) -->
<section class="refvideo" id="video">
  <div class="wrap">
    <div class="intro-video rv" id="campVideo" data-title="노인장기요양보험이 국보급으로 모십니다!" data-youtube="${DEF_CAMPAIGN}" hidden>
      <div class="head" data-en="Official video"><h2>노인장기요양 안내 영상</h2></div>
      <div class="iv-frame"></div>
      <p class="iv-src">영상: 국민건강보험공단 「노인장기요양보험이 국보급으로 모십니다!」 · <a href="${DEF_CAMPAIGN}" target="_blank" rel="noopener">YouTube에서 보기</a></p>
      <details class="iv-summary">
        <summary>영상 내용 간단히 보기</summary>
        <p>국민건강보험공단이 제작한 노인장기요양보험 홍보 영상으로, 장기요양서비스와 돌봄 지원 제도를 소개합니다.</p>
      </details>
    </div>
  </div>
</section>` : '';

  const secContact = `
<section class="soft" id="contact">
  <div class="wrap">
    <div class="head rv" data-en="Location"><h2>오시는 길</h2></div>
    <div class="visit rv">
      <div class="box">
        <p class="addr">${esc(D.addrFull)}</p>
        ${(d.transit || d.parking) ? '<p>' + [d.transit ? '대중교통: ' + esc(d.transit) : '', d.parking ? '주차: ' + esc(d.parking) : ''].filter(Boolean).join('<br>') + '</p>' : ''}
        <div class="btns">
          <a class="btn map-naver" href="${esc(naverMap)}" target="_blank" rel="noopener">네이버 지도 길찾기 ↗</a>
          <a class="btn map-tmap" id="tmapBtn" href="${esc(tmap)}">T맵 길찾기</a>
          <button class="btn line" type="button" id="copyBtn">주소 복사</button>
        </div>
      </div>
      <div class="box">
        <h3>편하게 문의해 주세요</h3>
        <a class="tel" href="${tel}">${esc(D.tel)}</a>
        ${d.email ? '<p style="margin-top:10px">이메일: ' + esc(d.email) + '</p>' : ''}
        <div class="btns">
          ${D.kakao ? '<a class="btn map-kakao" href="' + esc(D.kakao) + '" target="_blank" rel="noopener">카카오톡 상담 ↗</a>' : ''}
          ${D.blog ? '<a class="btn map-naver" href="' + esc(D.blog) + '" target="_blank" rel="noopener">네이버 블로그 ↗</a>' : ''}
        </div>
      </div>
    </div>
  </div>
</section>`;

  const subHero = (en, ko, desc) => `
<section class="sub-hero">
  <div class="wrap">
    <div class="crumb"><a href="index.html">홈</a> <span>›</span> <span>${ko.replace(/<[^>]+>/g, '')}</span></div>
    <span class="en-tag">${en}</span>
    <h1>${ko}</h1>
    <p>${desc}</p>
  </div>
</section>`;

  // GEO 기준 02: 페이지별 고유 제목·메타 설명 자동 분기
  let pageBody = '';
  let pageTitle = D.title;
  let pageMetaDesc = D.metaDesc;
  const locPrefix = [d.region, d.dong].filter(Boolean).join(' ') + ' ' + D.name;
  const pageUrl = CORE.pageUrl(D.url, page);

  if (page === 'about.html') {
    pageTitle = '센터소개·시설안내·하루일과 | ' + D.name;
    pageMetaDesc = locPrefix + ' 센터장 인사말, 장기요양기관 등록 정보' + (D.capacity ? '(정원 ' + D.capacity + '명)' : '') + ', 생활실·목욕실·족욕시설 등 내부 공간과 하루 일과 안내. 상담 ' + D.tel;
    pageBody = subHero('About Our Center', '센터소개 · <em>시설 및 하루일과</em>', esc(D.name) + '의 돌봄 철학과 쾌적한 생활 공간, 어르신의 하루 일과를 소개합니다.') +
      secGreet + secAbout + secDay + secConsult;
  } else if (page === 'program.html') {
    pageTitle = '프로그램·이달의 식단표·활동사진 | ' + D.name;
    pageMetaDesc = locPrefix + ' 맞춤형 인지·신체·음악여가 프로그램 및 매월 업데이트되는 네이버 블로그 식단표·어르신 활동사진 게시판 안내.';
    pageBody = subHero('Programs & Meals', '맞춤 프로그램 · <em>이달의 식단표</em>', '인지·신체·여가 프로그램과 매달 업데이트되는 식단표·활동사진 게시판을 확인하세요.') +
      secPrograms + secMonthly + secBlogPhotos + secDay + secConsult;
  } else if (page === 'guide.html') {
    pageTitle = '장기요양 본인부담금 계산기·이용안내·FAQ | ' + D.name;
    pageMetaDesc = locPrefix + ' '+d.feeYear+'년 장기요양 1~5등급·인지지원등급 급여비용표 및 한 달 예상 본인부담금 자동 계산기(감경·식비·간식비 반영), 자주 묻는 질문 안내.';
    pageBody = subHero('Cost Calculator & Guide', '이용안내 · <em>본인부담금 계산기</em>', d.feeYear+'년 장기요양 급여비용 기준 한 달 예상 본인부담금을 간편하게 계산해 보세요.') +
      secGuide + secFaq + secConsult;
  } else if (page === 'contact.html') {
    pageTitle = '오시는길·송영안내·방문상담 | ' + D.name;
    pageMetaDesc = locPrefix + ' 오시는 길(' + D.addrFull + '), ' + (d.transit ? d.transit + ', ' : '') + '차량 송영 및 입소 상담 전화 ' + D.tel;
    pageBody = subHero('Location & Contact', '오시는 길 · <em>방문 및 전화 상담</em>', esc(D.addrFull) + ' · 언제든 편하게 문의해 주세요.') +
      secContact + secConsult + secFaq;
  } else {
    pageBody = secHero + secAbout + secHomeTeaser + secMonthly + secBlogPhotos + secConsult + secCampVideo + secContact;
  }

  pageBody += '\n' + buildInternalNavHtml(D, page);

  const ldBlocks = jsonLdText(D, page).map(o => '<script type="application/ld+json">\n' + ldString(o) + '\n' + '<' + '/script>').join('\n');
  const themeId = T.key || 'warm';
  const centerJs = 'window.CENTER_CONFIG = '+JSON.stringify({...CORE.publicConfig(d),theme:themeId}).replace(/</g,'\\u003c')+';\nwindow.CENTER_CONFIG=CENTER_CONFIG;\nwindow.THEME_CONFIG = {\n  theme: "' + esc(themeId) + '",\n};\nwindow.CENTER = ' + JSON.stringify({
    feeYear: Number(d.feeYear),
    rateSnapshot: d.rateSnapshot || RATE_PRESETS[d.feeYear],
    theme: themeId,
    name: D.name,
    telText: D.tel,
    addr: D.addrFull,
    url: D.url,
    fees: D.fees,
    mealFee: D.mealFee ?? CORE.FEE_DEFAULTS.meal,
    mealAsOf:D.mealAsOf, snackAsOf:D.snackAsOf,
    snackFee: D.snackFee ?? CORE.FEE_DEFAULTS.snack,
    hasDinner: D.meals.includes('저녁')
  }).replace(/</g, '\\u003c') + ';';
  const isoToday = todayIso();

  return `<!doctype html>
<html lang="ko" data-theme="${esc(T.key || 'warm')}">
<head>
<meta charset="utf-8">
<script>
${centerJs}
<` + `/script>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(pageTitle)}</title>
<meta name="description" content="${esc(pageMetaDesc)}">
${d.sample ? '<meta name="robots" content="noindex, nofollow">\n' : '<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">\n'}<link rel="canonical" href="${esc(pageUrl)}">
<link rel="alternate" type="text/plain" href="${esc(D.url)}llms.txt" title="${esc(D.name)} AI 안내 문서 (LLMs.txt)">
${d.naverCode ? '<meta name="naver-site-verification" content="' + esc(d.naverCode) + '">\n' : ''}${d.googleCode ? '<meta name="google-site-verification" content="' + esc(d.googleCode) + '">\n' : ''}<!-- GEO 6종 구조화 데이터 (WebSite, LocalBusiness+DayCare, OfferCatalog, BreadcrumbList, FAQPage, VideoObject) -->
${ldBlocks}
<!-- 카카오톡·문자로 링크를 보낼 때 보이는 미리보기 -->
<meta property="og:type" content="website">
<meta property="og:locale" content="ko_KR">
<meta property="og:site_name" content="${esc(D.name)}">
<meta property="og:title" content="${esc(page === 'index.html' ? D.ogTitle : pageTitle)}">
<meta property="og:description" content="${esc(page === 'index.html' ? D.ogDesc : pageMetaDesc)}">
<meta property="og:image" content="${esc(D.url)}og.png?v=${esc(D.ogVer)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="600">
<meta property="og:image:alt" content="${esc(D.name)} 소개 그림">
<meta property="og:url" content="${esc(pageUrl)}">
<link rel="icon" href="${favicon}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,500;1,600&family=Noto+Sans+KR:wght@400;500;700&family=Noto+Serif+KR:wght@600;700&display=swap" rel="stylesheet">
<script>document.documentElement.classList.add('js');<` + `/script>
<style>
${css}
${themeCss(D)}
</style>
</head>
<body>
${d.sample ? '<div class="sample-bar">샘플 페이지입니다 · 실제 센터가 아니며 모든 정보는 예시입니다 (마케팅지니 제작기 시험용)</div>\n' : ''}
<header class="top" id="top">
  <div class="wrap">
    <a class="logo" href="index.html">
      ${buildCenterLogo(d,T)}
      <span><small>${eng}</small><b>${esc(D.name)}</b></span>
    </a>
    <nav aria-label="주요 메뉴" id="nav">
      ${nav.map(n => '<a href="' + n[1] + '"' + (n[1] === page ? ' aria-current="page"' : '') + '>' + n[0] + '</a>').join('\n      ')}
    </nav>
    <a class="pill" href="${tel}">문의 ${esc(D.tel)}</a>
    <button class="menu-btn" type="button" id="menuBtn" aria-expanded="false" aria-controls="nav">메뉴</button>
  </div>
</header>

<main>
${pageBody}
</main>

<footer>
  <div class="wrap">
    <strong>${esc(D.name)}</strong>
    <span>주소: ${esc(D.addrFull)}</span>
    <span>운영시간: ${esc(D.hours)} · ${esc(D.closedText)}${d.holidayNote ? ' · ' + esc(d.holidayNote) : ''}</span>
    <span>대표전화: ${esc(D.tel)}</span>
    ${(d.orgNo || d.designDate || D.capacity) ? '<span>' + [d.orgNo ? '장기요양기관 기호 ' + esc(d.orgNo) : '', d.designDate ? '지정·신고일 ' + esc(ymdDots(d.designDate, '.')) : '', D.capacity ? '등록 정원 ' + D.capacity + '명' : ''].filter(Boolean).join(' · ') + '</span>' : ''}
    <div class="geo-trust-bar">
      <span>© ${esc(D.name)} · 정보 기준일: <time datetime="${isoToday}">${isoToday.slice(0, 4)}년</time> · 근거: 보건복지부 노인장기요양보험 고시${d.sample ? ' (샘플 페이지)' : ''}</span>
      
    </div>
  </div>
</footer>
${D.kakao ? '<a class="fab" href="' + esc(D.kakao) + '" target="_blank" rel="noopener">카톡 상담</a>\n' : ''}<nav class="mbar" aria-label="빠른 연락"><a class="m-tel" href="${tel}">전화 상담</a>${D.kakao ? '<a class="m-sub kakao" href="' + esc(D.kakao) + '" target="_blank" rel="noopener">카톡 상담</a>' : '<a class="m-sub" href="guide.html">비용 계산기</a>'}</nav>
<div class="toast" id="toast" role="status" aria-live="polite"></div>

<script>
${js}
<` + `/script>
${!opt.synced && !opt.preview ? '<script src="center-engine.js"></'+'script><script>CenterEngine.refresh(CENTER_CONFIG,'+JSON.stringify(page)+');</'+'script>' : ''}
</body>
</html>
`;
}

/* ============ [H-2] 장기요양센터 특화 GEO 12대 설계 기준 무료진단 & 도메인·서치콘솔 가이드 ============ */

const api={buildPage,derive,buildLlms,applyRate,syncRate,rateValid,normalizeCosts,RATE_PRESETS,CORE,
 async refresh(config,page){
  /* 한 번만 그린다: 같은 페이지에서 refresh 가 겹쳐 불려도 화면이 두 겹이 되지 않게 막는다 */
  if(globalThis.__centerRefreshStarted)return;globalThis.__centerRefreshStarted=true;
  const base=normalizeCosts(config);
  const d=await syncRate(base);
  /* 수가가 실제로 바뀐 경우에만 화면을 다시 만든다(바뀐 게 없으면 처음 화면 그대로 두어 깜빡임·지연 방지) */
  if(d===base||CORE.rateFingerprint(d.rateSnapshot)===CORE.rateFingerprint(base.rateSnapshot||RATE_PRESETS[base.feeYear]))return;
  /* 페이지를 다 읽은 뒤에만 다시 쓴다(읽는 도중에 쓰면 옛 화면 위에 덧붙어 두 겹이 됨) */
  if(document.readyState!=='complete')await new Promise(r=>window.addEventListener('load',r,{once:true}));
  const html=buildPage(d,{page:page,synced:true});
  document.open();document.write(html);document.close();
 }};
 if(typeof module!=='undefined')module.exports=api;else globalThis.CenterEngine=api;
 })();