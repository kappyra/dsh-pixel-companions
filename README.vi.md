# Pixel Companions cho DeepSeek Harness

[English](README.md) | [中文](README.zh.md) | [Русский](README.ru.md) | Tiếng Việt | [日本語](README.ja.md) | [한국어](README.ko.md)

Tôi làm Pixel Companions vì tôi muốn các phiên dsh của mình bớt vô hồn. Nó là một bạn đồng
hành pixel hoạt hình nổi **phía trên toàn bộ** giao diện Web của
[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (dsh) và bám theo những gì
agent đang làm: gõ phím, làm việc, chờ bạn phê duyệt, xong việc, đi ngủ. Tôi vẽ nó trong
overlay phủ toàn khung, nên nó luôn hiện trên mọi trang — cuộc trò chuyện, Cài đặt, Plugin — và
bạn có thể kéo nó đến bất kỳ đâu trong cửa sổ. Tôi giữ nó là một **bundle** dsh dạng opt-in
bình thường: không fork giao diện, không vá core, không chặn prompt hay phản hồi. Tôi là
kappyra, và đây là dự án phụ của tôi cho dsh.

![Xem trước](demo/preview.webp)

Tôi đã vẽ hai nhân vật, mỗi nhân vật có 15 cảnh động:

- **Lumi** — cô gái pixel bên bàn làm việc.
- **Deepy** — chú cá voi pixel.

**Hình ảnh.** Deepy dùng bộ pixel matte v3 mà tôi chọn; Whale Girl giữ phong cách v2 của bộ
asset. Toàn bộ sprite đều 192×128 và có nền trong suốt.

Bạn đồng hành của tôi là phần đóng góp phía trình duyệt cho slot `shell.overlay` phủ toàn khung
chính thức. Một entry bridge ẩn trong `conversation.input.dock` công bố các fact của phiên vào
module store riêng của plugin, và overlay đọc chúng. Nút bánh răng mở một popover cài đặt nhỏ mà
tôi giữ trong `localStorage` chỉ cho trình duyệt này (xem phần Cấu hình).

## Tính năng

- **Nổi trên mọi trang.** Tôi đặt overlay ở trên mọi cột, nên bạn đồng hành vẫn hiện trong cuộc
  trò chuyện, Cài đặt và Plugin — không chỉ cạnh khung soạn tin.
- **Kéo đến bất kỳ đâu.** Chuột (nút trái), cảm ứng hoặc bút cảm ứng đều di chuyển được bạn
  đồng hành đến bất kỳ đâu trong cửa sổ. Tôi thêm một ngưỡng kéo nhỏ để phân biệt thao tác kéo
  với nhấp chuột; vị trí được giới hạn trong viewport, giới hạn lại khi đổi kích thước, và được
  lưu qua các lần tải lại trong `kappy.pixel-companions.ui.v1` dưới dạng `position: {x, y}`
  (`null` cho đến lần kéo đầu tiên). Trước đó, tôi tự động đặt nó ở góc dưới bên phải, phía trên
  vùng soạn tin, và cho nó bám theo khi cửa sổ đổi kích thước.
- **Bám theo chính công việc của model.** Tôi theo dõi một tool call đang chạy, phần suy luận
  đang stream, văn bản trả lời đang stream, hoặc một lượt đang chạy mà không có stream trực
  tiếp — không bao giờ dựa trên văn bản prompt, và cũng không bao giờ theo thao tác gõ của bạn.
  Xem [docs/vi/scenes.md](docs/vi/scenes.md).
- **Ô nhập tin nhắn khi rê chuột.** Tôi thêm một ô nhập tin nhắn khi rê chuột: rê chuột lên bạn
  đồng hành — hoặc lên báo cáo hoàn thành — để nhập và gửi tin nhắn tới phiên hiện tại; bản nháp
  trong khung soạn tin của bạn sẽ được khôi phục sau đó. Khi báo cáo còn hiện, ô nhập xếp ngay
  dưới báo cáo; khi báo cáo được đóng, nó chuyển xuống dưới bạn đồng hành. Nó cần một cuộc trò
  chuyện đang mở và sẽ ẩn khi đang kéo hoặc khi panel cài đặt đang mở.
- **Báo cáo hoàn thành dạng sticky.** Tôi làm báo cáo thành sticky: sau một lượt, dòng đầu tiên
  của câu trả lời cuối cùng và nút **Chi tiết** vẫn nằm dưới bạn đồng hành cho đến khi bạn rê
  chuột lên bạn đồng hành hoặc một lượt mới bắt đầu. **Chi tiết** mở toàn bộ câu trả lời dưới
  dạng văn bản thuần trong một panel cuộn được; rê chuột lên bạn đồng hành sẽ đóng báo cáo, còn
  panel đóng bằng ✕, Escape hoặc nhấp ra ngoài.
- **30 cảnh WebP động** (15 cảnh mỗi nhân vật) cùng ảnh PNG tĩnh cho khi tắt chuyển động; Deepy
  còn có hoạt ảnh `roaming` không bàn làm việc khi bị kéo. Tôi phục vụ sprite từ route asset
  riêng của plugin và tải theo từng cảnh, nhờ đó bundle JS vẫn nhỏ.
- **Sáu ngôn ngữ giao diện.** Tôi dịch phụ đề cảnh và nhãn cài đặt sang English, Русский, 中文,
  Tiếng Việt, 日本語 và 한국어; lần chạy đầu tiên theo `navigator.language`, nếu không có thì
  dùng tiếng Anh.
- **Cài đặt khép kín.** Tôi giữ mọi thứ trong popover bánh răng của bạn đồng hành: nhân vật,
  slider **Kích thước** (50–200%, bước 5%, có nút −/+, phần trăm hiển thị trực tiếp và các chip
  đặt sẵn 50/100/150/200%), ngôn ngữ, bật/tắt chuyển động, bật/tắt hiển thị, Đặt lại vị trí, lưới
  xem trước thủ công 15 cảnh, Tự động và Đóng. Cùng control Kích thước đó cũng được đăng ký trong
  **Cài đặt → Chung → Companion size**. Tôi vẽ bạn đồng hành đúng kích thước pixel đã scale
  (152×98 ở 100%), nên vùng nhấp, phụ đề/bánh răng, cột báo cáo/ô nhập và panel chi tiết đều
  theo kích thước đã chọn.
- **Cửa sổ desktop tuỳ chọn.** Tôi cũng làm một bạn đồng hành nhỏ có thể chạy ngoài trình duyệt
  trong một cửa sổ Python không viền, luôn nổi trên cùng, trên cùng một máy, nhận dữ liệu từ
  bridge chỉ mở trên localhost; dòng cài đặt xem trước cửa sổ đó và cảnh báo kèm lệnh khởi chạy
  khi nó chưa chạy. Mặc định tắt. Xem [docs/vi/desktop.md](docs/vi/desktop.md).
- **An toàn ngay từ thiết kế.** Tôi làm lớp overlay cho phép nhấp xuyên qua; chỉ bạn đồng hành,
  bánh răng của nó và panel nhận sự kiện con trỏ. Plugin không sở hữu mã Host nào, không gọi
  mạng ngoài route asset của chính nó và bridge desktop localhost tuỳ chọn, và chỉ đọc các prop
  công khai của slot.
- **Tuỳ chọn và có thể hoàn tác.** Tắt plugin của tôi trong Cài đặt → Plugin hoặc gỡ bundle;
  giao diện trở về như nguyên bản.

## Yêu cầu

- Một profile Web của dsh (`dsh web`) — tôi chỉ nhắm tới Web client chính thức.
- `pnpm` có trên `PATH`, vì `dsh plugin` chuyển các thao tác package cho pnpm.
- Node.js 22.6+ chỉ cần khi build lại từ mã nguồn; package đã cài chứa sẵn `client.js`.

## Cài đặt

Tôi đóng gói package dưới dạng một bundle dựng sẵn: `client.js` và phần hình ảnh trong `assets/`
đã được commit, nên cài đặt không cần bước build.

### Từ bản checkout cục bộ

```sh
git clone https://github.com/kappyra/dsh-pixel-companions.git
cd dsh-pixel-companions
dsh plugin --profile web add link:"$PWD"
```

`link:` giữ profile trỏ vào bản làm việc của bạn, nên các chỉnh sửa sau đó trong `assets/`
hoặc `src/` (kèm theo `npm run build`) được phục vụ ngay.

### Từ địa chỉ Git hoặc tarball

```sh
dsh plugin --profile web add github:kappyra/dsh-pixel-companions
# or, after `npm pack` in the checkout:
dsh plugin --profile web add /path/to/dsh-pixel-companions-0.1.0.tgz
```

Sau đó **tải lại trang Web**. Thêm bundle sẽ bật nó trong profile; bạn đồng hành xuất hiện gần
góc dưới bên phải trên mọi trang — cuộc trò chuyện, Cài đặt, Plugin — và vẫn tồn tại khi chuyển
trang. Transport HMR phía client thường vẫn thay bundle trong vòng một hai giây; dù sao thì tải
lại vẫn an toàn.

Toàn bộ quy trình (trang Plugin, bật, tắt, gỡ cài đặt, xử lý sự cố):
[docs/vi/installation.md](docs/vi/installation.md). Tôi đã viết cách dùng hằng ngày — kéo, ô nhập
tin nhắn khi rê chuột, báo cáo dính và phần chi tiết, kích thước, ngôn ngữ và cửa sổ trên màn
hình — trong [docs/vi/usage.md](docs/vi/usage.md).

## Cấu hình

Tôi giữ mọi cài đặt trong panel mở từ bạn đồng hành hoặc nút bánh răng (⚙):

| Mục điều khiển | Tác dụng | Được lưu là |
| --- | --- | --- |
| Nhân vật | Lumi hoặc Deepy | `kappy.pixel-companions.ui.v1` |
| Kích thước | Slider 50–200% theo bước 5%, có nút −/+, hiển thị trực tiếp và chip đặt sẵn 50/100/150/200%; sprite được vẽ đúng kích thước pixel thực | cùng key |
| Companion size (Cài đặt → Chung) | Cùng slider, nút −/+, hiển thị và các preset như popover bánh răng; cả hai cùng sửa một tuỳ chọn chung và luôn đồng bộ | cùng key |
| Ngôn ngữ | English, Русский, 中文, Tiếng Việt, 日本語, 한국어 | cùng key |
| Chuyển động | WebP động hoặc PNG tĩnh | cùng key |
| Hiển thị | Hiện hoặc ẩn bạn đồng hành | cùng key |
| Cửa sổ desktop | Phản chiếu cảnh sang cửa sổ desktop tuỳ chọn; trạng thái Tắt / Chưa chạy / Đã kết nối | cùng key |
| Đặt lại vị trí | Đưa bạn đồng hành về vị trí mặc định tự động ở góc dưới bên phải | cùng key |
| Xem trước cảnh | Buộc hiện bất kỳ cảnh nào trong 15 cảnh, hoặc quay lại tự động (**Tự động**) | chỉ trạng thái phiên |
| Đóng | Đóng panel; **Escape** hoặc nhấp ra ngoài cũng đóng panel | — |

Tôi neo panel vào bạn đồng hành, để nó tự lật lên trên hoặc xuống dưới, và giới hạn nó trong
viewport. Tuỳ chọn và vị trí đã kéo được lưu theo từng trình duyệt và từng profile, không bao
giờ ghi vào service settings của Host; plugin không thêm trang Cài đặt riêng — dòng kích thước
của nó xuất hiện trong Cài đặt → Chung.

## Cửa sổ desktop (tuỳ chọn)

Tôi cũng làm cùng bạn đồng hành đó thành một cửa sổ desktop: nó có thể chạy ngoài trình duyệt
trong một cửa sổ không viền, luôn nổi trên cùng, trong suốt từng pixel trên cùng một máy. Mặc
định tắt.

```sh
sudo apt install python3-gi gir1.2-gtk-3.0 python3-cairo
python3 -m pip install --user Pillow
python3 desktop/companion.py        # or ./desktop/run.sh
```

Tích **Cửa sổ trên màn hình** trong panel bánh răng; dòng đó hiện **Đã kết nối**, **Chưa
chạy** hoặc **Tắt**. Chỉ id cảnh, nhân vật, scale và cờ chuyển động đi qua bridge localhost —
không có văn bản prompt, bản nháp, tin nhắn, id phiên, đường dẫn file hay output của model.
Xem [docs/vi/desktop.md](docs/vi/desktop.md).

## Cảnh

| Tín hiệu quan sát được | Cảnh | Ý nghĩa trung thực |
| --- | --- | --- |
| Prompt đã gửi (`input.phase` = sending/submitting/adjudicating) | `typing` | Tin nhắn đang được gửi đi |
| Một tool call đang chạy | `working` | Một tool đang thực thi |
| Assistant đang stream phần suy luận | `thinking` | Model đang suy luận |
| Assistant đang stream văn bản trả lời | `typing` | Model đang viết câu trả lời |
| Lượt đang chạy, không có stream trực tiếp (request đang bay) | `thinking` | Đang chờ model |
| Chạy > 75 giây mà không có tín hiệu trực tiếp | `tired` | Tác vụ dài, không phải model mệt |
| Chạy > 180 giây mà không có tín hiệu trực tiếp | `coffee` | Chỉ để trang trí |
| Đang chờ phê duyệt / câu hỏi | `waiting` | Đang chờ bạn |
| `promptError`, `lastAgentError` hoặc `openState = error` | `error` | Tín hiệu lỗi thật |
| Đang chạy → dừng mà không có lỗi | `success` (sticky) | Bám cùng báo cáo cho đến khi bạn rê chuột lên bạn đồng hành hoặc một lượt mới bắt đầu; có thể bao gồm cả huỷ bỏ |
| Không có hoạt động trong 110 giây | `sleeping` | Đồng hồ nhàn rỗi chỉ để hiển thị |
| Các trường hợp khác | `idle` | — |

Tôi làm các rule độc lập với ngôn ngữ; chỉ phụ đề dưới bạn đồng hành là được bản địa hoá.
`thinking` nghĩa là assistant đang suy luận — gõ một bản nháp trong khung soạn tin không thay
đổi gì. `planning`, `reading`, `searching`, `debugging` và `offline` **chỉ dùng để xem trước
thủ công** cho đến khi client công bố tín hiệu có kiểu cho chúng; plugin không bao giờ đoán
chúng từ chữ trong prompt. Rule đầy đủ: [docs/vi/scenes.md](docs/vi/scenes.md).

## Tương thích

Tôi đã kiểm chứng nó trên một profile Web dsh `0.2.2-alpha.2` đang chạy: bundle cài được, module
Client tải qua module loader của Harness, các entry đăng ký vào `shell.overlay` (bạn đồng hành)
và `conversation.input.dock` (bridge ẩn), byte của bundle được phục vụ khớp với repo, và
component render với prop slot thật. [docs/vi/compatibility.md](docs/vi/compatibility.md) liệt
kê chính xác các API, luồng dữ liệu bridge → overlay, từ điển sáu ngôn ngữ và bridge desktop tuỳ
chọn. Các kiểm tra thị giác (sáng/tối, cảm giác kéo, vị trí chính xác) để bạn tự xác nhận.

## Phát triển

```sh
npm install            # esbuild, dev-only
npm run build          # build the asset manifest, then bundle client.js
npm test               # unit tests (Node 22.6+)
```

Mã phía trình duyệt: `src/client/bridge.ts` (store fact), `Pet.tsx` (overlay, kéo và roaming,
bridge ẩn, ô nhập khi rê chuột, báo cáo), `state.ts` (rule cảnh), `signals.ts` và `asset-url.ts`
(helper thuần và phân giải route asset), `text.ts` (sáu ngôn ngữ), `desktop.ts` (bridge desktop
tuỳ chọn). Tôi đã ghi lại pipeline, đóng gói và bố cục trong
[docs/vi/development.md](docs/vi/development.md).

## Giấy phép và asset

- Tôi phát hành **mã plugin theo giấy phép MIT** — xem [LICENSE](LICENSE).
- Tôi tạo ra **hình ảnh linh vật** trong `assets/`, `source-art/`, `demo/` và các bản sao mà
  plugin phục vụ cho dự án này; nó được phân phối cùng dự án. Hình ảnh không thuộc phạm vi giấy
  phép MIT của mã, và tôi giữ các quyền đối với chúng. Xem [ASSETS_NOTICE.md](ASSETS_NOTICE.md).
- DeepSeek và DeepSeek Harness là thương hiệu của chủ sở hữu tương ứng. Đây là một plugin cộng
  đồng không chính thức, không liên kết với DeepSeek và không được DeepSeek bảo trợ. Nó chỉ
  dùng các API plugin công khai do Harness tài liệu hoá.

## Xử lý sự cố

| Triệu chứng | Cần kiểm tra |
| --- | --- |
| Không thấy bạn đồng hành ở đâu cả | Cài đặt → Plugin: bundle đã bật chưa? Tải lại trang. Không cần mở cuộc trò chuyện. |
| Bạn đồng hành hiện nhưng đứng yên | Có thể đang chọn PNG tĩnh (tắt chuyển động), hoặc hệ điều hành yêu cầu giảm chuyển động. |
| Kéo bạn đồng hành mà nó không di chuyển | Di chuyển vài pixel trước khi thả (có ngưỡng kéo), và kéo chính sprite chứ không phải lớp overlay trống. |
| Bạn đồng hành ra ngoài màn hình sau khi đổi kích thước hoặc đổi màn hình | Bánh răng → **Đặt lại vị trí**; nó trở về vị trí mặc định tự động ở góc dưới bên phải. |
| Sprite quá to hoặc quá nhỏ | Nhấp một chip đặt sẵn **50/100/150/200%** hoặc kéo slider **Kích thước** (50–200%) trong popover bánh răng hoặc trong Cài đặt → Chung → **Companion size**; vị trí đã lưu tự giới hạn lại, và **Đặt lại vị trí** khôi phục vị trí tự động ở góc dưới bên phải. |
| Không tìm thấy control kích thước | Nó nằm trong **Cài đặt → Chung → Companion size** và trong popover ⚙ của bạn đồng hành; cả hai sửa cùng một tuỳ chọn. Nếu cả hai đều không hiện, cần tải lại cứng (trang đang chạy bundle client cũ). |
| Sai ngôn ngữ | Bánh răng → **Ngôn ngữ**. Lần chạy đầu theo ngôn ngữ trình duyệt; nếu không thì tiếng Anh. |
| Popover cài đặt bị cắt | Panel tự lật và được giới hạn trong viewport; **Đặt lại vị trí**, rồi báo kích thước cửa sổ. |
| Cửa sổ desktop cứ offline hoặc là một khối đục | Trang phải mở và **Cửa sổ trên màn hình** đã tích; cài `python3-cairo` để có độ trong suốt; kiểm tra `curl http://127.0.0.1:37421/health`. Xem [docs/vi/desktop.md](docs/vi/desktop.md). |
| Sprite bị cũ hoặc 404 sau khi thay hình ảnh | Chạy `npm run build` — hash nội dung `?v=` là một phần của mỗi URL sprite — rồi tải lại trang. |
| `client.js` tải thất bại | Profile phải phục vụ được package; chạy lại `dsh plugin --profile web add` và kiểm tra log pnpm trong `$DSH_HOME/profiles/web/.plugin-manager/logs/`. |

Xem thêm trong [docs/vi/troubleshooting.md](docs/vi/troubleshooting.md).
