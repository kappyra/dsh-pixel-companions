# Cách dùng Pixel Companions

[English](../usage.md) | [中文](../zh/usage.md) | [Русский](../ru/usage.md) | Tiếng Việt | [日本語](../ja/usage.md) | [한국어](../ko/usage.md)

Trang này là hướng dẫn dùng hằng ngày của tôi. Nếu plugin chưa được cài, hãy bắt đầu với
[installation.md](installation.md); toàn bộ việc cài đặt chỉ là một lệnh `dsh plugin` và một
lần tải lại trang. Mọi thứ bên dưới đều diễn ra trong trình duyệt; cửa sổ desktop tuỳ chọn được
nói ở cuối.

## Lần chạy đầu tiên

Sau khi bundle được cài và trang được tải lại, bạn đồng hành xuất hiện gần góc dưới bên phải
cửa sổ, phía trên vùng soạn tin. Tôi vẽ nó trong slot `shell.overlay` phủ toàn khung chính thức,
nên nó luôn hiện trong một cuộc trò chuyện, trong Cài đặt và trên trang Plugin, và vẫn tồn tại
khi chuyển trang. Bạn không cần mở cuộc trò chuyện: khi không có phiên, bạn đồng hành chỉ đơn
giản là nghỉ và ngủ.

Dòng phụ đề nhỏ phía trên sprite gọi tên cảnh bằng ngôn ngữ của bạn. Rê chuột lên sprite để
hiện nút bánh răng (⚙) và, khi có cuộc trò chuyện đang mở, cả ô nhập tin nhắn.

## Di chuyển

Kéo chính sprite bằng chuột trái, ngón tay hoặc bút cảm ứng. Một cú nhấn di chuyển ít hơn vài
pixel là nhấp chuột chứ không phải kéo: một cú nhấp tạo phản ứng với cảnh hiện tại, cú nhấp thứ
hai thật nhanh cho phản ứng mạnh hơn, và nhấp chuột phải mở panel cài đặt (nút bánh răng và
Shift+F10 cũng vậy).

Vị trí được giữ trong cửa sổ, kiểm tra lại khi cửa sổ đổi kích thước hoặc khi bạn đồng hành đổi
kích thước, và được lưu trong `localStorage` của trình duyệt này dưới key
`kappy.pixel-companions.ui.v1`; tải lại trang sẽ khôi phục vị trí đó. Nếu bạn đồng hành rơi vào
chỗ khó chịu, mở panel bánh răng và chọn **Đặt lại vị trí** để đưa nó về vị trí tự động ở góc
dưới bên phải.

## Tương tác

Bạn đồng hành phản ứng với sự chú ý của bạn, nhưng một phản ứng không bao giờ làm thay đổi
phiên, tín hiệu lỗi hay báo cáo hoàn thành.

- Một cú nhấp trái: phản ứng nhẹ nhàng, tuỳ ngữ cảnh — vuốt ve, vẻ mặt giật mình, vẻ mặt cầu xin
  khi đang chờ, reo mừng khi lượt đã xong, v.v.
- Nhấp đúp trái: phản ứng mạnh hơn — khó chịu khi đang gõ hoặc đang làm việc, bị quấy rầy khi
  đang đọc hoặc đang gỡ lỗi, ngại ngùng khi đang nghỉ, giận dữ khi bị đánh thức khỏi giấc ngủ.
- Nhấp chuột phải: mở panel cài đặt; nút bánh răng và Shift+F10 cũng vậy.
- Lỗi: bạn đồng hành khóc. Một cú nhấp sẽ an ủi nó thành vẻ mặt đáng yêu còn vương nước mắt, và
  vệt nước mắt vẫn còn cho đến khi lỗi được xoá.
- Mười phút agent làm việc thật sự: nó trông kiệt sức; nhấp chuột cho phản ứng xúc động, nhấp đúp
  thì được phản ứng giận dữ.
- Phản ứng chỉ là tạm thời và quay lại cảnh của agent. Với giảm chuyển động hoặc khi tắt chuyển
  động, chúng dùng khung PNG tĩnh, và câu thoại dưới sprite được bản địa hoá trong cả sáu ngôn
  ngữ.

## Gửi nhanh một tin nhắn

Khi có cuộc trò chuyện đang mở, rê chuột lên bạn đồng hành hoặc lên báo cáo hoàn thành: ô nhập
tin nhắn hiện ngay dưới báo cáo (hoặc dưới bạn đồng hành khi không có báo cáo nào). Gõ tối đa
2000 ký tự và nhấn **Enter** hoặc nút ➤ để gửi tới phiên hiện tại. **Escape** xoá ô nhập và
đóng nó.

Bản nháp trong khung soạn tin chính của bạn được khôi phục sau khi gửi, và việc gõ ở đây không
bao giờ làm đổi cảnh của bạn đồng hành. Ô nhập bị ẩn khi đang kéo và khi panel cài đặt đang mở;
nó cần một cuộc trò chuyện đang mở.

## Đọc báo cáo câu trả lời

Khi một lượt kết thúc, bạn đồng hành chuyển sang cảnh hoàn thành và giữ một báo cáo **dính
(sticky)** bên dưới: dòng đầu tiên của câu trả lời cuối cùng cùng nút **Chi tiết**. Báo cáo vẫn
ở đó cho đến khi bạn rê chuột lên bạn đồng hành (khoảng dừng 0.3 giây) hoặc một lượt mới bắt
đầu, nên bạn không bao giờ bỏ lỡ nó khi đang nhìn đi chỗ khác.

**Chi tiết** mở một panel cuộn được chứa toàn bộ câu trả lời cuối cùng dưới dạng văn bản thuần:
giữ nguyên xuống dòng, tối đa 8000 ký tự, không render HTML hay Markdown. Đóng panel bằng nút
✕, **Escape** hoặc nhấp ra ngoài. Khi panel đang mở, nó thay thế card báo cáo/ô nhập. Văn bản
câu trả lời ở lại trong trang; chỉ cảnh được phản chiếu sang cửa sổ desktop tuỳ chọn.

## Đổi kích thước

Có hai chỗ vào cho cùng một tuỳ chọn, và chúng luôn đồng bộ:

- slider **Kích thước** trong panel bánh răng;
- **Cài đặt → Chung → Kích thước bạn đồng hành**.

Slider chạy từ 50% đến 200% theo bước 5%; có nút − / +, phần trăm hiển thị trực tiếp và các
chip đặt sẵn 50/100/150/200%. Sprite được render đúng kích thước pixel đã scale (152×98 ở
100%), và vùng nhấp, phụ đề, cột báo cáo cùng panel chi tiết đều theo đó. Đổi kích thước sẽ tự
giới hạn lại vị trí đã lưu.

## Nhân vật, ngôn ngữ, chuyển động, hiển thị

Panel bánh răng còn có nhân vật (**Lumi** hoặc **Deepy**), ngôn ngữ giao diện, bật/tắt chuyển
động (WebP động hoặc PNG tĩnh), công tắc hiển thị, và lưới xem trước 15 cảnh với **Tự động** để
thử. Lần chạy đầu tiên theo `navigator.language`; ngôn ngữ bạn chọn cũng đổi phụ đề của bạn
đồng hành. Tắt chuyển động là cách nhanh nhất để tiết kiệm pin trên laptop.

## Cửa sổ desktop tuỳ chọn

Cùng sprite đó cũng có thể nổi bên ngoài trình duyệt trong một cửa sổ GTK nhỏ, luôn nổi trên
cùng, trên cùng một máy. Mặc định tắt và cần Python 3 với GTK 3 và Pillow:

```sh
sudo apt install python3-gi gir1.2-gtk-3.0 python3-cairo
python3 -m pip install --user Pillow
python3 desktop/companion.py
```

Tích **Cửa sổ trên màn hình** trong panel bánh răng; dòng đó hiện **Đã kết nối**, **Chưa chạy**
hoặc **Tắt**. Bridge chỉ lắng nghe trên `127.0.0.1:37421` và chỉ mang cảnh, nhân vật, scale và
cờ chuyển động — không bao giờ có prompt, bản nháp, tin nhắn, id phiên hay output của model.
Nhấp chuột phải lên cửa sổ desktop để mở menu (**Character**, **Size**, **Always on top**,
**Reset position**, **Hide for an hour**, **Quit**). Trang phải mở để có cập nhật trực tiếp.
Hướng dẫn đầy đủ: [desktop.md](desktop.md).

## Tắt nó

- Ẩn sprite mà không gỡ cài đặt: panel bánh răng → tắt **Hiển thị**, hoặc **Cài đặt → Plugin**.
- Tắt bundle: Cài đặt → Plugin, hoặc xoá nó khỏi `dsh.profile.bundles`.
- Gỡ cài đặt hoàn toàn: `dsh plugin --profile web remove dsh-pixel-companions`. Giao diện trở về
  như nguyên bản; không có file nào ngoài profile bị đụng tới.
- Cửa sổ desktop là một tiến trình riêng: thoát nó từ menu chuột phải của nó.

## Nó thấy gì và không thấy gì

Bạn đồng hành chỉ đọc các prop công khai của slot: trạng thái chạy của phiên, giai đoạn nhập
hiện tại, các tương tác đang chờ, cờ lỗi, và câu trả lời assistant đã ổn định vốn đã hiện trong
cuộc trò chuyện. Nó không bao giờ đọc văn bản prompt hay bản nháp trong khung soạn tin của bạn,
và không gọi mạng ngoài route asset của chính nó và bridge desktop localhost tuỳ chọn. Chi tiết
và báo cáo ở lại trong trang. Nếu bạn không bao giờ bật cửa sổ desktop, trang cũng không bao
giờ liên hệ tới cổng desktop.

## Bàn phím và khả năng truy cập

Sprite và bánh răng đều là những nút có thể focus như bình thường: **Tab** di chuyển tới chúng,
**Enter** hoặc **Space** mở panel cài đặt. **Escape** đóng panel và phần xem chi tiết, và nhấp
ra ngoài cũng vậy. Slider và các ô chọn dùng được bằng bàn phím, báo cáo được thông báo qua
`aria-live`, và panel chi tiết là một dialog có nhãn.

Xử lý sự cố: [troubleshooting.md](troubleshooting.md). Rule cảnh: [scenes.md](scenes.md).
