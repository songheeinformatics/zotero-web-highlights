# 크롬 웹스토어 제출 — 붙여넣기용 텍스트

개발자 콘솔: https://chrome.google.com/webstore/devconsole

## 0. 계정 설정 (settings 페이지, 최초 1회)
- 게시자 표시 이름: `songheeinformatics` (원하는 이름으로)
- 연락처 이메일: 본인 이메일 입력 후 **인증 메일 확인** (이게 안 되면 제출 버튼이 비활성화됨)
- 거래 관련 이메일 수신 동의 체크

## 1. 새 항목
좌측 상단 **+ 새 항목** → `zotero-web-highlights-0.1.0.zip` 업로드

## 2. 스토어 등록정보 탭

**제목(자동, manifest에서):** Web Highlights for Zotero

**요약 (132자 이내):**
```
웹에서 드래그한 문장과 메모를 그 페이지의 Zotero 아이템에 노트로 바로 저장합니다.
```

**설명:**
```
웹페이지를 읽다가 문장을 드래그하면 작은 Z 버튼이 뜹니다. 누르고 메모를 적어 저장하면, 그 페이지에 해당하는 Zotero 아이템 아래에 노트로 쌓입니다.

주요 기능
• 드래그 → 메모 → 저장. 단축키 Alt+Z, Ctrl+Enter로 저장
• 같은 페이지의 하이라이트는 노트 하나에 계속 이어붙습니다 (페이지당 노트 1개)
• 라이브러리에 해당 페이지 아이템이 없으면 서지를 자동 생성합니다. 논문 메타태그나 DOI가 있으면 학술논문(journalArticle), 아니면 웹페이지(webpage)
• 이미 Zotero Connector로 저장한 아이템이 있으면 URL/DOI로 찾아 그 아래에 붙입니다
• 각 하이라이트에 원문 위치로 바로 가는 링크(텍스트 프래그먼트)와 저장 시각을 기록
• 개인 라이브러리와 그룹 라이브러리, 컬렉션 선택 지원

설정
1. zotero.org/settings/keys/new 에서 API 키 생성 (library, notes, write 권한 체크)
2. 확장 프로그램 설정에서 키 입력 → 연결 확인 → 라이브러리·컬렉션 선택

개인정보
API 키는 브라우저의 로컬 저장소에만 보관되며, 요청은 api.zotero.org로만 전송됩니다. 개발자나 제3자 서버로 전송되는 데이터는 없습니다. 분석·추적 코드가 없습니다.

제한
Chrome 내장 PDF 뷰어 안에서는 동작하지 않습니다(HTML 페이지 전용).

오픈소스: https://github.com/songheeinformatics/zotero-web-highlights
이 확장 프로그램은 Zotero 프로젝트와 무관한 독립 프로젝트입니다.
```

**카테고리:** 생산성 → 도구 (또는 "학습 및 교육")
**언어:** 한국어

**스토어 아이콘 (128×128):** `icons/icon128.png`
**스크린샷 (1280×800):** `store/screenshot-demo-highlight.png`, `store/screenshot-demo-note.png`

**공식 URL / 홈페이지:** https://github.com/songheeinformatics/zotero-web-highlights
**지원 URL:** https://github.com/songheeinformatics/zotero-web-highlights/issues

## 3. 개인정보 보호 탭

**단일 용도 설명:**
```
사용자가 웹페이지에서 선택한 텍스트와 메모를 사용자 본인의 Zotero 라이브러리에 노트로 저장합니다.
```

**권한 사용 이유:**
- `storage`:
  ```
  사용자가 입력한 Zotero API 키와 저장 위치(라이브러리·컬렉션) 설정을 브라우저 로컬에 보관하기 위해 필요합니다.
  ```
- 호스트 권한 `https://api.zotero.org/*`:
  ```
  사용자의 Zotero 라이브러리에 아이템과 노트를 생성·수정하기 위해 Zotero 공식 Web API를 호출합니다.
  ```
- 콘텐츠 스크립트 (`http://*/*`, `https://*/*`):
  ```
  모든 웹페이지에서 사용자의 텍스트 드래그(선택)를 감지해 저장 버튼을 표시하기 위해 필요합니다. 페이지 내용은 사용자가 선택한 텍스트와 서지 메타태그만, 저장 버튼을 누른 순간에만 읽습니다.
  ```

**원격 코드 사용 여부:** 아니요, 원격 코드를 사용하지 않습니다.

**데이터 사용:**
- 수집하는 데이터 종류: ☑ **인증 정보** (API 키), ☑ **웹사이트 콘텐츠** (사용자가 선택한 텍스트·메모)
- 인증: 아래 세 가지 모두 체크
  - 승인된 용도 외로 사용자 데이터를 판매·전송하지 않음
  - 항목의 단일 용도와 무관한 목적으로 사용자 데이터를 사용·전송하지 않음
  - 신용도 판단이나 대출 목적으로 사용자 데이터를 사용·전송하지 않음

**개인정보처리방침 URL:**
```
https://songheeinformatics.github.io/zotero-web-highlights/PRIVACY
```

## 4. 배포 탭
- 공개 상태: **공개**
- 지역: 모든 지역

## 5. 검토를 위해 제출
우측 상단 **검토를 위해 제출** → "검토 통과 후 자동 게시" 체크 → 제출. 심사는 보통 1~3일.
