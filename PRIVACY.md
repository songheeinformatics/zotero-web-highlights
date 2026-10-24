# Privacy Policy — Web Highlights for Zotero

_Last updated: 2026-10-24_

**What the extension does.** When you select text on a web page and choose to save it, the extension sends the selected text, your optional memo, the page URL/title, and bibliographic metadata read from the page (e.g. `citation_*` meta tags, DOI) to **your own Zotero library** via the official Zotero Web API (`https://api.zotero.org`).

**Data stored locally.** Your Zotero API key, user ID, and chosen library/collection are stored only in your browser's local extension storage (`chrome.storage.local`). They are never synced through Google, never sent to the developer, and never sent to any third party other than Zotero.

**Data transmitted.** The only network destination is `api.zotero.org`, using the API key you provide. Nothing is sent anywhere until you explicitly click "Save" (or press the shortcut).

**No analytics, no tracking.** The extension contains no analytics, advertising, or telemetry code. It does not read page content except the text you have selected and the page's meta tags, and only at the moment you save.

**Permissions.**
- `storage`: to keep your API key and settings.
- Host permission `https://api.zotero.org/*`: to write to your Zotero library.
- Content script on web pages: to detect your text selection and show the save button.

**Deleting your data.** Remove the API key in the extension settings or uninstall the extension; all locally stored data is deleted with it. Notes saved in Zotero remain in your Zotero library under your control.

**Contact.** https://github.com/songheeinformatics/zotero-web-highlights/issues
