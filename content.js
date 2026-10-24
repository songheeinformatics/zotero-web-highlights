// Web Highlights for Zotero - content script
// 텍스트를 드래그하면 작은 버튼이 뜨고, 누르면 메모를 적어 Zotero 노트로 저장합니다.
(() => {
  if (window.__zwhLoaded) return;
  window.__zwhLoaded = true;

  let host = null;
  let shadow = null;
  let fab = null;      // 선택 직후 뜨는 작은 버튼
  let panel = null;    // 메모 패널
  let toastEl = null;
  let lastSel = null;  // { text, rect }
  let panelOpen = false;

  const CSS = `
    :host { all: initial; }
    * { box-sizing: border-box; font-family: -apple-system, "Segoe UI", "Malgun Gothic", "Apple SD Gothic Neo", Roboto, sans-serif; }
    .fab {
      position: fixed; z-index: 2147483647; display: none;
      width: 32px; height: 32px; border-radius: 16px; border: none; cursor: pointer;
      background: #cc2936; color: #fff; font-weight: 700; font-size: 15px; line-height: 32px; text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,.25);
    }
    .fab:hover { background: #a81f2b; }
    .panel {
      position: fixed; z-index: 2147483647; display: none; width: 360px; max-width: calc(100vw - 24px);
      background: #fff; color: #222; border-radius: 10px; border: 1px solid #ddd;
      box-shadow: 0 8px 30px rgba(0,0,0,.25); padding: 12px; font-size: 13px;
    }
    .panel h4 { margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #cc2936; display: flex; justify-content: space-between; align-items: center; }
    .panel h4 button { border: none; background: none; cursor: pointer; font-size: 16px; color: #888; }
    .quote { max-height: 110px; overflow: auto; padding: 8px 10px; margin: 0 0 8px; border-left: 3px solid #f2c744; background: #fdf8e6; color: #333; line-height: 1.45; white-space: pre-wrap; }
    textarea { width: 100%; min-height: 72px; resize: vertical; padding: 8px; border: 1px solid #ccc; border-radius: 6px; font-size: 13px; line-height: 1.4; }
    textarea:focus { outline: 2px solid #cc293655; border-color: #cc2936; }
    .row { display: flex; gap: 8px; align-items: center; margin-top: 8px; }
    .row .status { flex: 1; color: #666; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .btn { border: none; border-radius: 6px; padding: 7px 14px; cursor: pointer; font-size: 13px; }
    .btn.primary { background: #cc2936; color: #fff; }
    .btn.primary:disabled { background: #e3a0a6; cursor: default; }
    .btn.ghost { background: #f1f1f1; color: #333; }
    .hint { color: #888; font-size: 11px; margin-top: 6px; }
    .hint a { color: #cc2936; cursor: pointer; text-decoration: underline; }
    .toast {
      position: fixed; z-index: 2147483647; left: 50%; bottom: 28px; transform: translateX(-50%);
      background: #222; color: #fff; padding: 10px 16px; border-radius: 8px; font-size: 13px;
      box-shadow: 0 4px 16px rgba(0,0,0,.3); display: none; max-width: 80vw;
    }
    .toast.err { background: #a81f2b; }
  `;

  function ensureUI() {
    if (host) return;
    host = document.createElement('div');
    host.id = 'zwh-host';
    shadow = host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = CSS;
    shadow.appendChild(style);

    fab = document.createElement('button');
    fab.className = 'fab';
    fab.title = 'Zotero 노트로 저장 (Alt+Z)';
    fab.textContent = 'Z';
    fab.addEventListener('mousedown', (e) => e.preventDefault());
    fab.addEventListener('click', openPanel);
    shadow.appendChild(fab);

    panel = document.createElement('div');
    panel.className = 'panel';
    panel.innerHTML = `
      <h4><span>Zotero에 하이라이트 저장</span><button class="close" title="닫기 (Esc)">×</button></h4>
      <div class="quote"></div>
      <textarea placeholder="메모 (선택) — Ctrl+Enter로 저장"></textarea>
      <div class="row">
        <span class="status"></span>
        <button class="btn ghost cancel">취소</button>
        <button class="btn primary save">저장</button>
      </div>
      <div class="hint"></div>
    `;
    panel.querySelector('.close').addEventListener('click', closePanel);
    panel.querySelector('.cancel').addEventListener('click', closePanel);
    panel.querySelector('.save').addEventListener('click', save);
    panel.querySelector('textarea').addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); save(); }
      e.stopPropagation();
    });
    shadow.appendChild(panel);

    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    shadow.appendChild(toastEl);

    (document.body || document.documentElement).appendChild(host);
  }

  function captureSelection() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const text = sel.toString().replace(/\s+\n/g, '\n').trim();
    if (text.length < 2) return null;
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    return { text, rect };
  }

  function showFab(rect) {
    ensureUI();
    const x = Math.min(window.innerWidth - 40, Math.max(8, rect.right + 6));
    const y = Math.min(window.innerHeight - 40, Math.max(8, rect.top - 36));
    fab.style.left = `${x}px`;
    fab.style.top = `${y}px`;
    fab.style.display = 'block';
  }

  function hideFab() { if (fab) fab.style.display = 'none'; }

  function openPanel() {
    if (!lastSel) { toast('먼저 텍스트를 드래그해서 선택하세요', true); return; }
    ensureUI();
    hideFab();
    panelOpen = true;
    panel.querySelector('.quote').textContent = lastSel.text;
    panel.querySelector('.status').textContent = '';
    panel.querySelector('.hint').textContent = '';
    const saveBtn = panel.querySelector('.save');
    saveBtn.disabled = false;
    saveBtn.textContent = '저장';
    panel.style.display = 'block';
    const r = lastSel.rect;
    const pw = panel.offsetWidth || 360;
    const ph = panel.offsetHeight || 220;
    let x = r.left;
    let y = r.bottom + 10;
    if (x + pw > window.innerWidth - 12) x = window.innerWidth - pw - 12;
    if (x < 12) x = 12;
    if (y + ph > window.innerHeight - 12) y = Math.max(12, r.top - ph - 10);
    panel.style.left = `${x}px`;
    panel.style.top = `${y}px`;
    const ta = panel.querySelector('textarea');
    ta.value = '';
    ta.focus();
  }

  function closePanel() {
    if (!panel) return;
    panel.style.display = 'none';
    panelOpen = false;
    hideFab();
  }

  let toastTimer = null;
  function toast(msg, isErr) {
    ensureUI();
    toastEl.textContent = msg;
    toastEl.className = 'toast' + (isErr ? ' err' : '');
    toastEl.style.display = 'block';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.style.display = 'none'; }, isErr ? 5000 : 3000);
  }

  // ---------- 페이지 메타데이터 ----------

  function metaAll(name) {
    const sel = `meta[name="${name}" i], meta[property="${name}" i]`;
    return Array.from(document.querySelectorAll(sel)).map((m) => (m.getAttribute('content') || '').trim()).filter(Boolean);
  }
  function metaFirst(...names) {
    for (const n of names) { const v = metaAll(n)[0]; if (v) return v; }
    return '';
  }
  const DOI_RE = /10\.\d{4,9}\/[^\s"<>#?]+/;
  function extractDoi() {
    const candidates = [
      metaFirst('citation_doi', 'dc.identifier', 'dc.identifier.doi', 'prism.doi', 'doi'),
      location.href
    ];
    for (const c of candidates) {
      const m = (c || '').match(DOI_RE);
      if (m) return m[0].replace(/[.,;)]+$/, '');
    }
    return '';
  }
  function extractMeta() {
    let authors = metaAll('citation_author');
    if (!authors.length) authors = metaAll('dc.creator');
    if (!authors.length) {
      const a = metaFirst('author', 'article:author', 'parsely-author');
      if (a && !/^https?:/.test(a)) authors = a.split(/\s*[;,]\s*|\s+and\s+/).filter(Boolean).slice(0, 10);
    }
    const title = metaFirst('citation_title', 'dc.title', 'og:title') || document.title || '';
    return {
      doi: extractDoi(),
      title: title.trim(),
      authors,
      journal: metaFirst('citation_journal_title', 'prism.publicationName', 'citation_conference_title'),
      volume: metaFirst('citation_volume', 'prism.volume'),
      issue: metaFirst('citation_issue', 'prism.number'),
      firstpage: metaFirst('citation_firstpage', 'prism.startingPage'),
      lastpage: metaFirst('citation_lastpage', 'prism.endingPage'),
      date: metaFirst('citation_publication_date', 'citation_date', 'citation_online_date', 'dc.date', 'dc.date.issued',
        'article:published_time', 'datePublished', 'date', 'pubdate'),
      siteName: metaFirst('og:site_name', 'application-name', 'publisher', 'dc.publisher'),
      description: metaFirst('description', 'og:description'),
      abstract: metaFirst('citation_abstract', 'dc.description', 'dcterms.abstract'),
      lang: (document.documentElement.getAttribute('lang') || metaFirst('dc.language', 'citation_language') || '').slice(0, 10)
    };
  }

  // Chrome의 텍스트 프래그먼트(#:~:text=) 링크 생성
  function fragmentUrl(text) {
    const enc = (s) => encodeURIComponent(s).replace(/-/g, '%2D');
    const base = location.href.split('#')[0];
    const flat = text.replace(/\s+/g, ' ').trim();
    const words = flat.split(' ');
    let frag;
    if (words.length <= 10) frag = enc(flat);
    else frag = enc(words.slice(0, 5).join(' ')) + ',' + enc(words.slice(-5).join(' '));
    return `${base}#:~:text=${frag}`;
  }

  // ---------- 저장 ----------

  function save() {
    if (!lastSel) return;
    const saveBtn = panel.querySelector('.save');
    const status = panel.querySelector('.status');
    const hint = panel.querySelector('.hint');
    const memo = panel.querySelector('textarea').value;
    saveBtn.disabled = true;
    saveBtn.textContent = '저장 중…';
    status.textContent = 'Zotero에서 아이템 확인 중…';
    hint.textContent = '';

    const payload = {
      url: location.href,
      title: document.title,
      text: lastSel.text,
      memo,
      fragmentUrl: fragmentUrl(lastSel.text),
      meta: extractMeta()
    };

    chrome.runtime.sendMessage({ type: 'save', payload }, (res) => {
      if (chrome.runtime.lastError || !res) {
        fail('확장 프로그램과 통신 실패. 페이지를 새로고침해 보세요.');
        return;
      }
      if (!res.ok) {
        if (res.error === 'NO_KEY') {
          status.textContent = 'Zotero API 키가 설정되지 않았습니다.';
          hint.innerHTML = '<a class="open-opt">설정 열기</a>에서 키를 넣어 주세요.';
          hint.querySelector('.open-opt').addEventListener('click', () => chrome.runtime.sendMessage({ type: 'openOptions' }));
          saveBtn.disabled = false; saveBtn.textContent = '저장';
          return;
        }
        if (res.error === 'FORBIDDEN') {
          fail('권한 거부: API 키에 쓰기/노트 권한이 있는지 확인하세요.');
          return;
        }
        fail(res.error || '알 수 없는 오류');
        return;
      }
      const what = res.created ? '새 아이템 생성 후 노트 저장' : '기존 아이템 노트에 추가';
      toast(`✓ ${what}: ${(res.title || '').slice(0, 60)}`);
      closePanel();
      window.getSelection && window.getSelection().removeAllRanges();
    });

    function fail(msg) {
      status.textContent = '';
      hint.textContent = msg;
      saveBtn.disabled = false;
      saveBtn.textContent = '다시 시도';
    }
  }

  // ---------- 이벤트 ----------

  document.addEventListener('mouseup', (e) => {
    if (host && e.composedPath().includes(host)) return;
    setTimeout(() => {
      const s = captureSelection();
      if (s) {
        lastSel = s;
        if (panelOpen) {
          panel.querySelector('.quote').textContent = s.text; // 패널이 열린 채로 새 문장을 긁으면 인용만 교체
        } else {
          showFab(s.rect);
        }
      } else if (!panelOpen) {
        hideFab();
      }
    }, 10);
  }, true);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panelOpen) closePanel();
  }, true);

  document.addEventListener('scroll', () => { if (!panelOpen) hideFab(); }, { passive: true, capture: true });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === 'open-panel') {
      const s = captureSelection();
      if (s) lastSel = s;
      openPanel();
    }
  });
})();
