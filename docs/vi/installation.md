# Cài đặt

[English](../installation.md) | [中文](../zh/installation.md) | [Русский](../ru/installation.md) | Tiếng Việt | [日本語](../ja/installation.md) | [한국어](../ko/installation.md)

`dsh-pixel-companions` là một **bundle package** của dsh. Nó có một nửa Host không làm gì
và một nửa trình duyệt (`client.js`) vẽ bạn đồng hành trong slot `shell.overlay` phủ toàn
khung, nên phải được cài vào một profile dsh và được phục vụ bởi tiến trình `dsh web` đang
chạy.

`client.js` đã build và phần hình ảnh trong `assets/` đã được commit trong repo; route asset
của Harness phục vụ các file đó từ package đã cài, nên cài đặt **không cần bước build** và
không cần toolchain Node.

## Yêu cầu

- `dsh` CLI với một profile Web đã khởi tạo (`dsh web`). Thư mục profile là
  `$DSH_HOME/profiles/web`, trong đó `$DSH_HOME` mặc định là `~/.dsh`.
- `pnpm` có trên `PATH`. `dsh plugin` chuyển các tham số của nó cho pnpm trong thư mục
  profile.
- Node.js 22.6+ chỉ cần khi build lại bundle từ mã nguồn.
- Cửa sổ desktop tuỳ chọn cần Python 3.10+ với GTK 3 và Pillow trên cùng một máy; xem
  [desktop.md](desktop.md).

## Cài đặt từ bản checkout cục bộ

```sh
git clone https://github.com/kappyra/dsh-pixel-companions.git
cd dsh-pixel-companions
dsh plugin --profile web add link:"$PWD"
```

- `link:` cài bản checkout dưới dạng pnpm link thay vì copy, nên các chỉnh sửa trong bản
  checkout được phục vụ mà không cần cài lại.
- Một thư mục tuyệt đối cũng dùng được:
  `dsh plugin --profile web add /path/to/dsh-pixel-companions`.
- Thêm bundle sẽ nối tên package của nó vào `dsh.profile.bundles` trong `package.json` của
  profile — chính điều này bật nó lên.

## Cài đặt từ địa chỉ Git hoặc tarball

```sh
dsh plugin --profile web add github:kappyra/dsh-pixel-companions
# or
npm pack
dsh plugin --profile web add /path/to/dsh-pixel-companions-0.1.0.tgz
```

Cài từ Git sẽ lấy `client.js` đã commit; không có bước build nào chạy trên máy cài đặt.
Package không khai báo install script nào, nên pnpm sẽ không hỏi phê duyệt build script.

## Kích hoạt

`dsh plugin` ghi profile; nó không khởi động lại Host đang chạy. Trên profile Web mặc định,
transport `dsh-hmr` theo dõi thay đổi profile và trang nhận bundle mới, thường trong một hai
giây. Nếu không:

1. Tải lại trang Web (nếu nghi ngờ thì tải lại cứng).
2. Nếu bạn đồng hành vẫn không hiện, khởi động lại tiến trình Web (`Ctrl+C`, rồi `dsh web`)
   và tải lại.

Sau khi tải lại, bạn đồng hành xuất hiện gần góc dưới bên phải của cửa sổ, phía trên vùng soạn
tin. Nó sống trong overlay phủ toàn khung, nên hiện trên **mọi trang** của giao diện Web — cuộc
trò chuyện, Cài đặt, Plugin — và vẫn tồn tại khi chuyển trang: chuyển giữa các trang không
unmount nó, chỉ một lần tải lại hoàn toàn mới chạy lại bundle. Không cần một cuộc trò chuyện
đang mở; khi không có phiên nào được mount, bạn đồng hành chuyển sang hành vi idle/sleeping.
Kéo nó đến bất kỳ đâu trong cửa sổ bằng chuột trái, cảm ứng hoặc bút cảm ứng; nút bánh răng
bên cạnh mở panel cài đặt.

## Kiểm tra

- **Cài đặt → Plugin → Danh sách plugin** hiện một entry tên `Pixel companions` với mô tả này
  (từ `locale/*.json`).
- Bạn đồng hành hiện trên mọi trang (cuộc trò chuyện, Cài đặt, Plugin), không chỉ phía trên
  khung soạn tin.
- Kéo nó thì nó di chuyển; thả gần mép cửa sổ thì nó vẫn nằm trong màn hình; tải lại trang thì
  vị trí đã kéo được khôi phục.
- Bánh răng mở panel cài đặt với Nhân vật, Kích thước, Ngôn ngữ, Chuyển động, Hiển thị, Đặt
  lại vị trí, lưới xem trước 15 cảnh, Tự động và Đóng.
- Host đã compose bundle của bạn: `dsh --profile web --dump-config` liệt kê một dòng cho
  `dsh-pixel-companions`.
- Bridge fact ẩn không thêm DOM nào nhìn thấy được vào khung soạn tin; chỉ overlay vẽ.
- *(Tuỳ chọn)* Khi cửa sổ desktop đang chạy và **Cửa sổ trên màn hình** được bật, dòng trong
  panel bánh răng hiện **Đã kết nối** và cửa sổ phản chiếu cảnh hiện tại.

## Tuỳ chọn: cửa sổ desktop

Bạn đồng hành cũng có thể được phản chiếu sang một cửa sổ desktop độc lập trên cùng một máy.
Đó là một tiến trình Python riêng, không phải một bundle khác — không có gì được cài thêm vào
profile:

```sh
sudo apt install python3-gi gir1.2-gtk-3.0 python3-cairo
python3 -m pip install --user Pillow
python3 desktop/companion.py        # or ./desktop/run.sh
```

Sau đó tích **Cửa sổ trên màn hình** trong panel bánh răng của bạn đồng hành. Mặc định tắt,
nên trang không bao giờ dò cổng desktop cho đến khi bạn bật nó. Trang phải mở để có trạng thái
trực tiếp, và cả hai nửa phải chạy trên cùng một host (bridge chỉ dùng loopback). Hướng dẫn
đầy đủ: [desktop.md](desktop.md).

## Tắt, gỡ cài đặt, nâng cấp

- **Tắt** mà không gỡ cài đặt: bật/tắt bundle trong Cài đặt → Plugin, hoặc xoá nó khỏi
  `dsh.profile.bundles` trong `$DSH_HOME/profiles/web/package.json`. Bạn đồng hành biến mất
  khỏi mọi trang.
- **Gỡ cài đặt**: `dsh plugin --profile web remove dsh-pixel-companions`, hoặc dùng trang
  Plugin.
- **Nâng cấp bản checkout dạng link**: `git pull`, rồi `npm install && npm run build` và tải
  lại; transport HMR thay `client.js` vừa build. Một thay đổi trong `package.json` cần khởi
  động lại Host.
- **Gỡ cài đặt bản cài từ Git**: `dsh plugin --profile web remove dsh-pixel-companions` gỡ cả
  dependency lẫn entry bundle.

## Dùng trang Plugin thay cho CLI

Trang Plugin của Web cũng cài qua đúng đường pnpm đó:

1. Thanh bên → **Plugin**.
2. **Thêm plugin** (hoặc mũi tên → **Cài plugin của bên thứ ba**).
3. Nhập đúng spec mà bạn sẽ truyền cho `dsh plugin add`.
4. **Cài**, rồi **Bật ngay**.

## Xử lý khi kích hoạt thất bại

- Output của pnpm và log cài đặt được giữ trong
  `$DSH_HOME/profiles/web/.plugin-manager/logs/`.
- Một lần chạy thất bại sẽ khôi phục `package.json` và lockfile của profile.
- Nếu trang báo một bundle "đã tải nhưng không đăng ký" module Client, hãy kiểm tra rằng
  `client.js` bắt đầu bằng
  `window.__ModuleLoader__.load({ id: "dsh-pixel-companions"` và rằng tên package trong
  `package.json` vẫn bằng module id.
