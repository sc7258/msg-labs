"use strict";

const STORAGE_KEY = "msg-keeper-wireframe-v1";
const seed = {
  started: false,
  permission: true,
  view: "inbox",
  searchQuery: "",
  searchBox: "all",
  messages: [
    { id: "m5", sender: "엄마", body: "오늘 저녁 7시에 같이 먹을까?", time: "10:42", order: 5, box: "inbox", reason: "", restored: false },
    { id: "m4", sender: "택배 알림", body: "주문하신 상품이 배송 완료되었습니다. 문 앞을 확인해 주세요.", time: "09:18", order: 4, box: "inbox", reason: "", restored: false },
    { id: "m3", sender: "1588-0000", body: "[광고] 오늘만 특별 할인! 지금 신청하면 추가 혜택을 드립니다.", time: "어제", order: 3, box: "quarantine", reason: "키워드 규칙 · 광고", restored: false },
    { id: "m2", sender: "080-1234", body: "무료 체험 안내. 수신을 원하지 않으면 답장해 주세요.", time: "어제", order: 2, box: "quarantine", reason: "발신자 규칙 · 080", restored: false },
    { id: "m1", sender: "은행 알림", body: "카드 결제가 승인되었습니다. 이용 내역은 앱에서 확인해 주세요.", time: "월요일", order: 1, box: "inbox", reason: "", restored: false }
  ],
  rules: [
    { id: "r1", kind: "keyword", value: "광고", active: true },
    { id: "r2", kind: "sender", value: "080", active: true }
  ]
};

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved && Array.isArray(saved.messages) && Array.isArray(saved.rules)) return saved;
  } catch (_) {}
  return clone(seed);
}
let state = loadState();
const previewScreen = new URLSearchParams(location.search).get("preview");
if (["inbox", "quarantine", "search", "rules", "settings"].includes(previewScreen)) {
  state.started = true;
  state.view = previewScreen;
}
const view = document.getElementById("view");
const bottomNav = document.getElementById("bottomNav");
const detailDialog = document.getElementById("detailDialog");
const newMessageDialog = document.getElementById("newMessageDialog");
let toastTimer;

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
}
function h(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
  });
}
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 2600);
}
function count(box) { return state.messages.filter(function (m) { return m.box === box; }).length; }
function sorted(messages) { return messages.slice().sort(function (a, b) { return b.order - a.order; }); }
function titleBlock(eyebrow, title, subtitle) {
  return '<div class="screen-head"><p class="section-eyebrow">' + h(eyebrow) + '</p><h2 class="screen-title">' + h(title) + '</h2><p class="screen-subtitle">' + h(subtitle) + '</p></div>';
}
function empty(title, description) {
  return '<div class="empty-state"><div class="empty-icon">▧</div><strong>' + h(title) + '</strong><p>' + h(description) + '</p></div>';
}
function card(message) {
  const label = message.box === "quarantine" ? "차단함" : message.restored ? "복원됨" : "일반";
  const tagClass = message.box === "quarantine" ? "blocked" : message.restored ? "restored" : "";
  const avatarClass = message.box === "quarantine" ? " quarantine" : "";
  const avatarText = /^\d/.test(message.sender) ? "✉" : message.sender.slice(0, 1);
  return '<button class="message-card" type="button" data-open="' + h(message.id) + '">' +
    '<div class="card-top"><span class="avatar' + avatarClass + '">' + h(avatarText) + '</span><span class="sender">' + h(message.sender) + '</span><span class="time">' + h(message.time) + '</span></div>' +
    '<p class="message-preview">' + h(message.body) + '</p>' +
    '<div class="card-meta"><span class="tag source-tag">SMS</span><span class="tag ' + tagClass + '">' + label + '</span></div></button>';
}
function list(messages, emptyTitle, emptyDescription) {
  return messages.length ? '<div class="message-list">' + sorted(messages).map(card).join("") + '</div>' : empty(emptyTitle, emptyDescription);
}
function renderIntro() {
  return '<p class="section-eyebrow">MESSAGES, MADE CLEAR</p>' +
    '<div class="intro-visual"><div class="intro-orbit"></div><div class="intro-stack"><div class="intro-pill"><span class="pill-icon">✦</span><span><strong>새 메시지</strong><small>택배가 도착했어요</small></span><span class="pill-time">지금</span></div><div class="intro-pill"><span class="pill-icon blocked-icon">−</span><span><strong>차단함</strong><small>광고 문자를 분류했어요</small></span></div><div class="intro-pill"><span class="pill-icon restore-icon">↗</span><span><strong>한 번에 복원</strong><small>중요한 문자라면 다시 받은함으로</small></span></div></div></div>' +
    '<h2 class="screen-title">메시지 관리가<br>가벼워지는 순간.</h2>' +
    '<p class="intro-copy">기존 문자 앱은 그대로 쓰세요. msg-keeper가 수집한 SMS를 별도 목록에서 정리하고, 잘못 걸러진 문자도 다시 살릴 수 있습니다.</p>' +
    '<div class="intro-features"><div class="intro-feature"><span>✓</span>기기 안에서 수집·분류·검색</div><div class="intro-feature"><span>✓</span>차단한 문자도 안전하게 보관</div></div>' +
    '<button class="primary-button full-width" type="button" data-action="start">앱 둘러보기 <span aria-hidden="true">→</span></button>' +
    '<p class="muted" style="text-align:center">실제 SMS 권한은 요청하지 않습니다.</p>';
}
function renderInbox() {
  const messages = state.messages.filter(function (m) { return m.box === "inbox"; });
  return titleBlock("YOUR SPACE", "메시지, 한눈에", "오늘 필요한 소식만 편하게 확인하세요.") +
    '<div class="overview-card"><div class="overview-top"><span class="overview-label">MY MESSAGE SPACE</span><span class="overview-spark">✦</span></div><strong>중요한 문자는<br>놓치지 않도록.</strong><div class="overview-bottom"><span><b>' + count("inbox") + '</b> 받은함</span><span class="overview-divider"></span><span><b>' + count("quarantine") + '</b> 차단함</span></div></div>' +
    (state.permission ? '<div class="notice compact"><span class="notice-dot"></span><span><strong>SMS 수집 켜짐 · 데모</strong>테스트 SMS를 만들어 분류를 확인해 보세요.</span></div>' :
      '<div class="notice warning"><strong>SMS 수집 꺼짐 · 데모</strong>설정에서 켜기 전까지 새 테스트 SMS를 받지 않습니다.</div>') +
    '<div class="list-label"><span>최근 메시지</span><button class="text-button" type="button" data-action="open-search">전체 보기 <span aria-hidden="true">→</span></button></div>' +
    list(messages, "일반 목록이 비어 있어요", "새 테스트 SMS를 만들어 수집 흐름을 확인해 보세요.");
}
function renderQuarantine() {
  const messages = state.messages.filter(function (m) { return m.box === "quarantine"; });
  return titleBlock("SAFE & REVIEWABLE", "차단함", "걸러진 문자도 언제든 다시 살펴보세요.") +
    '<div class="quarantine-hero"><span class="quarantine-emblem">−</span><div><span>보관 중인 메시지</span><strong>' + messages.length + '<small>건</small></strong></div><p>잘못 분류됐다면 메시지를 눌러 바로 복원할 수 있어요.</p></div>' +
    '<div class="notice"><strong>원본 문자는 그대로 남아요</strong>이 차단함은 msg-keeper 내부 분류입니다. 기존 문자 앱의 메시지나 알림은 바꾸지 않습니다.</div>' +
    '<div class="list-label"><span>차단된 메시지</span><span class="muted">' + messages.length + '건</span></div>' +
    list(messages, "차단함이 비어 있어요", "규칙에 걸린 테스트 SMS가 여기에 보입니다.");
}
function filteredSearch() {
  const query = state.searchQuery.trim().toLocaleLowerCase();
  return state.messages.filter(function (m) {
    const matchesBox = state.searchBox === "all" || m.box === state.searchBox;
    return matchesBox && (!query || (m.sender + " " + m.body).toLocaleLowerCase().includes(query));
  });
}
function searchResults() {
  const results = filteredSearch();
  return '<div class="list-label"><span>검색 결과 ' + results.length + '건</span><span class="muted">SMS</span></div>' +
    list(results, "검색 결과가 없어요", "다른 발신자나 문구로 다시 찾아보세요.");
}
function renderSearch() {
  return titleBlock("FIND WHAT MATTERS", "검색", "발신자나 문자 내용을 찾아보세요.") +
    '<label class="field-label" for="searchInput">검색어</label><input id="searchInput" class="text-input" type="search" placeholder="발신자 또는 내용" value="' + h(state.searchQuery) + '">' +
    '<div class="filter-row">' +
    '<button class="filter-chip' + (state.searchBox === "all" ? " active" : "") + '" type="button" data-filter="all">전체</button>' +
    '<button class="filter-chip' + (state.searchBox === "inbox" ? " active" : "") + '" type="button" data-filter="inbox">일반 목록</button>' +
    '<button class="filter-chip' + (state.searchBox === "quarantine" ? " active" : "") + '" type="button" data-filter="quarantine">차단함</button></div>' +
    '<div id="searchResults">' + searchResults() + '</div>';
}
function renderRules() {
  const items = state.rules.map(function (rule) {
    const typeName = rule.kind === "keyword" ? "내용에 포함된 단어" : "발신자에 포함된 문자";
    return '<div class="rule-item"><div class="rule-body"><strong>' + h(rule.value) + '</strong><small>' + typeName + ' · 새 SMS에 적용</small></div>' +
      '<input class="switch" type="checkbox" data-rule-toggle="' + h(rule.id) + '" aria-label="' + h(rule.value) + ' 규칙 사용" ' + (rule.active ? "checked" : "") + '></div>';
  }).join("");
  return titleBlock("AUTOMATIC SORTING", "분류 규칙", "새 SMS에 적용할 기준을 정해요.") +
    '<div class="notice"><strong>규칙이 걸리면</strong>msg-keeper 차단함으로 분류하고 이유를 기록합니다. 복원한 문자에는 다시 적용되지 않습니다.</div>' +
    '<p class="subhead">사용 중인 규칙</p>' + (items || empty("규칙이 없어요", "아래에서 첫 규칙을 추가해 보세요.")) +
    '<div class="divider"></div><p class="subhead">규칙 추가</p>' +
    '<form id="ruleForm" class="rule-form"><select class="select-input" name="kind" aria-label="규칙 종류"><option value="keyword">문자 내용에 포함</option><option value="sender">발신자에 포함</option></select>' +
    '<input class="text-input" name="value" placeholder="예: 광고 또는 080" maxlength="40" required><button class="secondary-button full-width" type="submit">+ 차단함 규칙 추가</button></form>' +
    '<p class="muted">규칙 변경은 이후 들어오는 데모 SMS부터 적용됩니다.</p>';
}
function renderSettings() {
  return titleBlock("YOUR DEVICE", "설정", "수집 상태와 이 와이어프레임의 범위를 확인해요.") +
    '<div class="setting-item"><div class="setting-body"><strong>SMS 수집 · 데모</strong><small>실제 권한이 아닌 화면 시뮬레이션입니다.</small></div>' +
    '<input id="permissionToggle" class="switch" type="checkbox" aria-label="데모 SMS 수집" ' + (state.permission ? "checked" : "") + '></div>' +
    '<div class="setting-item"><div class="setting-body"><strong>기기 안에만 보관</strong><small>서버 로그인·동기화·검색 API 없음</small></div><span class="tag">첫 버전</span></div>' +
    '<div class="setting-item"><div class="setting-body"><strong>차단함 보관 기간</strong><small>Android 앱은 차단함 이동 후 90일 · 데모에서는 자동 삭제 없음</small></div><span class="tag">90일</span></div>' +
    '<div class="divider"></div><div class="notice"><strong>기존 문자 앱 유지</strong>이 화면에서 차단하거나 복원해도 원본 문자 앱의 메시지는 변하지 않습니다.</div>' +
    '<button class="secondary-button full-width" type="button" data-action="reset">데모 데이터 처음으로</button>';
}
function render() {
  bottomNav.style.display = state.started ? "grid" : "none";
  document.getElementById("addMessageButton").style.visibility = state.started ? "visible" : "hidden";
  if (!state.started) {
    view.innerHTML = renderIntro();
  } else {
    const screens = { inbox: renderInbox, quarantine: renderQuarantine, search: renderSearch, rules: renderRules, settings: renderSettings };
    view.innerHTML = (screens[state.view] || renderInbox)();
  }
  bottomNav.querySelectorAll("[data-nav]").forEach(function (button) {
    const selected = state.started && button.dataset.nav === state.view;
    button.classList.toggle("active", selected);
    if (selected) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
}
function navigate(screen) {
  state.view = screen;
  save();
  render();
  view.scrollTop = 0;
}
function openDetail(id) {
  const message = state.messages.find(function (item) { return item.id === id; });
  if (!message) return;
  const isBlocked = message.box === "quarantine";
  const button = isBlocked
    ? '<button class="primary-button full-width" type="button" data-action="restore" data-id="' + h(message.id) + '">일반 목록으로 복원</button>'
    : '<button class="secondary-button full-width" type="button" data-action="block" data-id="' + h(message.id) + '">차단함으로 이동</button>';
  document.getElementById("detailContent").innerHTML =
    '<div class="sheet-content"><div class="sheet-head"><div><span class="eyebrow">MESSAGE DETAIL</span><h2>' + h(message.sender) + '</h2></div>' +
    '<button type="button" class="close-button" data-close-dialog aria-label="닫기">×</button></div>' +
    '<p class="detail-body">' + h(message.body) + '</p><div class="divider"></div>' +
    '<dl class="detail-meta"><dt>출처</dt><dd>SMS · 수집 원문</dd><dt>수신</dt><dd>' + h(message.time) + '</dd><dt>분류</dt><dd>' + (isBlocked ? "차단함" : message.restored ? "복원됨" : "일반 목록") + '</dd>' +
    '<dt>이유</dt><dd>' + h(message.reason || "규칙에 걸리지 않음") + '</dd><dt>원본 문자</dt><dd>기존 문자 앱에 그대로 유지</dd></dl>' +
    '<div class="button-row">' + button + '</div></div>';
  detailDialog.showModal();
}
function classify(sender, body) {
  const matching = state.rules.find(function (rule) {
    if (!rule.active) return false;
    return (rule.kind === "sender" ? sender : body).toLocaleLowerCase().includes(rule.value.toLocaleLowerCase());
  });
  return matching ? { box: "quarantine", reason: (matching.kind === "sender" ? "발신자 규칙 · " : "키워드 규칙 · ") + matching.value } : { box: "inbox", reason: "" };
}
document.addEventListener("click", function (event) {
  const close = event.target.closest("[data-close-dialog]");
  if (close) { close.closest("dialog").close(); return; }
  const nav = event.target.closest("[data-nav]");
  if (nav) { navigate(nav.dataset.nav); return; }
  const filter = event.target.closest("[data-filter]");
  if (filter) { state.searchBox = filter.dataset.filter; save(); render(); return; }
  const message = event.target.closest("[data-open]");
  if (message) { openDetail(message.dataset.open); return; }
  const action = event.target.closest("[data-action]");
  if (!action) return;
  if (action.dataset.action === "start") { state.started = true; save(); render(); return; }
  if (action.dataset.action === "open-search") { navigate("search"); return; }
  if (action.dataset.action === "restore" || action.dataset.action === "block") {
    const item = state.messages.find(function (m) { return m.id === action.dataset.id; });
    if (!item) return;
    if (action.dataset.action === "restore") {
      item.box = "inbox"; item.restored = true; item.reason = "사용자가 복원함 · 재차단 제외";
      showToast("일반 목록으로 복원했어요");
    } else {
      item.box = "quarantine"; item.restored = false; item.reason = "사용자가 직접 이동함";
      showToast("차단함으로 이동했어요");
    }
    detailDialog.close(); save(); render(); return;
  }
  if (action.dataset.action === "reset" && confirm("데모 메시지와 규칙을 처음 상태로 되돌릴까요?")) {
    state = clone(seed); save(); render(); showToast("데모가 초기화됐어요");
  }
});
document.getElementById("addMessageButton").addEventListener("click", function () {
  if (!state.permission) { showToast("설정에서 데모 SMS 수집을 켜 주세요"); return; }
  document.getElementById("newMessageForm").reset();
  newMessageDialog.showModal();
  document.getElementById("senderInput").focus();
});
document.getElementById("newMessageForm").addEventListener("submit", function (event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const sender = String(data.get("sender") || "").trim();
  const body = String(data.get("body") || "").trim();
  if (!sender || !body) return;
  const classification = classify(sender, body);
  state.messages.unshift({
    id: "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    sender: sender, body: body,
    time: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }),
    order: Date.now(), box: classification.box, reason: classification.reason, restored: false
  });
  save(); newMessageDialog.close(); navigate(classification.box);
  showToast(classification.box === "quarantine" ? "규칙에 따라 차단함에 보관했어요" : "일반 목록에 저장했어요");
});
document.addEventListener("submit", function (event) {
  if (event.target.id !== "ruleForm") return;
  event.preventDefault();
  const data = new FormData(event.target);
  const value = String(data.get("value") || "").trim();
  if (!value) return;
  const kind = data.get("kind") === "sender" ? "sender" : "keyword";
  if (state.rules.some(function (rule) { return rule.kind === kind && rule.value.toLocaleLowerCase() === value.toLocaleLowerCase(); })) {
    showToast("이미 같은 규칙이 있어요"); return;
  }
  state.rules.push({ id: "r" + Date.now(), kind: kind, value: value, active: true });
  save(); render(); showToast("새 규칙을 추가했어요");
});
document.addEventListener("change", function (event) {
  if (event.target.id === "permissionToggle") {
    state.permission = event.target.checked; save(); render();
    showToast(state.permission ? "데모 수집을 켰어요" : "데모 수집을 껐어요");
  }
  if (event.target.dataset.ruleToggle) {
    const rule = state.rules.find(function (item) { return item.id === event.target.dataset.ruleToggle; });
    if (rule) { rule.active = event.target.checked; save(); showToast(rule.active ? "규칙을 켰어요" : "규칙을 껐어요"); }
  }
});
document.addEventListener("input", function (event) {
  if (event.target.id !== "searchInput") return;
  state.searchQuery = event.target.value;
  save();
  document.getElementById("searchResults").innerHTML = searchResults();
});
[detailDialog, newMessageDialog].forEach(function (dialog) {
  dialog.addEventListener("click", function (event) {
    if (event.target === dialog) dialog.close();
  });
});
render();
