const $ = (id) => document.getElementById(id);
const apiKeyEl = $('apiKey');
const libEl = $('library');
const colEl = $('collection');
const saveBtn = $('save');

let verified = null; // { userID, username, groups }

function setStatus(el, msg, cls) {
  el.textContent = msg || '';
  el.className = 'status' + (cls ? ' ' + cls : '');
}

function send(msg) {
  return new Promise((resolve) => chrome.runtime.sendMessage(msg, (res) => {
    if (chrome.runtime.lastError) resolve({ ok: false, error: chrome.runtime.lastError.message });
    else resolve(res || { ok: false, error: 'no response' });
  }));
}

function currentPrefix() {
  const v = libEl.value;
  if (!v || !verified) return null;
  return v === 'user' ? `users/${verified.userID}` : `groups/${v.slice(6)}`;
}

async function verify(keepSelection) {
  const apiKey = apiKeyEl.value.trim();
  if (!apiKey) { setStatus($('keyStatus'), 'API 키를 입력하세요.', 'err'); return; }
  setStatus($('keyStatus'), '확인 중…');
  $('verify').disabled = true;
  const res = await send({ type: 'verifyKey', apiKey });
  $('verify').disabled = false;
  if (!res.ok) {
    verified = null;
    const m = /403|FORBIDDEN/.test(res.error) ? '키가 올바르지 않거나 권한이 없습니다.' : res.error;
    setStatus($('keyStatus'), '연결 실패: ' + m, 'err');
    libEl.disabled = true; colEl.disabled = true; saveBtn.disabled = true;
    return;
  }
  verified = res;
  const warn = [];
  if (!res.canWrite) warn.push('쓰기 권한 없음');
  if (!res.canNotes) warn.push('노트 권한 없음');
  setStatus($('keyStatus'),
    `✓ ${res.username} (userID ${res.userID}) 연결됨` + (warn.length ? ` — 주의: ${warn.join(', ')}. 키 권한을 다시 확인하세요.` : ''),
    warn.length ? 'warn' : 'ok');

  const prevLib = keepSelection ? libEl.value : '';
  libEl.innerHTML = '';
  libEl.appendChild(new Option('내 라이브러리 (My Library)', 'user'));
  for (const g of res.groups) libEl.appendChild(new Option(`그룹: ${g.name}`, `group:${g.id}`));
  libEl.disabled = false;
  if (prevLib && [...libEl.options].some((o) => o.value === prevLib)) libEl.value = prevLib;
  await loadCollections(keepSelection);
  saveBtn.disabled = false;
}

async function loadCollections(keepSelection) {
  const prefix = currentPrefix();
  const prevCol = keepSelection ? (window.__savedCollectionKey || '') : '';
  colEl.innerHTML = '';
  colEl.appendChild(new Option('(컬렉션 없음 — 라이브러리 루트)', ''));
  if (!prefix) { colEl.disabled = true; return; }
  setStatus($('libStatus'), '컬렉션 불러오는 중…');
  colEl.disabled = true;
  const res = await send({ type: 'listCollections', apiKey: apiKeyEl.value.trim(), prefix });
  if (!res.ok) { setStatus($('libStatus'), '컬렉션을 불러오지 못했습니다: ' + res.error, 'err'); colEl.disabled = false; return; }
  for (const c of res.collections) colEl.appendChild(new Option(c.name, c.key));
  if (prevCol && [...colEl.options].some((o) => o.value === prevCol)) colEl.value = prevCol;
  colEl.disabled = false;
  setStatus($('libStatus'), `컬렉션 ${res.collections.length}개`, 'ok');
}

async function saveSettings() {
  if (!verified) return;
  const lib = libEl.value;
  const data = {
    apiKey: apiKeyEl.value.trim(),
    userID: verified.userID,
    username: verified.username,
    libraryType: lib === 'user' ? 'user' : 'group',
    libraryID: lib === 'user' ? verified.userID : Number(lib.slice(6)),
    collectionKey: colEl.value || '',
    collectionName: colEl.value ? colEl.options[colEl.selectedIndex].text : ''
  };
  await chrome.storage.local.set(data);
  window.__savedCollectionKey = data.collectionKey;
  setStatus($('saveStatus'), '✓ 저장되었습니다. 이제 아무 웹페이지에서 문장을 드래그해 보세요.', 'ok');
}

async function init() {
  const s = await chrome.storage.local.get(['apiKey', 'libraryType', 'libraryID', 'collectionKey']);
  if (s.apiKey) {
    apiKeyEl.value = s.apiKey;
    window.__savedCollectionKey = s.collectionKey || '';
    // 저장된 라이브러리를 미리 선택해 두고 검증
    libEl.innerHTML = '';
    libEl.appendChild(new Option('…', s.libraryType === 'group' ? `group:${s.libraryID}` : 'user'));
    await verify(true);
  }
}

$('verify').addEventListener('click', () => verify(false));
apiKeyEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') verify(false); });
$('toggleKey').addEventListener('click', () => { apiKeyEl.type = apiKeyEl.type === 'password' ? 'text' : 'password'; });
libEl.addEventListener('change', () => loadCollections(false));
saveBtn.addEventListener('click', saveSettings);
init();
