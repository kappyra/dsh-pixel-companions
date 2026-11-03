# Cửa sổ desktop

[English](../desktop.md) | [中文](../zh/desktop.md) | [Русский](../ru/desktop.md) | Tiếng Việt | [日本語](../ja/desktop.md) | [한국어](../ko/desktop.md)

`desktop/companion.py` là một **cửa sổ desktop độc lập tuỳ chọn** hiển thị cùng bạn đồng hành
pixel bên ngoài trình duyệt. Nó không viền, luôn nổi trên cùng, trong suốt từng pixel, kéo
được bằng chuột trái và có menu chuột phải. Đây là một chương trình Python 3 thuần (GTK 3 qua
PyGObject, Pillow, và một bridge HTTP localhost nhỏ xíu); nó không phải plugin Harness và
không thay đổi giao diện Web.

Cửa sổ là sprite; trang Web là bộ não. Nửa trình duyệt là một phần của bundle thông thường và
vẫn nằm im cho đến khi bạn bật **Cửa sổ trên màn hình** trong panel cài đặt của bạn đồng hành.
Mặc định tắt, nên một trang không có app desktop không bao giờ dò cổng cục bộ. Cả hai nửa phải
chạy trên cùng một máy: bridge chỉ bind `127.0.0.1` và không có xác thực.

Các trạng thái giờ bám theo chính công việc của assistant — một tool call đang chạy, phần suy
luận hoặc văn bản trả lời đang stream, hoặc một request đang trên đường đi — và bản phản chiếu
desktop hiện cùng các cảnh; giao thức bridge không đổi. Trình duyệt giữ `success` và báo cáo
của một lượt đã xong theo kiểu sticky, nên cửa sổ desktop phản chiếu `success` chừng nào trang
còn giữ nó; dòng báo cáo và panel chi tiết của nó chỉ có trên trình duyệt.

## Yêu cầu

- Python 3.10+ trên cùng máy với trang trình duyệt.
- GTK 3 với PyGObject, binding Cairo và Pillow:

```sh
sudo apt install python3-gi gir1.2-gtk-3.0 python3-cairo
python3 -m pip install --user Pillow
```

`python3-cairo` là thứ làm cho cửa sổ trong suốt từng pixel. Không có nó (hoặc không có window
manager có compositing), cửa sổ vẫn chạy, nhưng vẽ sprite trên nền tối đặc.
`desktop/requirements.txt` liệt kê `PyGObject>=3.42` và `Pillow>=10` cho pip; PyGObject thường
đến từ distro chứ không qua pip.

Các frame sprite lấy từ thư mục `assets/` của repo (`assets/girl/`, `assets/whale/`); không
cần tải thêm gì trong một bản checkout.

## Chạy thử

Từ thư mục gốc của repo:

```sh
python3 desktop/companion.py
# or
./desktop/run.sh
```

| Flag | Ý nghĩa |
| --- | --- |
| `--port PORT` | Cổng bridge, mặc định `37421`. Trang luôn dò `37421` trong phiên bản này, nên hãy giữ mặc định. |
| `--assets DIR` | Thư mục asset; mặc định là `assets/` của repo. |
| `--scale 0.5\|…\|2.0` | Scale sprite ban đầu, mọi giá trị từ `0.5` đến `2.0` (làm tròn đến 1%); giá trị ngoài phạm vi sẽ thoát với lỗi cách dùng. Sau đó menu chuột phải quyết định diện mạo. |
| `--no-animation` | Khởi động với PNG tĩnh thay vì WebP động. |
| `--lang en\|ru\|zh\|vi\|ja\|ko` | Đã dành sẵn. Cửa sổ không vẽ chữ, nên flag này không thay đổi gì về mặt hình ảnh. |
| `--stale-ms MS` | Cửa sổ staleness tính bằng mili giây; một hook dành cho test, mặc định `10000`. |
| `--self-test` | Chạy acceptance test headless rồi thoát; không cần display. |

Cửa sổ khởi động ở trạng thái `offline` cho đến khi trang gửi state đầu tiên. Tuỳ chọn (diện
mạo, vị trí, luôn nổi trên cùng) được lưu vào `~/.config/dsh-pixel-companions/desktop.json`:

```json
{"character": "girl", "scale": 1, "animation": true, "alwaysOnTop": true, "x": 1200, "y": 600}
```

Ở lần chạy đầu, nếu file đó chưa lưu nhân vật nào, payload đầu tiên từ trình duyệt có thể chọn
nhân vật; sau đó menu là nguồn quyết định và payload chỉ điều khiển cảnh. `scale` đã lưu chấp
nhận mọi giá trị từ `0.5` đến `2.0` (làm tròn đến 1%); các giá trị cũ `0.8` / `1` / `1.2` vẫn
tải được.

## Bật phía trình duyệt

1. Đảm bảo bundle đã được bật trong **Cài đặt → Plugin** và trang Web đang mở (thường là
   `http://127.0.0.1:3080`).
2. Khởi chạy cửa sổ desktop (hoặc khởi chạy sau; trang dò lại mỗi 10 giây).
3. Mở panel bánh răng của bạn đồng hành và tích **Cửa sổ trên màn hình**.

Dòng đó hiện trạng thái hiện tại:

| Trạng thái | Ý nghĩa |
| --- | --- |
| **Tắt** | Đã tắt. Trang không dò cổng desktop chút nào. |
| **Chưa chạy** | Đã bật, nhưng không có gì trả lời trên `127.0.0.1:37421`. |
| **Đã kết nối** | Cửa sổ desktop đã trả lời lần dò gần nhất; cảnh đang được phản chiếu. |

Khi **Cửa sổ trên màn hình** đang bật, một card xem trước xuất hiện ngay dưới dòng đó: một sân
khấu nền carô hiển thị sprite hiện tại đúng như cửa sổ desktop sẽ vẽ (cùng nhân vật, cảnh,
trạng thái chuyển động và cách scale pixelated), với tiêu đề **Xem trước cửa sổ trên màn
hình**. Nó hiện **Đã kết nối** màu xanh lá hoặc **⚠ Chưa chạy — hãy chạy
`desktop/companion.py`** màu hổ phách. Card chỉ để hiển thị — không có nút, không đổi giao
thức — và biến mất khi tuỳ chọn tắt; rê chuột lên dòng đó cũng hiện gợi ý khởi chạy.

Khi đang bật và đã kết nối, trang dò `GET /health` mỗi 10 giây, post state khi cảnh hoặc diện
mạo thay đổi, và gửi heartbeat 4 giây. Cửa sổ nhận thay đổi trong khoảng 120 ms sau khi có
post. Hãy giữ trang mở để có trạng thái trực tiếp: nếu không có state nào đến trong hơn 10
giây (trang đóng, trang đang tải lại, mạng bị chặn), cửa sổ hiện `offline` và vẫn tiếp tục
chạy.

## Menu chuột phải

- **Character** — Lumi (`girl`) hoặc Deepy (`whale`).
- **Motion** — WebP động, hoặc PNG tĩnh.
- **Size** — 50%, 75%, 100%, 125%, 150%, 200%.
- **Always on top** — bật/tắt gợi ý giữ cửa sổ nổi trên cùng.
- **Reset position** — trở về mặc định ở góc dưới bên phải.
- **Hide for 1 hour** — ẩn cửa sổ; nó tự hiện lại sau một giờ.
- **Quit** — lưu tuỳ chọn rồi thoát.

Kéo bằng nút trái ở bất kỳ đâu trên sprite sẽ di chuyển cửa sổ; vị trí được lưu lại. Trong
khi cửa sổ đang bị di chuyển, Deepy chuyển sang hoạt ảnh `roaming` không bàn làm việc và trở
lại cảnh đang phản chiếu khi thả ra; Whale Girl giữ nguyên sprite cảnh của mình. Đây chỉ là
hiệu ứng di chuyển — giao thức bridge và bộ 15 cảnh không thay đổi. Cửa sổ không viền và không
có icon khay hệ thống; nhấp chuột phải **Quit** để đóng.

## Bridge cục bộ và ranh giới riêng tư

Base URL: `http://127.0.0.1:37421`. Bridge là một HTTP server nhỏ chỉ trên interface loopback.

| Request | Response |
| --- | --- |
| `GET /health` | `200` `{"ok":true,"v":1}` |
| `POST /state` | `204`, không body |
| `OPTIONS /state`, `OPTIONS /health` | `204` kèm header CORS (`Access-Control-Allow-Origin: *`, method `GET, POST, OPTIONS`) |
| Đường dẫn lạ | `404` |
| JSON sai định dạng, cảnh không xác định, length thiếu/không hợp lệ, body quá 8 KB | `400` |

Payload của `POST /state` (tối đa 8 KB; các trường lạ bị bỏ qua):

```json
{"v": 1, "scene": "typing", "character": "girl", "scale": 1, "animation": true, "updatedAt": 1780000000000}
```

`scene` là một trong 15 id cảnh (`idle`, `typing`, `thinking`, `planning`, `reading`,
`searching`, `working`, `success`, `waiting`, `error`, `tired`, `coffee`, `sleeping`,
`debugging`, `offline`). Chỉ `scene` được dùng trong mọi lần post; `character` chỉ được nhận ở
lần chạy đầu trước khi có nhân vật được lưu; `scale` và `animation` là việc của menu desktop;
`updatedAt` chỉ mang tính thông tin.

Những gì đi qua bridge chỉ là trạng thái trình bày — **không bao giờ có văn bản prompt, văn
bản nháp, tin nhắn, id phiên, đường dẫn file hay output của model được gửi đi**. Bridge:

- chỉ bind `127.0.0.1`, không xác thực, không cookie, không TLS;
- từ chối body request quá 8 KB và mọi body có id cảnh không xác định;
- không bao giờ log payload request và không phục vụ file nào;
- chỉ cho phép origin của trình duyệt qua CORS để trang cục bộ có thể post.

## Staleness và hành vi offline

Cửa sổ ghi nhớ state cuối cùng nhận được và thời điểm nó đến. Nếu không có state nào đến trong
hơn 10 giây, `effective_scene` trở thành `offline`; cửa sổ vẫn render (và vẫn chạy hoạt ảnh
cảnh đó khi bật chuyển động) cho đến khi có post mới. Phía trang cũng phản chiếu điều này: dòng
cài đặt chuyển về **Chưa chạy** nếu một lần dò health hoặc một lần post thất bại.

Đúng 10.000 giây vẫn được coi là còn mới; việc chuyển trạng thái xảy ra ngay sau mốc đó.
`--self-test` kiểm tra ranh giới này bằng một đồng hồ được inject.

## Kiểm chứng

Các phần headless đã được kiểm chứng:

```sh
python3 -m py_compile desktop/companion.py
python3 desktop/companion.py --self-test
```

Self-test giải mã cả hai nhân vật × toàn bộ 15 cảnh ở scale 0.5, 1.0 và 2.0, cộng thêm hoạt ảnh
`roaming` tuỳ chọn của Deepy, kiểm tra kích thước và thời lượng frame, ghi 30 ảnh PNG frame đầu
tiên vào một thư mục tạm bên ngoài repo làm bằng chứng thị giác, khởi động bridge trên một cổng
tạm thời và thử `GET /health`, cả hai preflight CORS, một `POST /state` hợp lệ, các body sai
định dạng/không rõ cảnh (`400`) và một đường dẫn lạ (`404`), rồi kiểm tra rule staleness 10
giây. Nó in một tóm tắt `ok:` (`ok: … 92 animated decodes, 31 still decodes, 30 evidence PNGs, 260 checks`) và thoát với mã lỗi khi thất bại.

Một test chuyển roaming cũng pass (`whale: moving→roaming, released→idle; girl: no roaming`). Payload phía trình duyệt đã được kiểm chứng trong một lần render React headless
(`scene=typing` → `success`), không có dữ liệu bản nháp hay phiên trong body request, và một
test kéo bằng trình duyệt headless cho thấy cá voi chuyển sang `roaming` khi bị kéo và quay lại
cảnh khi thả (cô gái không đổi).

Không thể kiểm chứng nếu không có phiên đồ hoạ: cửa sổ thật, độ trong suốt từng pixel trên máy
không có bridge Cairo (ở đó dự kiến là fallback đục), hành vi luôn nổi trên cùng và kéo, và
việc định vị cửa sổ trên Wayland.

## Hạn chế

- Cần một phiên đồ hoạ (X11 hoặc Wayland). Một server headless hoặc WSL thuần không có
  display; hãy dùng X forwarding hoặc display ảo, hoặc chạy `--self-test`.
- Các compositor Wayland có thể bỏ qua vị trí cửa sổ được yêu cầu, và một số backend từ chối
  yêu cầu di chuyển cửa sổ; một phiên X11 là dễ đoán nhất.
- Không icon khay hệ thống, không notification, không viền cửa sổ, không chữ. Đóng bằng
  **Quit** trong menu chuột phải (hoặc **Hide for 1 hour**).
- Trang phải mở để có trạng thái trực tiếp. Cửa sổ là một đích hiển thị, không phải một client
  thứ hai.
- Chỉ trên cùng một máy: bridge chỉ dùng loopback và không xác thực, nên đừng để lộ cổng. Cửa
  sổ không có quyền truy cập cuộc trò chuyện ngoài payload tí hon đó.
- Một trang phục vụ qua HTTPS thường chặn các request `http://127.0.0.1` vì mixed content; hãy
  dùng trang `http://127.0.0.1:3080` thông thường.

## Xử lý sự cố

| Triệu chứng | Cần kiểm tra |
| --- | --- |
| Cửa sổ không bao giờ hiện | Có display không? Chạy `python3 desktop/companion.py --self-test` trước; trên server hãy dùng X forwarding hoặc display ảo. |
| `cannot listen on 127.0.0.1:37421` | Một instance bạn đồng hành khác đang chạy. Hãy thoát nó (trang dùng 37421, nên giữ cổng mặc định là dễ nhất). |
| Hình chữ nhật tối đặc thay vì trong suốt | Cài `python3-cairo`, dùng window manager có compositing, và chạy phiên X11 hoặc Wayland có compositing. Đây là fallback đục dự kiến, không phải crash. |
| Cảnh cứ ở `offline` | Trang có mở không, bundle có bật không, **Cửa sổ trên màn hình** có được tích không? Kiểm tra `curl http://127.0.0.1:37421/health` và xem trang với cửa sổ có dùng cùng cổng không. |
| Cài đặt báo **Chưa chạy** trong khi cửa sổ đang mở | Trang không kết nối được bridge: kiểm tra cổng, firewall cục bộ, tiến trình khác trên 37421, hoặc trang phục vụ qua HTTPS (mixed content). |
| Không di chuyển được cửa sổ trên Wayland | Compositor có thể bỏ qua yêu cầu di chuyển; hãy thử phiên X11 hoặc kéo từ chỗ khác trên sprite. |
| Cửa sổ nằm sai màn hình / ngoài màn hình | **Reset position** trong menu chuột phải; một số compositor Wayland bỏ qua hoàn toàn việc định vị. |

Xem thêm trong [installation.md](installation.md), [development.md](development.md) và
[troubleshooting.md](troubleshooting.md).
