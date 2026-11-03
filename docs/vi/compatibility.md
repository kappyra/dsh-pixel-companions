# Ghi chú tương thích

[English](../compatibility.md) | [中文](../zh/compatibility.md) | [Русский](../ru/compatibility.md) | Tiếng Việt | [日本語](../ja/compatibility.md) | [한국어](../ko/compatibility.md)

Dự án khởi đầu như một prototype kiểu source-checkout: hai package workspace để copy vào một
bản clone `deepseek-harness` và build bằng tsdown/tsc. Repo này là **dạng cài đặt được**, đã
kiểm chứng trên một bản cài Harness đang chạy. Về sau bạn đồng hành được chuyển từ dock khung
soạn tin sang overlay phủ toàn khung và có thêm khả năng đặt vị trí bằng cách kéo, sáu ngôn ngữ
giao diện và một cửa sổ desktop tuỳ chọn; những thay đổi đó được mô tả bên dưới và được đánh
dấu ở chỗ phụ thuộc vào cửa sổ của người dùng.

## Môi trường đã kiểm chứng

| Hạng mục | Giá trị |
| --- | --- |
| Bản Harness | `0.2.2-alpha.2` (commit `d21f653`), CLI đã cài, profile `web` |
| React của trang | `18.3.1` (shell vendor bundle, bảng module dùng chung) |
| Kiểm chứng | cài qua plugin manager, module Client đã tải, entry trong slot đang hoạt động |

Điều thực sự đã được kiểm tra cho bundle cài đặt được:

- Package cài vào profile và báo `application: applied`; bundle được nối vào
  `dsh.profile.bundles`.
- Bundle là một phần của đồ thị boot Web đã compose dưới dạng
  `{"id":"dsh-pixel-companions","immediately":true,...}` và byte bundle được phục vụ qua
  `/plugins/??dsh-pixel-companions/client.js&rev=…` khớp với `client.js` trong repo.
- Module Client tải qua module loader, và GUI đang chạy liệt kê cả hai entry ở trạng thái
  active: `shell.overlay` → `kappy-pixel-companions` (order 50) và
  `conversation.input.dock` → `kappy-pixel-companions.bridge` (order 80).
- `node tools/build-client.mjs` tái tạo đúng `client.js` đã commit (khoảng 72 KiB), và
  `npm test` chạy 20 test — 8 test rule cảnh, 8 test helper thuần (bao gồm xử lý phạm vi của
  `clampScale`) và 4 test độ đầy đủ bản dịch — tất cả đều pass.
- Route asset của Harness phục vụ các tham chiếu sprite đã sinh
  (`plugins/dsh-pixel-companions/assets/<character>/<scene>.<webp|png>?v=<sha1-8>`) dưới dạng
  `200 image/webp` / `image/png`; `src/client/assets.generated.ts` khoảng 5 KiB.
- Các kiểm tra hiệu năng/logic: `publishFacts` shallow-diff và bỏ qua các snapshot không đổi;
  việc gõ phím làm mới đồng hồ nhàn rỗi tối đa một lần mỗi 5 giây và không bao giờ đổi cảnh;
  đồng hồ 1 giây cùng việc dò/heartbeat desktop tạm dừng khi tab bị ẩn và tiếp tục khi tab hiện
  lại; bản xem trước câu trả lời bị đóng băng trong lúc chạy và được công bố một lần lúc dừng;
  và pill báo cáo mang `role="status"` với `aria-live="polite"`. Hoạt động của người dùng (soạn
  nháp, nhấp/kéo) làm mới đồng hồ nhàn rỗi mà không đổi cảnh.
- Hiệu năng khi đổi kích thước: cả hai slider đều đi qua `updatePrefsSoon`, gộp các cập nhật
  tuỳ chọn tối đa một lần mỗi frame animation (`requestAnimationFrame`, với fallback timeout
  16 ms), trong khi các lần nhấp preset và −/+ vẫn áp dụng ngay; `updatePrefs` bỏ qua các patch
  không thay đổi gì; overlay chỉ giới hạn lại vị trí đã lưu khi sprite đã scale thực sự rời
  viewport; lưới xem trước cảnh và card xem trước desktop được memo hoá; và việc phản chiếu
  desktop được debounce khoảng 140 ms, nên một cú kéo slider chỉ post một lần sau khi thao tác
  kéo ổn định (các thay đổi cảnh/diện mạo vẫn được phản chiếu ngay).
- Việc map cảnh cũng được đánh giá với đúng phiên bản React của trang (`18.3.1`) trên các dạng
  prop slot thật (idle, running, sending, pending interaction, error, open error, tool call,
  reasoning stream, answer stream); mọi rule đều cho ra phụ đề và hình ảnh như mong đợi.
- Một test UI headless bao phủ hành vi hoàn thành và rê chuột: một bản nháp đã gõ vẫn `Idle`,
  một reasoning stream hiện `Thinking`, một answer stream hiện `Typing`, một tool đang chạy
  hiện `Working`, một lượt đã xong hiện báo cáo một dòng sticky mà nút Details mở panel văn bản
  thuần có giới hạn, rê chuột lên bạn đồng hành đóng báo cáo sau khoảng dừng 320 ms, một lượt
  mới mở lại nó, và ô nhập tin nhắn khi rê chuột gửi một tin nhắn rồi khôi phục bản nháp trước
  đó.
- Hình ảnh v3 được kiểm tra headless: cả 62 file sprite giải mã ở 192×128 RGBA có nền trong
  suốt, mọi WebP động có ít nhất hai frame, và một test kéo headless cho thấy Deepy chuyển
  sang `roaming` khi bị kéo và trở lại cảnh khi thả (Whale Girl không đổi).
- Nửa desktop tuỳ chọn được kiểm tra headless: `python3 -m py_compile desktop/companion.py`
  thành công, `python3 desktop/companion.py --self-test` báo
  `ok: … 92 animated decodes, 31 still decodes, 30 evidence PNGs, 260 checks` (các cảnh được
  giải mã ở scale 0.5, 1.0 và 2.0); các kiểm tra `curl` trực tiếp bao phủ `/health`, preflight
  CORS, `POST /state`, `400` và `404`, và một instance thứ hai trên cùng cổng thoát với mã `1`.
  Một test chuyển roaming cũng pass (`whale: moving→roaming, released→idle; girl: no roaming`).
  Payload phía trình duyệt đã được kiểm chứng trong một lần render React headless
  (`scene=typing` → `success`) mà body không có dữ liệu bản nháp hay phiên.

Những mục sau được đánh dấu là người dùng tự xác nhận (chúng phụ thuộc vào cửa sổ của host và chưa
được kiểm chứng lại từ repo này): tương tác kéo/con trỏ, vị trí overlay trên mọi cột, việc panel
cài đặt tự lật và bị giới hạn, diện mạo sáng/tối, và việc chuyển qua lại sáu ngôn ngữ giao diện.
Hãy xác nhận chúng trong cửa sổ `dsh web` của bạn; xem
[installation.md](installation.md#verify).

## Hợp đồng API mà plugin dựa vào

Được xác nhận từ khai báo kiểu của các package đã cài:

| Nguồn | Dùng cho |
| --- | --- |
| `shell.overlay` (slot overlay phủ toàn khung) | chính bạn đồng hành: đăng ký `{ name: 'shell.overlay', id: 'kappy-pixel-companions', order: 50 }`. Lớp overlay cho phép nhấp xuyên qua; chỉ bạn đồng hành, nút bánh răng của nó và panel cài đặt nhận sự kiện con trỏ. |
| `conversation.input.dock` (bridge fact ẩn) | slot duy nhất nhận prop theo từng phiên: đăng ký `{ name: 'conversation.input.dock', id: 'kappy-pixel-companions.bridge', order: 80 }`. Nó render `null` (không DOM, không tạo khoảng hở layout) và chỉ công bố fact. |
| `settings.general.item` (slot danh sách Cài đặt → Chung) | đăng ký dòng kích thước bạn đồng hành: `{ name: 'settings.general.item', id: 'pixel-companions-size', order: 40 }`. Nó render cùng slider/preset như popover của bạn đồng hành và sửa store tuỳ chọn dùng chung; đây là slot danh sách General tiêu chuẩn của host, không có API mới. |
| Prop do chủ slot truyền `{ session: SessionSnapshot, input: InputState }` | fact của phiên và trạng thái khung soạn tin, được bridge ẩn nhận |
| store fact của bạn đồng hành (`src/client/bridge.ts`) | `CompanionFacts` ở mức module cùng `publishFacts`, `useCompanionFacts`, `useFactsPublisher`, `useDisconnectOnUnmount`; shallow-diff snapshot của nó và mang `connected` |
| `useSessionStatus(selector)` trên `ReadonlyMap<SessionId, SessionStatus>` | `pendingInteraction` (phê duyệt / câu hỏi); overlay cũng subscribe, nên một phê duyệt đang chờ vẫn hiện khi người dùng đang ở trang không phải cuộc trò chuyện |
| `SessionSnapshot.running`, `.promptError`, `.lastAgentError`, `.openState`, `.sessionId` | trạng thái lượt chạy, trạng thái lỗi |
| `InputState.phase` (`plain` / `adjudicating` / `claimed` / `submitting` / `sending`), `.draft` | giai đoạn gửi cho cảnh `typing` ngắn; ô nhập tin nhắn khi rê chuột chụp lại `.draft` để khôi phục sau khi gửi |
| `useChat(selector)` → `ChatSnapshot` | công việc trực tiếp của assistant: `legacy.runningCalls` (tool đang chạy) và `legacy.partial.blocks[].kind` `reasoning` / `text` với `text` khác rỗng (đang stream); được công bố dưới dạng bitfield `live` 1/2/4 trong cùng frame |
| `ChatSnapshot.navigation.items()[].response` | bản xem trước hoàn thành một dòng: dòng khác rỗng đầu tiên, đã bỏ các dấu markdown, ≤ 120 ký tự; được giữ sticky trong dòng báo cáo cho đến khi bị đóng hoặc một lượt mới bắt đầu, và fallback về chi tiết đã làm sạch khi rỗng |
| `ChatSnapshot.legacy.nodes[]` (node mới nhất có `kind === 'assistant'`) với `blocks[].kind === 'text'` | toàn bộ văn bản câu trả lời đã ổn định cho panel chi tiết, được trích một lần cho mỗi node assistant đã ổn định, giới hạn 8000 ký tự (`MAX_DETAIL`), và được công bố dưới dạng `CompanionFacts.detail`; chỉ trong trang, không bao giờ gửi qua bridge desktop |
| `inputActions.setDraft(text)` / `inputActions.submit()` | ô nhập tin nhắn khi rê chuột gửi qua khung soạn tin, rồi khôi phục bản nháp trước đó của người dùng trong khả năng tốt nhất |
| key `localStorage` `kappy.pixel-companions.ui.v1` | nhân vật, `scale` (50–200% với độ chính xác 1%; các giá trị 0.8 / 1 / 1.2 kiểu cũ vẫn được chấp nhận và giới hạn lại), ngôn ngữ, chuyển động, hiển thị, công tắc desktop, và `position: {x, y}` đã kéo (`null` cho đến lần kéo đầu tiên); theo từng trình duyệt và từng profile, không bao giờ là cài đặt Host |
| `fetch` của trang tới bridge desktop cục bộ (`src/client/desktop.ts` → `http://127.0.0.1:37421`) | bản phản chiếu desktop tuỳ chọn: `GET /health`, `POST /state`, preflight CORS; không dùng API Harness mới nào và nửa desktop là một tiến trình Python độc lập, không phải plugin |
| `window.__ModuleLoader__.load({ id, factory })`, `factory(require)` trả về `{ inject, apply }` | định dạng bundle trình duyệt |
| `require('react')` từ bảng module dùng chung | React, không bao giờ bị bundle |
| `require.asset(reference)` từ module loader, cùng với `package.json` `"./assets/*": "./assets/*"` | map các tham chiếu sprite có hash nội dung đã sinh ra URL trang; `src/client/asset-url.ts` fallback về tham chiếu tương đối với document khi resolver không có |
| việc phân giải bundle qua `$PWD/profiles/web/node_modules` và phục vụ `/plugins/<package>/…` | việc phân phối package, bao gồm route asset của plugin |

Các trường Chat snapshot, navigation response và action của khung soạn tin đều đã là prop/hook
slot công khai; dòng kích thước dùng slot danh sách `settings.general.item` sẵn có của host;
route asset dùng `require.asset` sẵn có của module loader và map `exports` của package. Không
có API Harness mới nào được dùng, và bộ 15 cảnh không đổi.

## Luồng dữ liệu bridge → overlay

1. Entry ẩn `conversation.input.dock` (`CompanionBridge` trong `src/client/Pet.tsx`, dùng
   `src/client/bridge.ts`) nhận `SessionSnapshot`, `InputState`, Chat snapshot (các bit trực
   tiếp, bản xem trước câu trả lời và node assistant đã ổn định mới nhất), cờ tương tác đang
   chờ từ `useSessionStatus`, và các action của khung soạn tin.
2. Nó gộp chúng vào store fact mức module của bạn đồng hành và thông báo cho subscriber. Các
   fact gồm mốc thời gian bắt đầu/dừng lượt chạy, bitfield `live` (1 tool, 2 reasoning,
   4 answer), `report` một dòng và `detail` đầy đủ; các bit trực tiếp cập nhật trong cùng frame
   với Chat snapshot, còn `report`/`detail` bị đóng băng khi một lượt đang chạy và được công bố
   một lần lúc dừng.
3. Component `shell.overlay` (`Companion`) đọc store qua `useCompanionFacts()` và cũng subscribe
   vào `useSessionStatus`, rồi suy ra cảnh bằng `deriveScene` từ `src/client/state.ts`.
4. Khi cuộc trò chuyện unmount, bridge công bố `connected: false` cùng `running: false` và giữ
   các fact cuối. Overlay sau đó chuyển sang hành vi idle/sleeping thay vì khẳng định một trạng
   thái chạy mà không phiên nào đang công bố.
5. Không có văn bản prompt nào được đọc để chọn cảnh và không có lệnh gọi model nào; bản nháp
   chỉ được chụp lại để ô nhập tin nhắn khi rê chuột có thể khôi phục sau khi gửi qua khung soạn
   tin.
6. Phần hoàn thành là sticky: `success` và dòng báo cáo vẫn ở đó cho đến khi người dùng rê chuột
   lên bạn đồng hành (khoảng dừng 320 ms) hoặc một lượt mới bắt đầu, và báo cáo fallback về
   `detail` đã làm sạch khi bản xem trước navigation rỗng. Nút Details mở một `role="dialog"`
   được giới hạn trong viewport chứa toàn bộ câu trả lời dưới dạng văn bản thuần đã escape qua
   React (giữ xuống dòng, tối đa 8000 ký tự), đóng bằng ✕, Escape hoặc nhấp ra ngoài. Văn bản
   báo cáo giữ `role="status"` / `aria-live="polite"` và nút mở panel có `aria-expanded`.

## Từ điển sáu ngôn ngữ

Mọi câu chữ UI nằm trong `src/client/text.ts`, không nằm trong file locale của Host:

- `LANGUAGES` — sáu ngôn ngữ và nhãn hiển thị của chúng: English, Русский, 中文, Tiếng Việt,
  日本語, 한국어.
- `languageFromTag(tag)` — phân giải một tag BCP 47 (ví dụ `navigator.language`) thành một id
  ngôn ngữ và mặc định là tiếng Anh.
- `SCENE_LABELS` — một phụ đề cho mỗi cảnh trong cả sáu ngôn ngữ.
- `UI_TEXT` — mọi nhãn cài đặt và nhãn của ô nhập tin nhắn, bao gồm Đặt lại vị trí, Đóng, và
  placeholder cùng các control Gửi của ô nhập khi rê chuột.

`locale/*.json` vẫn là metadata danh mục plugin hiện trong Cài đặt → Plugin (`meta.title` /
`meta.description`) và giờ bao phủ cùng sáu ngôn ngữ. Phụ đề cảnh và câu chữ UI đã được viết
lại cho tự nhiên và chính xác trong cả sáu ngôn ngữ, và tiêu đề/mô tả trong danh mục cũng được
viết lại theo cùng cách. Độ đầy đủ bản dịch được `tests/text.test.ts` bao phủ.

## Những thay đổi so với bản prototype

1. **Một package cài đặt được thay vì hai package workspace.** Việc tách `-ui` và `-bundle` chỉ
   có nghĩa bên trong một bản checkout mã nguồn DSH; `cordis.patch.yml`, `index.js`,
   `package.json` (`dsh.bundle` + `dsh.client`) và metadata locale giờ nằm ở gốc repo.
2. **Một build không phụ thuộc cho bundle client đã commit.** `tools/build-assets.mjs` ghi các
   tham chiếu route asset có hash nội dung và `tools/build-client.mjs` bundle TypeScript bằng
   esbuild, giữ `react` external, và bọc kết quả trong đăng ký module loader. `client.js` đã
   sinh được commit, nên cài đặt không cần toolchain.
3. **Theme token thật.** `--dsw-alias-border-l3` và `--dsw-specific-input-major` không phải
   token được ship; plugin dùng `--dsw-alias-border-l2`, `--dsw-alias-bg-layer-1`,
   `--dsw-alias-bg-overlay` và `--dsw-alias-brand-primary`, mỗi token kèm một giá trị literal
   fallback, để overlay và panel của nó theo theme của host thay vì một bảng màu tối cứng.
4. **Overlay phủ toàn khung thay cho hình ảnh ở dock khung soạn tin.** Bạn đồng hành chuyển
   sang `shell.overlay` (trên mọi cột, ở mọi trang). Chỉ bridge fact ẩn còn ở trong
   `conversation.input.dock`, nên không thêm khoảng hở layout nào vào khung soạn tin.
5. **Lớp overlay nhấp xuyên qua.** Lớp overlay là `pointer-events: none`; chỉ bạn đồng hành,
   bánh răng của nó và panel nhận input con trỏ, nên phần còn lại của trang vẫn cuộn và chọn văn
   bản như trước.
6. **Đặt vị trí bằng cách kéo ở mọi nơi.** Một ngưỡng kéo nhỏ phân biệt thao tác kéo với nhấp
   chuột; vị trí được giới hạn trong viewport, giới hạn lại khi đổi kích thước, và lưu dưới dạng
   `position: {x, y}` trong `kappy.pixel-companions.ui.v1` (`null` cho đến lần kéo đầu tiên, nên
   vị trí tự động ở góc dưới bên phải vẫn bám theo các lần đổi kích thước cho đến lúc đó).
7. **Sáu ngôn ngữ giao diện.** `src/client/text.ts` chứa các từ điển và `languageFromTag`; lần
   chạy đầu theo `navigator.language`, nếu không thì tiếng Anh. Panel cài đặt đổi ngôn ngữ trực
   tiếp.
8. **Metadata danh mục plugin.** `locale/en.json`, `locale/ru.json`, `locale/zh.json`,
   `locale/ja.json`, cùng `locale/vi.json` / `locale/ko.json` mới, mang `meta.title` /
   `meta.description`, và `icon.svg` được export, nên Cài đặt → Danh sách plugin hiện plugin
   theo tên thay vì theo id package.
9. **Bỏ installer kiểu source-checkout.** `install-to-dsh.sh` và cây `packages/experimental/**`
   đã bị bỏ; đường đi được tài liệu hoá là bundle trong profile.
10. **Cửa sổ desktop tuỳ chọn.** `desktop/companion.py` vẽ cùng sprite đó trong một cửa sổ GTK 3
    không viền, luôn nổi trên cùng, trong suốt từng pixel, và nhận trạng thái trình bày từ
    trang qua một bridge HTTP chỉ dùng loopback (`src/client/desktop.ts`). Mặc định tắt, không
    mang dữ liệu prompt/bản nháp/tin nhắn/phiên nào, và không cần API Harness mới.
11. **Hình ảnh v3 và hiệu ứng di chuyển roaming.** `assets/` giờ giữ 30 sprite cô gái + 30 sprite
    cá voi (15 cảnh mỗi bên) cùng cặp `assets/whale/roaming.{webp,png}` tuỳ chọn. Trong khi
    Deepy bị kéo — trong overlay hoặc trong cửa sổ desktop — hoạt ảnh `roaming` không bàn làm
    việc thay thế cảnh để đồ đạc cố định không di chuyển theo, và cảnh trở lại khi thả.
    `roaming` không phải một cảnh: máy trạng thái 15 trạng thái, `deriveScene`, payload bridge và
    giao thức desktop không đổi, và không có API Harness nào được thêm.
12. **Trạng thái trực tiếp, ô nhập tin nhắn khi rê chuột, hoàn thành sticky và chi tiết.** Cảnh
    giờ bám theo chính công việc của assistant — một tool call đang chạy, phần suy luận đang
    stream, văn bản trả lời đang stream, hoặc một lượt đang chạy mà không có stream trực tiếp —
    nên `thinking` không bao giờ bị kích hoạt bởi việc người dùng đang soạn nháp. Một lượt đã
    xong là sticky: `success` cùng báo cáo một dòng và nút **Chi tiết** đã bản địa hoá vẫn ở đó
    cho đến khi người dùng rê chuột lên bạn đồng hành hoặc một lượt mới bắt đầu; rê chuột lên sẽ
    đóng chúng, và Chi tiết mở toàn bộ câu trả lời dưới dạng văn bản thuần có giới hạn. Bạn đồng
    hành cũng có một ô nhập một dòng gửi qua khung soạn tin và khôi phục bản nháp trước đó. Báo
    cáo và ô nhập tin nhắn khi rê chuột dùng chung một cột được giới hạn trong viewport, với ô
    nhập ngay dưới báo cáo cho đến khi phần hoàn thành bị đóng. Những thứ này dùng Chat
    snapshot, action của khung soạn tin và prop `useSessionStatus` sẵn có; không có API Harness
    nào thay đổi và bộ 15 cảnh không đổi. Phụ đề cảnh và câu chữ UI được rà soát lại trong cả
    sáu ngôn ngữ.
13. **Phân phối qua route asset và một lượt tối ưu hiệu năng.** Sprite không còn được nhúng:
    manifest giữ các tham chiếu `plugins/dsh-pixel-companions/assets/...?v=<sha1-8>` do route
    asset của Harness phục vụ, được phân giải qua `require.asset` với fallback thô. `client.js`
    đã commit giảm từ khoảng 3.3 MB xuống khoảng 72 KiB; sprite được tải theo từng cảnh và cache
    bất biến, với hash nội dung phá cache. Bridge shallow-diff các fact của nó, đồng hồ 1 giây
    và việc dò/heartbeat desktop tạm dừng ở tab bị ẩn, bản xem trước câu trả lời được công bố
    một lần lúc dừng, hoạt động của người dùng làm mới đồng hồ nhàn rỗi mà không đổi cảnh (gõ
    phím được throttle còn một lần mỗi 5 giây), và pill báo cáo được thông báo qua
    `role="status"` / `aria-live="polite"`. Không có API Harness nào được thêm; bộ 15 cảnh, rule
    cảnh, hộp rê chuột, báo cáo, bridge desktop và app desktop không đổi.
14. **Kích thước bạn đồng hành liên tục.** Dòng Kích thước trên trình duyệt là một range slider
    50–200% theo bước 5% với nút −/+, phần trăm hiển thị trực tiếp và các chip đặt sẵn
    50/100/150/200% (preset đang chọn được đánh dấu bằng `aria-pressed`, và slider vẫn ở đó để
    chỉnh mịn); sprite được render đúng kích thước pixel đã scale (152×98 ở 100%, 76×49 ở 50%,
    304×196 ở 200%), nên vùng nhấp, phụ đề và bánh răng, việc giới hạn viewport, neo cột báo
    cáo/ô nhập và panel chi tiết đều theo đó. Giá trị đã lưu chấp nhận độ chính xác 1% và được
    giới hạn về 50–200 khi tải; các giá trị cũ 0.8 / 1 / 1.2 vẫn hoạt động, và thay đổi slider
    được lưu với debounce 180 ms, flush khi unmount. App desktop chấp nhận `--scale` từ 0.5 đến
    2.0 (làm tròn đến 1%) và menu Size của nó có 50 / 75 / 100 / 125 / 150 / 200%. Cùng control
    kích thước đó cũng được đăng ký trong danh sách Cài đặt → Chung của host
    (`settings.general.item`, id `pixel-companions-size`, order 40), với tiêu đề và mô tả
    **Companion size** đã bản địa hoá. Cả hai bề mặt dùng store tuỳ chọn cục bộ phía client dùng
    chung (`src/client/prefs.ts`, `usePrefs` / `updatePrefs`), nên thay đổi ở nơi này cập nhật
    ngay nơi kia và cùng lưu trong một key `localStorage` với debounce 180 ms và flush khi
    `pagehide`. Không có API Harness mới, không đổi giao thức hay cảnh.

## Giới hạn đã biết

- Bundle JS đã commit khoảng 72 KiB. 62 file sprite (30 cô gái + 32 cá voi, gồm cặp roaming tuỳ
  chọn) được phục vụ riêng bởi route asset của plugin và cache bất biến; `?v=<sha1-8>` phá cache
  khi một file thay đổi. Cách này giữ boot rẻ nhưng nghĩa là cây `assets/` phải được ship cùng
  package.
- Việc map cảnh không thể phân biệt "đã xong" với "đã dừng/đã huỷ": client hiện chỉ công bố
  `running` dưới dạng boolean. Vì vậy cảnh `success` có nghĩa là "dừng mà không có lỗi".
- Một tương tác đang chờ vẫn hiện trên các trang khác chỉ vì overlay tự subscribe vào
  `useSessionStatus`; bridge fact bị unmount ngoài cuộc trò chuyện, và các fact được giữ lại
  được đánh dấu `connected: false`.
- Phần hoàn thành là sticky, không có hẹn giờ: dòng báo cáo và cảnh `success` vẫn ở đó cho đến
  khi người dùng rê chuột lên bạn đồng hành (khoảng dừng 320 ms) hoặc một lượt mới bắt đầu; rê
  chuột lên chính dòng báo cáo không đóng nó. Một câu trả lời rỗng không hiện gì, và nút Chi
  tiết chỉ xuất hiện khi một node assistant đã ổn định cung cấp văn bản. Panel chỉ render văn
  bản thuần — giới hạn 8000 ký tự — và `detail` ở lại trong trang, không bao giờ đi qua bridge
  desktop. Ô nhập tin nhắn khi rê chuột cần một cuộc trò chuyện đang mount và khôi phục bản nháp
  trước đó trong khả năng tốt nhất: nếu khung soạn tin bị khoá trong lúc chờ chấp nhận việc
  gửi, bản nháp đó có thể mất.
- Cửa sổ desktop không thể kiểm chứng nếu không có phiên đồ hoạ: cửa sổ thật, độ trong suốt từng
  pixel ở nơi thiếu bridge Cairo (dự kiến là fallback đục), việc render luôn nổi trên cùng/kéo/
  menu, và định vị trên Wayland chưa được kiểm chứng ở đây. Bridge của nó đòi trang phải mở và
  cả hai nửa chạy trên cùng host; đây là lưu lượng loopback không xác thực, nên không được để lộ
  cổng.
- Một trang phục vụ qua HTTPS thường chặn bridge loopback vì mixed content; hãy dùng trang
  `http://127.0.0.1:3080` thông thường.
- Cả hai bề mặt slot đều được bọc trong một error boundary của React: lỗi render sẽ log
  `[dsh-pixel-companions] surface failed` và render không gì cả thay vì làm crash entry của
  slot, nên phần còn lại của giao diện Harness vẫn hoạt động.
- Bridge desktop tuỳ chọn kiểm tra `fetch` có tồn tại trước khi dò; một trình duyệt không có nó
  sẽ báo **Chưa chạy** thay vì ném lỗi.
- Bạn đồng hành phản ứng với những gì Web client công bố; một Host thay đổi `SessionSnapshot`,
  `InputState`, `shell.overlay` hay hình dạng đăng ký slot sẽ cần một cập nhật tương ứng ở đây.
  Các slot, prop và định dạng module là API plugin công khai, nên một thay đổi phá vỡ sẽ hiện
  trong chính mã plugin, không phải trong giao diện Harness.
