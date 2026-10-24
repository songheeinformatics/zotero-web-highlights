// Web Highlights for Zotero - background service worker
// 모든 요청은 사용자 브라우저에서 api.zotero.org로 직접 전송됩니다. 중간 서버 없음.

const API = 'https://api.zotero.org';
const MARK_TAG = 'web-highlights';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getSettings() {
  return chrome.storage.local.get([
    'apiKey', 'userID', 'username', 'libraryType', 'libraryID', 'collectionKey', 'collectionName'
  ]);
}

function libPrefix(s) {
  return s.libraryType === 'group' ? `groups/${s.libraryID}` : `users/${s.userID}`;
}

async function api(path, { method = 'GET', body, headers = {}, apiKey } = {}) {
  if (!apiKey) throw new Error('NO_KEY');
  const res = await fetch(API + path, {
    method,
    headers: {
      'Zotero-API-Key': apiKey,
      'Zotero-API-Version': '3',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (res.status === 429) {
    const wait = Number(res.headers.get('Retry-After') || res.headers.get('Backoff') || 2);
    await sleep(Math.min(wait, 30) * 1000);
    return api(path, { method, body, headers, apiKey });
  }
  if (res.status === 403) throw new Error('FORBIDDEN');
  return res;
}

async function apiJson(path, opts) {
  const res = await api(path, opts);
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${t.slice(0, 200)}`);
  }
  return { res, json: res.status === 204 ? null : await res.json().catch(() => null) };
}

// ---------- key / library helpers ----------

async function verifyKey(apiKey) {
  const { json } = await apiJson('/keys/current', { apiKey });
  const userAccess = (json.access && json.access.user) || {};
  const groups = [];
  const { json: groupList } = await apiJson(`/users/${json.userID}/groups?limit=100`, { apiKey });
  for (const g of groupList || []) groups.push({ id: g.id, name: (g.data && g.data.name) || `Group ${g.id}` });
  return {
    userID: json.userID,
    username: json.username,
    canWrite: !!userAccess.write,
    canNotes: !!userAccess.notes,
    groups
  };
}

async function listCollections(apiKey, prefix) {
  const out = [];
  let start = 0;
  for (;;) {
    const { res, json } = await apiJson(`/${prefix}/collections?limit=100&start=${start}`, { apiKey });
    for (const c of json || []) {
      out.push({ key: c.key, name: c.data.name, parent: c.data.parentCollection || null });
    }
    const total = Number(res.headers.get('Total-Results') || 0);
    start += 100;
    if (!json || json.length < 100 || start >= total) break;
  }
  // 상위 컬렉션 이름을 앞에 붙여 "부모 / 자식" 형태로 표시
  const byKey = Object.fromEntries(out.map((c) => [c.key, c]));
  const fullName = (c) => {
    const parts = [c.name];
    let p = c.parent;
    let guard = 0;
    while (p && byKey[p] && guard++ < 10) { parts.unshift(byKey[p].name); p = byKey[p].parent; }
    return parts.join(' / ');
  };
  return out.map((c) => ({ key: c.key, name: fullName(c) })).sort((a, b) => a.name.localeCompare(b.name));
}

// ---------- URL / text helpers ----------

function normalizeUrl(u) {
  try {
    const url = new URL(u);
    url.hash = '';
    const drop = [];
    url.searchParams.forEach((_, k) => { if (/^(utm_|fbclid|gclid|ref$|source$)/i.test(k)) drop.push(k); });
    drop.forEach((k) => url.searchParams.delete(k));
    let s = url.toString();
    if (s.endsWith('/') && url.pathname !== '/') s = s.slice(0, -1);
    return s;
  } catch (e) { return u; }
}

function sameUrl(a, b) {
  if (!a || !b) return false;
  const strip = (x) => normalizeUrl(x).replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '').toLowerCase();
  return strip(a) === strip(b);
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function parseAuthor(raw) {
  const name = String(raw || '').trim();
  if (!name) return null;
  if (name.includes(',')) {
    const [last, first] = name.split(',').map((x) => x.trim());
    return { creatorType: 'author', lastName: last, firstName: first || '' };
  }
  const parts = name.split(/\s+/);
  if (parts.length === 1 || /[ㄱ-힝]/.test(name)) {
    return { creatorType: 'author', name };
  }
  return { creatorType: 'author', lastName: parts.pop(), firstName: parts.join(' ') };
}

function normDate(d) {
  if (!d) return '';
  const m = String(d).match(/(\d{4})[-/.](\d{1,2})(?:[-/.](\d{1,2}))?/);
  if (m) return [m[1], m[2].padStart(2, '0'), m[3] ? m[3].padStart(2, '0') : null].filter(Boolean).join('-');
  const y = String(d).match(/\d{4}/);
  return y ? y[0] : String(d);
}

// ---------- item lookup / creation ----------

async function searchTop(apiKey, prefix, q, qmode) {
  if (!q) return [];
  const { json } = await apiJson(
    `/${prefix}/items/top?q=${encodeURIComponent(q)}&qmode=${qmode}&limit=50`, { apiKey }
  );
  return (json || []).filter((it) => it.data && it.data.itemType !== 'attachment' && it.data.itemType !== 'note');
}

async function findParent(apiKey, prefix, url, meta) {
  if (meta.doi) {
    const hits = await searchTop(apiKey, prefix, meta.doi, 'everything');
    const hit = hits.find((it) => (it.data.DOI || '').toLowerCase() === meta.doi.toLowerCase());
    if (hit) return hit;
  }
  let hits = await searchTop(apiKey, prefix, url, 'everything');
  let hit = hits.find((it) => sameUrl(it.data.url, url));
  if (hit) return hit;
  // URL 검색이 실패하면 제목으로 찾은 뒤 URL로 재확인
  if (meta.title) {
    hits = await searchTop(apiKey, prefix, meta.title.slice(0, 80), 'titleCreatorYear');
    hit = hits.find((it) => sameUrl(it.data.url, url));
    if (hit) return hit;
  }
  return null;
}

function buildParentItem(p, url, settings) {
  const m = p.meta || {};
  const creators = (m.authors || []).map(parseAuthor).filter(Boolean);
  const accessDate = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  let item;
  if (m.doi || m.journal) {
    item = {
      itemType: 'journalArticle',
      title: m.title || p.title || url,
      creators,
      publicationTitle: m.journal || '',
      volume: m.volume || '',
      issue: m.issue || '',
      pages: m.firstpage ? (m.lastpage ? `${m.firstpage}-${m.lastpage}` : m.firstpage) : '',
      date: normDate(m.date),
      DOI: m.doi || '',
      url,
      accessDate,
      language: m.lang || '',
      abstractNote: m.abstract || ''
    };
  } else {
    let host = '';
    try { host = new URL(url).hostname; } catch (e) { host = ''; }
    item = {
      itemType: 'webpage',
      title: m.title || p.title || url,
      creators,
      websiteTitle: m.siteName || host,
      date: normDate(m.date),
      url,
      accessDate,
      language: m.lang || '',
      abstractNote: m.description || ''
    };
  }
  item.tags = [];
  item.collections = settings.collectionKey ? [settings.collectionKey] : [];
  return item;
}

async function createItems(apiKey, prefix, items) {
  const { json } = await apiJson(`/${prefix}/items`, { method: 'POST', body: items, apiKey });
  const ok = (json && json.successful && json.successful['0']) || (json && json.success && json.success['0']);
  if (!ok) {
    const f = json && json.failed && json.failed['0'];
    throw new Error(`아이템 생성 실패: ${f ? f.message : JSON.stringify(json).slice(0, 200)}`);
  }
  if (typeof ok === 'string') {
    const { json: it } = await apiJson(`/${prefix}/items/${ok}`, { apiKey });
    return it;
  }
  return ok;
}

async function findNote(apiKey, prefix, parentKey) {
  const { json } = await apiJson(
    `/${prefix}/items/${parentKey}/children?itemType=note&tag=${encodeURIComponent(MARK_TAG)}&limit=10`, { apiKey }
  );
  return (json || [])[0] || null;
}

function noteHeader(p, url) {
  return `<p><strong>Web Highlights: ${esc(p.title || url)}</strong></p>` +
    `<p><a href="${esc(url)}">${esc(url)}</a></p><hr>`;
}

function renderBlock(p) {
  const when = new Date().toLocaleString('ko-KR', { hour12: false });
  const memo = (p.memo || '').trim();
  let html = `<blockquote><p>${esc(p.text).replace(/\n+/g, '</p><p>')}</p></blockquote>`;
  if (memo) html += `<p>💬 ${esc(memo).replace(/\n/g, '<br>')}</p>`;
  html += `<p><a href="${esc(p.fragmentUrl || p.url)}">↗ 원문 위치</a> · ${esc(when)}</p><hr>`;
  return html;
}

async function appendToNote(apiKey, prefix, note, block, attempt = 0) {
  const body = { note: (note.data.note || '') + block };
  const res = await api(`/${prefix}/items/${note.key}`, {
    method: 'PATCH', body, apiKey, headers: { 'If-Unmodified-Since-Version': String(note.version) }
  });
  if (res.status === 412 && attempt < 2) {
    const { json: fresh } = await apiJson(`/${prefix}/items/${note.key}`, { apiKey });
    return appendToNote(apiKey, prefix, fresh, block, attempt + 1);
  }
  if (!res.ok) throw new Error(`노트 수정 실패 (${res.status})`);
}

async function saveHighlight(p) {
  const s = await getSettings();
  if (!s.apiKey || !s.userID) throw new Error('NO_KEY');
  const apiKey = s.apiKey;
  const prefix = libPrefix(s);
  const url = normalizeUrl(p.url);
  const meta = p.meta || {};

  let parent = await findParent(apiKey, prefix, url, meta);
  let created = false;
  if (!parent) {
    parent = await createItems(apiKey, prefix, [buildParentItem(p, url, s)]);
    created = true;
  }

  const block = renderBlock({ ...p, url });
  const note = created ? null : await findNote(apiKey, prefix, parent.key);
  if (note) {
    await appendToNote(apiKey, prefix, note, block);
  } else {
    await createItems(apiKey, prefix, [{
      itemType: 'note',
      parentItem: parent.key,
      note: noteHeader(p, url) + block,
      tags: [{ tag: MARK_TAG }]
    }]);
  }
  return { ok: true, created, title: (parent.data && parent.data.title) || p.title, parentKey: parent.key };
}

// ---------- messaging ----------

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      switch (msg.type) {
        case 'save':
          return sendResponse(await saveHighlight(msg.payload));
        case 'verifyKey':
          return sendResponse({ ok: true, ...(await verifyKey(msg.apiKey)) });
        case 'listCollections':
          return sendResponse({ ok: true, collections: await listCollections(msg.apiKey, msg.prefix) });
        case 'hasKey': {
          const s = await getSettings();
          return sendResponse({ ok: true, hasKey: !!(s.apiKey && s.userID) });
        }
        case 'openOptions':
          chrome.runtime.openOptionsPage();
          return sendResponse({ ok: true });
        default:
          return sendResponse({ ok: false, error: 'unknown message' });
      }
    } catch (e) {
      sendResponse({ ok: false, error: e.message || String(e) });
    }
  })();
  return true;
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'save-highlight') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.id) chrome.tabs.sendMessage(tab.id, { type: 'open-panel' }).catch(() => {});
});

chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());

chrome.runtime.onInstalled.addListener((d) => {
  if (d.reason === 'install') chrome.runtime.openOptionsPage();
});
