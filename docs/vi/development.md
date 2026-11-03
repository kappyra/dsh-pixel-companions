# Phát triển

[English](../development.md) | [中文](../zh/development.md) | [Русский](../ru/development.md) | Tiếng Việt | [日本語](../ja/development.md) | [한국어](../ko/development.md)

## Cấu trúc thư mục

```text
package.json              bundle manifest: dsh.bundle.patch + dsh.client
cordis.patch.yml          inserts the ui-pixel-companions row
index.js                  Host half (empty apply; the Client module does the work)
client.js                 generated browser bundle (committed, ~94 KiB)
icon.svg                  plugin inventory icon
locale/*.json             meta.title / meta.description, six languages
src/client/index.ts       registers the slot entries (overlay, bridge, Settings row)
src/client/Pet.tsx        exports Companion (draggable overlay, settings panel)
                          and CompanionBridge (hidden composer-slot entry)
src/client/bridge.ts      companion facts store and publisher/subscriber hooks
src/client/prefs.ts       shared client-local preferences store (usePrefs/updatePrefs/updatePrefsSoon)
src/client/SizeSettingsRow.tsx  Settings → General companion-size row
src/client/signals.ts     pure projections: live bits, streams, report/detail text, scale clamp
src/client/asset-url.ts   resolves asset-route references through require.asset
src/client/state.ts       SCENES + deriveScene + observed-fact types
src/client/text.ts        LANGUAGES, SCENE_LABELS, UI_TEXT, languageFromTag
src/client/desktop.ts     optional localhost bridge to the desktop window
src/client/assets.generated.ts  generated asset-route refs (committed, ~11 KiB)
assets/girl/*.webp|png    canonical art (pack v2 style, 15 scenes + 18 reactions)
assets/whale/*.webp|png   canonical v3 matte art (15 scenes + 18 reactions)
assets/whale/roaming.*    optional desk-free movement asset for Deepy
source-art/*.gif          pre-v3 sources for tools/build_assets.py (do not rerun)
tools/build-assets.mjs    assets/ -> content-hashed refs in assets.generated.ts
tools/build-client.mjs    src/client/index.ts -> client.js
tools/build_assets.py     legacy pre-v3 generator (see the caution below)
tests/state.test.ts       scene rules (8 tests)
tests/signals.test.ts     live bits, streams, report/detail helpers, scale clamp (8 tests)
tests/text.test.ts        translation completeness (4 tests)
demo/                     offline preview page and stills (regenerated from v3 art)
desktop/companion.py      standalone GTK 3 desktop window + localhost bridge
desktop/requirements.txt  PyGObject>=3.42, Pillow>=10
desktop/run.sh            launcher (python3 desktop/companion.py)
desktop/README.md         short desktop quickstart
```

## Lệnh

```sh
npm install              # esbuild (dev only)
npm run build            # build the asset manifest, then bundle client.js
npm run assets           # regenerate only src/client/assets.generated.ts
npm test                 # node --experimental-strip-types --test tests/*.test.ts
npm run check:docs       # links + structure across all six languages
python3 -m py_compile desktop/companion.py   # syntax-check the desktop half
python3 desktop/companion.py --self-test     # headless desktop acceptance test
```

`npm run build` gồm hai bước, và mỗi bước chạy độc lập:

- `node tools/build-assets.mjs` quét `assets/` và ghi lại `src/client/assets.generated.ts` (khoảng
  5 KiB) với các tham chiếu route asset của plugin dạng
  `plugins/dsh-pixel-companions/assets/<character>/<scene>.<webp|png>?v=<sha1-8>`. Query là 8 ký
  tự hex đầu trong SHA-1 của file, nên một sprite thay đổi sẽ có URL mới. Nó báo lỗi nếu một
  nhân vật/cảnh thiếu `.webp` hoặc `.png`.
- `node tools/build-client.mjs` bundle TypeScript bằng esbuild, giữ `react` ở dạng external,
  bọc output trong `window.__ModuleLoader__.load({ id: "dsh-pixel-companions", factory })`, và
  ghi `client.js` (khoảng 72 KiB). Bước parse `--check` của esbuild (`node --check`) là một phần
  của build.

`npm run assets` chỉ là bước đầu; dùng khi bạn chỉ cần làm mới các tham chiếu.

## Cấu trúc của bundle trình duyệt

Harness tải mọi plugin trình duyệt qua module loader của trang:

```js
window.__ModuleLoader__.load({
  id: 'dsh-pixel-companions',      // must equal the package name
  factory(require) {
    // compiled CommonJS module; require('react') resolves from the page's module table
    return module.exports           // { inject, apply }
  },
});
```

Vì vậy, `react` không bao giờ bị bundle: mã đã biên dịch gọi `require('react')`, và loader trả
lời từ vendor bundle của shell (React 18.3.1 trong bản phát hành đã kiểm chứng). Bundle thêm
một React thứ hai sẽ làm hỏng hook.

## Cách phân phối sprite

Sprite **không được nhúng** trong bundle. `package.json` export `"./assets/*": "./assets/*"`, nên route asset của Harness phục vụ chính hình ảnh của package tại
`plugins/dsh-pixel-companions/assets/<character>/<scene>.<webp|png>?v=<sha1-8>`.

- `src/client/assets.generated.ts` chứa các tham chiếu đó, không phải byte ảnh.
- `src/client/asset-url.ts` phân giải một tham chiếu qua helper `require.asset(...)` của loader
  khi helper này tồn tại, và nếu không thì fallback về tham chiếu tương đối với document.
- Trình duyệt tải một sprite theo nhu cầu cho nhân vật/cảnh hiện tại (và cho cảnh kia khi nó
  đổi), thay vì parse 62 ảnh nhúng lúc khởi động.
- Mỗi URL là bất biến theo hash nội dung, nên trình duyệt có thể cache dài hạn; query
  `?v=<sha1-8>` phá cache đó mỗi khi file thay đổi.

Bundle JS đã commit vẫn khoảng 72 KiB; hình ảnh đi kèm dưới dạng file thường trong `assets/`.
Chạy `npm run build` sau khi đổi hình ảnh là việc cập nhật manifest và bundle.

## Cách các entry trong slot hoạt động

`src/client/index.ts` inject ba entry:

| Slot | Entry | Đăng ký |
| --- | --- | --- |
| `conversation.input.dock` | `CompanionBridge` (render `null`) | `{ name: 'conversation.input.dock', id: 'kappy-pixel-companions.bridge', order: 80 }` |
| `shell.overlay` | `Companion` (overlay kéo được) | `{ name: 'shell.overlay', id: 'kappy-pixel-companions', order: 50 }` |
| `settings.general.item` | `SizeSettingsRow` (Cài đặt → Chung) | `{ name: 'settings.general.item', id: 'pixel-companions-size', order: 40 }` |

`conversation.input.dock` là slot duy nhất nhận `SessionSnapshot`, `InputState`, Chat snapshot
và các action của khung soạn tin theo từng phiên, nên `CompanionBridge` công bố các fact đó
(cộng cờ tương tác đang chờ từ `useSessionStatus`) vào module store trong
`src/client/bridge.ts`. Bridge shallow-diff các fact của nó và chỉ công bố khi một trường thay
đổi; hoạt động của người dùng như gõ phím làm mới đồng hồ nhàn rỗi (tối đa một lần mỗi 5 giây
khi gõ bản nháp) mà không đổi cảnh. Nó cũng trích toàn bộ câu trả lời đã ổn định một lần cho mỗi
node assistant đã ổn định vào `CompanionFacts.detail` (giới hạn 8000 ký tự) và đóng băng cả
`report` lẫn `detail` trong khi một lượt đang chạy, công bố chúng lúc dừng; `detail` ở lại trong
trang và không bao giờ được gửi qua bridge desktop. Khi nó unmount, `useDisconnectOnUnmount`
công bố `connected: false` và giữ các fact cuối; overlay sau đó chuyển sang hành vi
idle/sleeping.

`shell.overlay` phủ toàn khung, nên `Companion` có thể nổi trên mọi cột ở mọi trang. Nó đọc
store qua `useCompanionFacts()`, cũng subscribe vào `useSessionStatus` (để một phê duyệt đang
chờ vẫn hiện ngoài cuộc trò chuyện), suy ra cảnh bằng `deriveScene`, và vẽ sprite tại vị trí đã
kéo. Lớp overlay cho phép nhấp xuyên qua; chỉ sprite, nút bánh răng của nó và panel cài đặt
nhận sự kiện con trỏ. Đồng hồ 1 giây và việc dò health/heartbeat desktop tạm dừng khi tab bị
ẩn, và báo cáo hoàn thành được thông báo qua `role="status"` / `aria-live="polite"`.

`settings.general.item` là danh sách General tiêu chuẩn của host. `SizeSettingsRow` chỉ render
các control kích thước bạn đồng hành (tiêu đề, mô tả, slider, nút −/+, hiển thị trực tiếp và các
preset 50/100/150/200%). Nó dùng chung `src/client/prefs.ts` (`usePrefs` / `updatePrefs` /
`updatePrefsSoon`) với popover của bạn đồng hành, nên bề mặt nào thay đổi thì bề mặt kia cập
nhật ngay và cả hai cùng lưu vào `localStorage` dưới `kappy.pixel-companions.ui.v1` với debounce
180 ms và một lần flush khi `pagehide`.

Các cú kéo slider tần số cao gọi `updatePrefsSoon`, hàm này gộp cập nhật tối đa một lần mỗi
frame (`requestAnimationFrame`, fallback timeout 16 ms); các lần nhấp preset và −/+ dùng
`updatePrefs`, hàm này bỏ qua các patch không thay đổi gì. Overlay chỉ giới hạn lại vị trí đã
lưu khi sprite đã scale thực sự rời viewport, lưới xem trước cảnh và card xem trước desktop được
bọc trong `React.memo`, và việc phản chiếu desktop được debounce khoảng 140 ms.

## Chỉnh sửa hành vi

- Rule cảnh: `src/client/state.ts`, test trong `tests/state.test.ts`.
- Các phép chiếu thuần từ Chat snapshot/báo cáo: `src/client/signals.ts`, test trong
  `tests/signals.test.ts`.
- Phụ đề, chữ trong cài đặt và danh sách sáu ngôn ngữ: `src/client/text.ts`, test trong
  `tests/text.test.ts`.
- Markup overlay, kéo bằng con trỏ, panel cài đặt, style: `src/client/Pet.tsx`.
- Store fact, diff bản nháp và vòng đời bridge: `src/client/bridge.ts`.
- Tuỳ chọn cục bộ phía client dùng chung (`usePrefs` / `updatePrefs` / `updatePrefsSoon`):
  `src/client/prefs.ts`.
- Dòng kích thước trong Cài đặt → Chung: `src/client/SizeSettingsRow.tsx`.
- Phân giải route asset: `src/client/asset-url.ts`.
- Bridge desktop tuỳ chọn (`useDesktopBridge`, cổng, thời điểm dò/heartbeat):
  `src/client/desktop.ts`.
- Cửa sổ desktop, menu chuột phải, tuỳ chọn và bridge HTTP: `desktop/companion.py`.
- Đăng ký slot và module id: `src/client/index.ts`.

Sau một thay đổi: `npm run build`, rồi tải lại trang. Nếu profile dùng bản cài `link:`,
`client.js` vừa build được phục vụ trực tiếp và transport HMR thay nó vào. Tuỳ chọn và
`position` đã kéo nằm trong `localStorage` dưới `kappy.pixel-companions.ui.v1`; xoá key đó để tái
hiện trạng thái lần chạy đầu. Khi `position` là `null`, vị trí tự động là góc dưới bên phải,
cách mép phải 96 px và mép dưới cửa sổ 150 px, và nó được giới hạn lại khi đổi kích thước;
**Đặt lại vị trí** đặt `position` về `null`.

## Chỉnh sửa hình ảnh

`assets/` là nguồn chuẩn và hiện chứa bản cập nhật hình ảnh v3: 15 sprite cảnh mỗi nhân vật
(WebP động + PNG tĩnh, 192×128 RGBA có nền trong suốt) cùng hiệu ứng di chuyển
`assets/whale/roaming.{webp,png}` tuỳ chọn cho Deepy. Chỉ sinh lại manifest và bundle qua build
bình thường:

1. Thay hoặc thêm `assets/<character>/<scene>.webp` (động) và `assets/<character>/<scene>.png`
   (tĩnh), cả hai 192×128 với nền trong suốt.
2. Chạy `npm run build` — `tools/build-assets.mjs` ghi lại các tham chiếu có hash nội dung và
   `tools/build-client.mjs` build lại `client.js`.
3. Commit `assets/`, `src/client/assets.generated.ts` đã sinh lại, và `client.js`.

Đừng sửa tay `src/client/assets.generated.ts` hay `client.js`; build là chủ của chúng.

Vì sprite được phục vụ qua route asset thay vì được nhúng, `client.js` đã commit vẫn khoảng 72
KiB; ảnh được tải theo từng cảnh từ package và cache bất biến. Hash `?v=<sha1-8>` thay đổi theo
nội dung file, nên trình duyệt nhận hình mới mà không cần đổi tên.

**Lưu ý:** `tools/build_assets.py` và tám file GIF trong `source-art/` tái tạo cách sinh hình
**cũ, trước v3**. `assets/` là nguồn chuẩn sau bản cập nhật v3, nên chạy generator đó sẽ đưa
hình về bản cũ. Đừng chạy nó trừ khi bạn định quay lại bản cũ; các thay đổi bình thường chỉ đi
qua `npm run build`.

## Test

`npm test` chạy mọi `tests/*.test.ts` bằng test runner của Node:

- `tests/state.test.ts` — 8 test cho `deriveScene` và các rule cảnh.
- `tests/signals.test.ts` — 8 test cho `liveBits`, `streamOf`, `cleanReport`, `lastResponse`,
  `lastAssistantNode`, `assistantText`, giới hạn `MAX_DETAIL` và xử lý phạm vi của `clampScale`.
- `tests/text.test.ts` — 4 test: mọi cảnh đều có phụ đề trong cả sáu ngôn ngữ, mọi chuỗi UI đều
  có trong cả sáu ngôn ngữ, phụ đề khác nhau theo từng cảnh, và việc map/fallback của
  `languageFromTag`.

Tổng cộng là 20 test. Nửa desktop giữ `--self-test` headless riêng (92 lần giải mã ảnh động ở
scale 0.5, 1.0 và 2.0, 31 lần giải mã ảnh tĩnh, 260 kiểm tra).

## Đóng gói

```sh
npm pack --dry-run     # inspect the published file list
npm pack               # dsh-pixel-companions-0.1.0.tgz
```

`files` bao gồm `client.js` đã build, `assets/`, sources, tools, demo, desktop, docs (tiếng Anh
và `docs/zh/`), `README.md`, `README.zh.md` và sáu file `locale/*.json`; nó không bao gồm
`source-art/`, `node_modules/` hay các artifact chỉ dùng cho test. Cây `assets/` phải được ship:
route asset phục vụ nó từ package đã cài. Tarball cài bằng `dsh plugin --profile web add <tgz>`.

## Checklist phát hành

1. `npm run build` và `npm test` (20 test).
2. `python3 -m py_compile desktop/companion.py` và `python3 desktop/companion.py --self-test`.
3. `npm pack --dry-run`: có mặt `client.js`, `assets/**`, `locale/*.json` (sáu ngôn ngữ),
   `icon.svg`, `README.md`, `README.zh.md`, `docs/**`, `desktop/**`, `LICENSE`,
   `ASSETS_NOTICE.md`.
4. Cài tarball hoặc một bản checkout `link:` vào một profile `web` và tải lại. Xác nhận bạn đồng
   hành xuất hiện trên một trang trò chuyện, trong Cài đặt và trên trang Plugin, và rằng sprite
   của nó tải từ route asset (không có 404 trong network panel).
5. Kéo bạn đồng hành, tải lại trang, và xác nhận vị trí được khôi phục; đổi kích thước cửa sổ
   và xác nhận nó vẫn bị giới hạn; dùng **Đặt lại vị trí**.
6. Mở panel cài đặt và kiểm tra sáu ngôn ngữ, bật/tắt chuyển động, bật/tắt hiển thị, slider Kích
   thước và các chip đặt sẵn 50/100/150/200%, phần xem trước 15 cảnh, đóng bằng Escape, và cả
   hai chế độ theme. Mở **Cài đặt → Chung** và xác nhận dòng **Companion size** hiện cùng
   control và đồng bộ với popover.
7. Cửa sổ desktop tuỳ chọn: chạy `python3 desktop/companion.py`, tích **Cửa sổ trên màn hình**,
   xác nhận dòng đó hiện **Đã kết nối**, cửa sổ phản chiếu cảnh, và menu chuột phải (nhân vật,
   chuyển động, kích thước, luôn nổi trên cùng, đặt lại, ẩn, thoát) hoạt động.
8. Tăng `version` trong `package.json`; commit `package.json`, `client.js` đã sinh lại,
   `src/client/assets.generated.ts`, và mọi tài liệu đã thay đổi cùng với nó.
