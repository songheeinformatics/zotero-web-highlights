# Web Highlights for Zotero

웹페이지에서 드래그한 문장과 메모를 **그 페이지의 Zotero 아이템에 노트 하나로 모아** 저장하는 Chrome 확장 프로그램(Manifest V3).

- 문장을 드래그 → 빨간 `Z` 버튼 또는 `Alt+Z` → 메모 입력 → 저장
- 같은 페이지에서 긁은 것은 **노트 하나에 계속 이어붙음** (페이지당 노트 1개, 태그 `web-highlights`)
- 라이브러리에 해당 페이지 아이템이 없으면 서지를 자동 생성
  - `citation_*`/`dc.*` 메타태그나 DOI가 있으면 **학술논문(journalArticle)**, 아니면 **웹페이지(webpage)**
  - 이미 Zotero Connector로 저장해 둔 아이템이 있으면 URL/DOI로 찾아 그 아래에 붙임
- 각 하이라이트에 원문 위치로 가는 텍스트 프래그먼트 링크(`#:~:text=`)와 저장 시각 기록
- API 키는 `chrome.storage.local`에만 저장. 요청은 `api.zotero.org`로만 전송. 중간 서버 없음.

## 설치 (개발자 모드)

1. `chrome://extensions` → 우상단 **개발자 모드** 켜기
2. **압축해제된 확장 프로그램을 로드합니다** → 이 폴더(`zotero-web-highlights`) 선택
3. 설정 페이지가 자동으로 열림 → [zotero.org/settings/keys/new](https://www.zotero.org/settings/keys/new)에서 키 발급
   - **Allow library access / Allow notes access / Allow write access** 모두 체크
4. 키 붙여넣기 → 연결 확인 → 라이브러리·컬렉션 선택 → 저장

## 파일 구조

| 파일 | 역할 |
|---|---|
| `manifest.json` | MV3 매니페스트. 권한은 `storage`와 `api.zotero.org`만 |
| `background.js` | Zotero Web API 호출: 아이템 찾기/생성, 노트 찾기/생성/이어붙이기(412 충돌 재시도, 429 백오프) |
| `content.js` | 드래그 감지, Shadow DOM 기반 버튼·메모 패널, 페이지 메타데이터 추출 |
| `options.html/js` | API 키 검증, 라이브러리(개인/그룹)·컬렉션 선택 |
| `PRIVACY.md` | 웹스토어 제출용 개인정보 처리방침 초안 |

## Zotero에서 보이는 모습

```
📄 페이지 제목 (webpage 또는 journalArticle)
 └ 📝 Web Highlights: 페이지 제목   ← 노트 1개
      > 긁은 문장 1
      💬 메모
      ↗ 원문 위치 · 2026-10-24 15:02
      ───
      > 긁은 문장 2
      ...
```

## 크롬 웹스토어 배포

1. [Chrome Web Store 개발자 대시보드](https://chrome.google.com/webstore/devconsole) 등록 (1회 5달러)
2. 이 폴더를 zip으로 압축 (폴더 자체가 아니라 안의 파일들이 zip 루트에 오도록)
3. 스토어 등록 정보: 설명, 스크린샷 1280×800 최소 1장, 128×128 아이콘(포함됨), 카테고리 "생산성"
4. **개인정보 보호** 탭: `PRIVACY.md` 내용을 공개 URL(GitHub Pages 등)에 올리고 링크. 권한 사용 이유 작성:
   - `storage`: API 키·설정 저장
   - `https://api.zotero.org/*`: 사용자의 Zotero 라이브러리에 저장
   - 콘텐츠 스크립트(모든 사이트): 사용자가 드래그한 텍스트 감지
5. 데이터 사용 공개: "인증 정보(API 키)"를 수집하지만 **기기 외부로 전송하지 않음**(Zotero 제외) 선택
6. 이름에 "Zotero"를 앞세우지 말고 "… for Zotero" 형태 유지(상표 정책)

## 알려진 제한

- Chrome 내장 PDF 뷰어 안에서는 동작하지 않음 (콘텐츠 스크립트 주입 불가). HTML 페이지 전용.
- 저장은 단방향(브라우저 → Zotero). 페이지 재방문 시 하이라이트를 다시 그리지는 않음.
- Zotero 데스크톱에는 다음 싱크 때 반영됨(보통 수 초~수 분, 또는 Zotero에서 수동 싱크).

## 다음 단계 아이디어

- 로컬 Zotero 커넥터 엔드포인트(`127.0.0.1:23119`) 연동으로 즉시 반영 + 공식 translator 메타데이터 활용
- 스냅샷 첨부 + Zotero 7 `annotation` 아이템으로 전환(리더에서 하이라이트가 보이게)
- 재방문 시 하이라이트 복원, 색상 선택
