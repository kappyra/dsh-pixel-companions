# Xử lý sự cố

[English](../troubleshooting.md) | [中文](../zh/troubleshooting.md) | [Русский](../ru/troubleshooting.md) | Tiếng Việt | [日本語](../ja/troubleshooting.md) | [한국어](../ko/troubleshooting.md)

## Không thấy bạn đồng hành

1. **Bundle đã bật chưa?** Cài đặt → Plugin → Danh sách plugin. Entry có tên
   *Pixel companions*. Nếu nó hiện `disabled`, hãy bật nó.
2. **Nó có bị ẩn không?** Panel cài đặt có công tắc **Hiển thị**. Khi tắt, chỉ còn một nút 🐳
   nhỏ ở vị trí của bạn đồng hành; nhấp vào đó để đưa bạn đồng hành trở lại.
3. **Tải lại trang.** Một bundle vừa cài thường được hot-swap trong một hai giây, nhưng tải
   lại luôn an toàn. Bạn đồng hành vẽ trong overlay phủ toàn khung, nên không cần cuộc trò
   chuyện đang mở: nó hiện trên mọi trang, kể cả Cài đặt và Plugin.
4. **Khởi động lại Host.** Nhấn `Ctrl+C` ở tiến trình `dsh web` rồi khởi động lại; một thay
   đổi trong `package.json` (ví dụ tăng version) cần khởi động lại.
5. **Kiểm tra profile.** `dsh --profile web --dump-config` phải liệt kê một dòng tên
   `dsh-pixel-companions`. Nếu không có, bundle chưa được ghi danh: chạy lại
   `dsh plugin --profile web add link:"$PWD"`.

## Bạn đồng hành hiện ra nhưng đứng yên

- **Chuyển động đang tắt** trong panel cài đặt, hoặc hệ điều hành yêu cầu giảm chuyển động
  (`prefers-reduced-motion: reduce`). Cả hai đều vẽ PNG tĩnh theo thiết kế.
- Bản thân cảnh có thể là cảnh trông như đứng yên (`sleeping`, `waiting`); hãy xem phụ đề phía
  trên sprite.

## Kéo nhưng bạn đồng hành không di chuyển

- Kéo **chính sprite** (hoặc nút 🐳 khi bạn đồng hành đang bị ẩn), không kéo vùng trống quanh
  nó; lớp overlay vốn được thiết kế cho nhấp xuyên qua.
- Nhấn và di chuyển hơn ngưỡng kéo 3 pixel trước khi thả. Một cú nhấn ngắn hơn được coi là
  nhấp chuột và sẽ mở panel cài đặt thay vì kéo.
- Chuột, cảm ứng và bút cảm ứng đều dùng được; nút chuột phụ không bắt đầu thao tác kéo.
- Nếu vị trí bị cũ hoặc con trỏ có vẻ bị kẹt, mở bánh răng và chọn **Đặt lại vị trí**, rồi thử
  lại.

## Bạn đồng hành quá to hoặc quá nhỏ

Mở **Cài đặt → Chung → Companion size**, hoặc popover ⚙ của bạn đồng hành; cả hai hiện cùng
một control và sửa cùng một tuỳ chọn. Cách nhanh nhất là một trong các chip đặt sẵn
**50/100/150/200%** dưới dòng Kích thước; để chỉnh mịn, dùng slider **Kích thước** (50–200%,
bước 5%, có nút −/+ và phần trăm hiển thị trực tiếp). Sprite được vẽ đúng kích thước pixel đã
scale, nên vùng nhấp, phụ đề/bánh răng, cột báo cáo/ô nhập và panel chi tiết đều theo đó. Vị
trí đã lưu tự giới hạn lại khi kích thước thay đổi; **Đặt lại vị trí** khôi phục vị trí tự động
ở góc dưới bên phải nếu bạn đồng hành rơi vào chỗ khó chịu. Nếu cả hai control đều không hiện,
trang đang chạy bundle client cũ — hãy tải lại cứng (và khởi động lại `dsh web` nếu bundle vừa
được cập nhật).

## Ô nhập tin nhắn khi rê chuột không hiện

Ô nhập một dòng chỉ mở khi rê chuột lên bạn đồng hành, và chỉ khi có cuộc trò chuyện đang
mount, khung soạn tin sẵn dùng và bạn đồng hành đang hiển thị. Nó bị ẩn khi bạn đang kéo bạn
đồng hành hoặc khi panel cài đặt đang mở, và không mở trên thiết bị cảm ứng. Hãy đưa con trỏ
lên sprite và giữ nguyên ở đó; ô nhập nằm dưới (hoặc trên) bạn đồng hành và được giới hạn
trong viewport. Khi báo cáo hoàn thành còn hiện, ô nhập nằm trong cùng cột được giới hạn đó,
ngay dưới báo cáo: rê chuột lên báo cáo sẽ để lộ ô nhập và giữ báo cáo mở, còn dòng báo cáo và
nút **Chi tiết** của nó thì không tự mở ô nhập. Rê chuột lên sprite bắt đầu khoảng dừng 320 ms
để đóng một hoàn thành sticky; sau khi đóng, ô nhập quay về dưới bạn đồng hành. Rời khỏi báo
cáo lại ẩn ô nhập, và báo cáo vẫn ở đó cho đến khi sprite được rê chuột lên hoặc một lượt mới
bắt đầu.

## Ô nhập tin nhắn làm mất bản nháp của tôi

Ô này gửi qua khung soạn tin (`setDraft` + `submit`) rồi khôi phục bản nháp trước đó của bạn
ngay sau khi xếp tin nhắn vào hàng đợi. Nếu lúc đó khung soạn tin đang bị khoá trong giai đoạn
gửi hoặc chờ chấp nhận, việc khôi phục có thể thất bại và bản nháp có thể mất; một bản nháp
rỗng thì chỉ đơn giản là để trống. Hãy gõ lại bản nháp nếu cần; gửi từ ô này không làm thay
đổi lịch sử phiên.

## Không thấy báo cáo hoàn thành

Báo cáo là sticky: sau một lượt thành công, bản xem trước một dòng (dòng khác rỗng đầu tiên,
≤ 120 ký tự, đã bỏ các dấu markdown) vẫn ở đó cho đến khi bạn rê chuột lên bạn đồng hành hoặc
một lượt mới bắt đầu. Khoảng dừng rê chuột 320 ms sẽ đóng nó; rê chuột lên chính dòng báo cáo
thì không. Sau khi bị đóng, lượt kết thúc tiếp theo sẽ mở lại nó. Một câu trả lời rỗng không
hiện gì, và nút **Chi tiết** chỉ xuất hiện khi một câu trả lời assistant đã ổn định có cung cấp
văn bản; khi có, nút mở toàn bộ câu trả lời dưới dạng văn bản thuần có giới hạn độ dài.

## Bạn đồng hành ra ngoài màn hình sau khi đổi màn hình hoặc đổi kích thước cửa sổ

Vị trí được giới hạn trong viewport và giới hạn lại khi đổi kích thước, nhưng một vị trí đã
lưu vẫn có thể khó coi sau khi đổi màn hình, đổi mức zoom hoặc với cửa sổ rất nhỏ. Mở bánh
răng và chọn **Đặt lại vị trí**; bạn đồng hành trở về vị trí tự động ở góc dưới bên phải và
lại bám theo khi cửa sổ đổi kích thước. Xoá trường `position` trong `localStorage` cũng có
tác dụng tương tự.

## Panel cài đặt bị cắt hoặc mở ngoài màn hình

Panel được neo vào bạn đồng hành, tự lật lên trên hoặc xuống dưới tuỳ chỗ trống, và được giới
hạn trong viewport:

- Nếu bạn đồng hành nằm ở góc, hãy kéo nó về phía giữa trước khi mở panel.
- **Đặt lại vị trí** đưa nó về vị trí mặc định.
- Trong một cửa sổ nhỏ bất thường, panel sẽ cuộn; hãy đổi kích thước cửa sổ hoặc báo lại kích
  thước nếu vẫn không dùng được.

## Sprite bị cũ hoặc 404 sau khi thay hình ảnh

URL sprite có kèm hash nội dung (`?v=<sha1-8>`), và manifest được sinh lúc build. Sau khi thay
file trong `assets/`, chạy `npm run build` để `src/client/assets.generated.ts` và `client.js`
được sinh lại, rồi tải lại trang. Nếu hình cũ vẫn hiện, hãy tải lại cứng để bỏ tài liệu đã
cache. Lỗi 404 nghĩa là package đã cài không còn cây `assets/` — hãy cài lại bundle.

## Cửa sổ desktop không mở

App desktop là một tiến trình Python riêng, không thuộc bundle. Khởi chạy nó từ bản checkout
bằng `python3 desktop/companion.py` (hoặc `./desktop/run.sh`).

- **Không có display.** Cửa sổ cần X11 hoặc Wayland. Trên server, dùng `ssh -X`, một phiên
  Wayland có XWayland, hoặc một display ảo; một host WSL thuần cần X server. Chạy
  `python3 desktop/companion.py --self-test` để kiểm tra mọi thứ không cần màn hình.
- **Cổng đã bị chiếm.** `cannot listen on 127.0.0.1:37421` nghĩa là đang có một instance bạn
  đồng hành khác chạy. Hãy thoát nó; trang luôn dò cổng 37421, nên giữ cổng mặc định là dễ
  nhất.
- **Thiếu GTK hoặc Pillow.** Script thoát với thông báo PyGObject/GTK hoặc lỗi `ImportError`
  của Pillow: cài `python3-gi gir1.2-gtk-3.0` và `python3 -m pip install --user Pillow`.

## Cửa sổ desktop chỉ là một khối tối đục

Không có binding Cairo hoặc không có window manager có compositing, cửa sổ sẽ vẽ sprite trên
nền tối đặc theo thiết kế. Hãy cài `python3-cairo`, dùng một WM/phiên có compositing, và khởi
động lại cửa sổ.

## Cửa sổ desktop cứ ở trạng thái `offline`

- Trang phải mở và **Cửa sổ trên màn hình** phải được tích trong panel bánh răng; dòng đó hiện
  **Tắt**, **Chưa chạy** hoặc **Đã kết nối**. Khi bật, card xem trước dưới dòng đó nhắc lại
  trạng thái và nêu lệnh khởi chạy, và rê chuột lên dòng đó cũng cho gợi ý tương tự.
- Kiểm tra bridge: `curl http://127.0.0.1:37421/health` phải trả về `{"ok":true,"v":1}`. Nếu
  lỗi, cửa sổ chưa chạy hoặc có tiến trình khác đang giữ cổng.
- Trang và cửa sổ phải chạy trên cùng một máy; bridge chỉ dùng loopback.
- Một trang phục vụ qua HTTPS thường chặn `http://127.0.0.1:37421` vì mixed content. Hãy dùng
  trang `http://127.0.0.1:3080` thông thường; CORS đã được bridge xử lý.
- Cửa sổ chuyển sang `offline` sau 10 giây không nhận post và vẫn tiếp tục chạy hoạt ảnh cảnh
  offline cho đến khi trạng thái quay lại.

## Cửa sổ desktop khó di chuyển hoặc nằm sai màn hình

- Kéo bằng nút trái ở bất kỳ đâu trên sprite. Các compositor Wayland có thể bỏ qua vị trí được
  yêu cầu hoặc từ chối yêu cầu di chuyển; hãy thử một phiên X11.
- **Reset position** trong menu chuột phải đưa nó về mặc định ở góc dưới bên phải.
- Tuỳ chọn desktop được lưu trong `~/.config/dsh-pixel-companions/desktop.json`; xoá file đó để
  đặt lại diện mạo, vị trí và trạng thái luôn nổi trên cùng.

## Sai ngôn ngữ

Mở bánh răng và dùng bộ chọn **Ngôn ngữ**: English, Русский, 中文, Tiếng Việt, 日本語, 한국어.
Lần chạy đầu tiên theo `navigator.language` khi nó khớp một trong các ngôn ngữ đó, nếu không
thì bắt đầu bằng tiếng Anh. Lựa chọn được lưu theo từng trình duyệt; phụ đề cảnh và phần chữ
trong panel đổi cùng nhau. Để quay lại ngôn ngữ lần chạy đầu suy ra từ trình duyệt, hãy xoá
key `kappy.pixel-companions.ui.v1`.

## Có hai bạn đồng hành cùng hiện

Hai plugin khác nhau đang đăng ký vào `shell.overlay` (hoặc dock khung soạn tin kiểu cũ).
Trong một profile chỉ nên bật một plugin bạn đồng hành: kiểm tra Cài đặt → Plugin xem có
plugin thú cưng hay trang trí nào khác không và tắt nó đi.

## Danh sách plugin hiện id package thay vì tiêu đề

Metadata locale không phân giải được. Hãy xác nhận rằng file `locale/<language>.json` tương ứng
(`en`, `ru`, `zh`, `vi`, `ja`, `ko`) tồn tại trong package đã cài và chứa `meta.title` cùng
`meta.description`, và rằng `package.json` export `"./locale/*.json"`. Một bản checkout dạng
link hiện thay đổi file ngay; một package tải về thì cần cài lại.

## `client.js` không tải được

Triệu chứng: danh sách plugin báo một module tải thất bại, hoặc console trình duyệt hiện
`loaded without registering "dsh-pixel-companions"`.

1. Xác nhận bundle được phục vụ bắt đầu bằng
   `window.__ModuleLoader__.load({ id: "dsh-pixel-companions"` — id phải bằng tên package trong
   `package.json`.
2. Xác nhận package đã được cài trong profile:
   `ls $DSH_HOME/profiles/web/node_modules/dsh-pixel-companions`.
3. Xem log cài đặt trong `$DSH_HOME/profiles/web/.plugin-manager/logs/`.
4. Cài lại: `dsh plugin --profile web remove dsh-pixel-companions` rồi
   `dsh plugin --profile web add link:"$PWD"`.

## Cảnh cứ ở trạng thái `error`

`lastAgentError` là một fact của phiên: sau một lượt thất bại, phiên vẫn báo nó cho đến khi
lượt tiếp theo bắt đầu. Bạn đồng hành hiện `error` trong khoảng thời gian đó (kèm một lần nhấp
nháy khi lượt dừng). Đây là hành vi có chủ đích; một lượt thành công sẽ đưa nó về các cảnh
bình thường.

## Đặt lại tuỳ chọn

Plugin lưu cài đặt của nó, kể cả `position` đã kéo, trong `localStorage` dưới key
`kappy.pixel-companions.ui.v1`. **Đặt lại vị trí** trong panel cài đặt chỉ xoá vị trí; để đưa
mọi tuỳ chọn về mặc định, hãy xoá key đó trong devtools của trình duyệt (Application → Local
Storage) và tải lại.

## Đọc console trình duyệt

Harness báo một component plugin ném lỗi dưới dạng `slot entry crashed in 'shell.overlay'` (bạn
đồng hành) hoặc `slot entry crashed in 'conversation.input.dock'` (bridge fact ẩn). Thông báo
đó nghĩa là component ném lỗi trong lúc render, không phải bundle tải thất bại. Hãy kèm thông
báo đó, cùng phiên bản Harness (`dsh --version`), vào mọi báo cáo.

## Gỡ cài đặt hoàn toàn

```sh
dsh plugin --profile web remove dsh-pixel-companions
```

Sau đó tải lại trang. `package.json`, lockfile và danh sách bundle của profile sẽ mất package;
không còn cài đặt Host nào bị bỏ lại vì plugin không bao giờ ghi cài đặt nào.
