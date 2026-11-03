# Cảnh

[English](../scenes.md) | [中文](../zh/scenes.md) | [Русский](../ru/scenes.md) | Tiếng Việt | [日本語](../ja/scenes.md) | [한국어](../ko/scenes.md)

Bạn đồng hành chỉ hiển thị đúng một cảnh tại một thời điểm. Cảnh được chọn từ các fact trực
tiếp mà Web client đã công bố; không có gì được suy ra từ văn bản prompt, không có lệnh gọi
model nào, và thao tác gõ của chính người dùng không làm đổi cảnh. Các rule nằm trong
`src/client/state.ts` (`deriveScene`) và được `tests/state.test.ts` bao phủ. Phụ đề cảnh được
bản địa hoá trong sáu ngôn ngữ (`src/client/text.ts`, `SCENE_LABELS`); bản thân các rule độc
lập với ngôn ngữ.

## Đầu vào

| Fact | Nguồn | Ý nghĩa |
| --- | --- | --- |
| `running` | `SessionSnapshot.running` qua bridge fact | Một lượt đang chạy trên Host |
| `pendingInteraction` | `useSessionStatus(…)` → `status.pendingInteraction` | Có phê duyệt hoặc câu hỏi đang chờ người dùng |
| `inputPhase` | `InputState.phase` qua bridge fact | `plain`, `adjudicating`, `claimed`, `submitting`, `sending` |
| `toolRunning` | `ChatSnapshot.legacy.runningCalls` khác rỗng, qua bridge | Một tool call đang thực thi ngay lúc này |
| `assistantStream` | `ChatSnapshot.legacy.partial.blocks[].kind` cộng với `text` khác rỗng (`reasoning` hoặc `text`), qua bridge | Những gì assistant đang stream ngay lúc này |
| `error` | `SessionSnapshot.promptError` hoặc `lastAgentError` | Đã báo lỗi gửi tin hoặc lỗi agent |
| `openError` | `SessionSnapshot.openState === 'error'` | Lịch sử phiên không mở được |
| `runningMs` | thời gian kể từ khi `running` thành true | Độ dài lượt chạy hiện tại |
| `idleMs` | thời gian kể từ lần cuối phiên/lượt thay đổi | Dùng cho đồng hồ ngủ |
| `flash` | đồng hồ cục bộ 4.8 giây sau khi dừng thất bại | Nhấp nháy lỗi; các lần dừng thành công thì sticky thay vào đó |

Các bit trực tiếp đến overlay dưới dạng `CompanionFacts.live` (1 = tool call đang chạy, 2 =
suy luận đang stream, 4 = văn bản trả lời đang stream) và được công bố trong cùng một frame
với Chat snapshot, nên thay đổi cảnh trực tiếp gần như tức thì. Đồng hồ 1 giây chỉ được dùng
cho các mức thời gian đã trôi qua và đồng hồ ngủ.

Các fact được entry bridge ẩn trong `conversation.input.dock` công bố và được overlay đọc. Khi
không có cuộc trò chuyện nào được mount, các fact cuối cùng được giữ lại với
`connected: false` và `running: false`, nên overlay chuyển sang hành vi idle/sleeping. Một
tương tác đang chờ vẫn hiện trên các trang không phải cuộc trò chuyện, vì overlay cũng tự
subscribe vào `useSessionStatus`.

## Thứ tự áp dụng rule

Rule khớp đầu tiên sẽ thắng:

```text
openError                          -> error
pendingInteraction                 -> waiting
inputPhase sending/submitting/adjudicating -> typing
toolRunning                        -> working
assistantStream === 'reasoning'    -> thinking
assistantStream === 'answer'       -> typing
running:
    runningMs > 180 000            -> coffee
    runningMs >  75 000            -> tired
    otherwise                      -> thinking   (request in flight, no live stream)
flash === 'error' or error         -> error
flash === 'success'                -> success
idleMs > 110 000                   -> sleeping
otherwise                          -> idle
```

Rule `flash` dành cho `success` vẫn còn trong `deriveScene`, nhưng overlay không còn tạo
nhấp nháy thành công có hẹn giờ nữa: một lần dừng thành công được áp dụng dưới dạng hoàn thành
`success` sticky (xem bên dưới). Chỉ có nhấp nháy lỗi là còn giữ cửa sổ 4.8 giây của nó. Các bit
trực tiếp không bị ràng buộc vào đồng hồ, nên chỉ các mức thời gian đã trôi qua (`tired` /
`coffee`) và đồng hồ ngủ là có độ chi tiết khoảng 1 giây.

## Hoàn thành sticky và panel chi tiết

Một lần dừng thành công là sticky: overlay giữ `success` cùng báo cáo một dòng của nó cho đến
khi người dùng rê chuột lên bạn đồng hành (khoảng dừng 320 ms để con trỏ chỉ đi ngang qua trên
đường tới báo cáo không vô tình đóng nó) hoặc một lượt mới bắt đầu. Rê chuột lên sẽ đóng card
và cảnh trở về `idle`/`sleeping`; một lượt vừa kết thúc sẽ mở lại nó. Bạn đồng hành không ngủ
thiếp đi trong khi một kết quả đã xong còn đang chờ được xem.

Dòng báo cáo hiện bản xem trước cùng nút **Chi tiết** đã bản địa hoá. Nút này mở một panel cuộn
được chứa toàn bộ câu trả lời cuối cùng dưới dạng văn bản thuần — đã escape qua React, không
render HTML hay markdown, giữ nguyên xuống dòng, giới hạn 8000 ký tự và cắt bằng dấu ba chấm —
đặt phía trên hoặc dưới bạn đồng hành và được giới hạn trong viewport. Panel đóng bằng ✕,
Escape hoặc nhấp ra ngoài, và ẩn đi khi báo cáo hoàn thành bị đóng. Văn bản báo cáo giữ
`role="status"` / `aria-live="polite"`, nút mở panel có `aria-expanded`, và panel là một
`role="dialog"` với tiêu đề **Báo cáo** (được bản địa hoá trong cả sáu ngôn ngữ). Khi panel
đang mở, nó thay thế card báo cáo/ô nhập; đóng panel sẽ khôi phục card đó.

Báo cáo và ô nhập tin nhắn khi rê chuột dùng chung một cột được giới hạn trong viewport, neo
dưới (hoặc trên) bạn đồng hành. Khi báo cáo còn hiện, ô nhập nằm ngay bên dưới nó, còn nút chi
tiết vẫn ở trong dòng báo cáo; rê chuột lên báo cáo giữ nó mở và để lộ ô nhập. Rê chuột lên
bạn đồng hành sẽ đóng báo cáo sau khoảng dừng 320 ms, sau đó ô nhập nằm ngay dưới bạn đồng
hành. Rời khỏi báo cáo lại ẩn ô nhập, trong khi báo cáo vẫn ở đó cho đến khi sprite được rê
chuột lên hoặc một lượt mới bắt đầu. Cột này và panel chi tiết tuân theo kích thước đã chọn
của bạn đồng hành (slider **Kích thước** chạy từ 50% đến 200%, với các chip đặt sẵn
50/100/150/200%; cùng control đó cũng có trong **Cài đặt → Chung → Companion size**).

## Hiệu ứng di chuyển (`roaming`)

`roaming` là hiệu ứng di chuyển, không phải một cảnh: nó không nằm trong `SCENES`, không bao
giờ được `deriveScene` trả về, và không có phụ đề hay rule nào. Khi người dùng kéo Deepy,
overlay vẽ hoạt ảnh `roaming` không bàn làm việc tuỳ chọn của cậu ấy thay cho cảnh hiện tại,
nên bàn, laptop, đèn và sàn nhà không bao giờ di chuyển theo; khi thả ra, cảnh hiện tại trở
lại. Whale Girl không có asset roaming và giữ nguyên sprite cảnh của mình khi di chuyển. Cửa
sổ desktop cũng làm y như vậy trong lúc cửa sổ đang bị di chuyển. Các rule 15 trạng thái ở
trên không thay đổi.

## Mỗi cảnh ngụ ý điều gì

| Cảnh | Cách đọc an toàn |
| --- | --- |
| `idle` | Không quan sát thấy gì |
| `typing` | Một lần gửi đang trên đường đi, hoặc assistant đang stream văn bản trả lời |
| `working` | Một tool call đang thực thi |
| `thinking` | Assistant đang stream phần suy luận, hoặc một request tới model đang trên đường đi — không bao giờ là người dùng đang gõ |
| `tired` | Một lượt chạy dài mà không có tín hiệu trực tiếp — chỉ là phép ví von, không phải model mệt |
| `coffee` | Một lượt chạy rất dài mà không có tín hiệu trực tiếp — chỉ để trang trí |
| `waiting` | Có gì đó đang chờ người dùng |
| `success` | Một lượt dừng mà không quan sát thấy lỗi — bao gồm cả huỷ bỏ; sticky cho đến khi bạn rê chuột lên bạn đồng hành hoặc một lượt mới bắt đầu |
| `error` | Một tín hiệu lỗi thật |
| `sleeping` | Không có thay đổi phiên nào trong 110 giây — chỉ để hiển thị |
| `planning`, `reading`, `searching`, `debugging`, `offline` | Chỉ dùng để xem trước thủ công; client chưa có tín hiệu có kiểu cho chúng |

`thinking` nói về chính công việc của assistant, không bao giờ nói về việc người dùng đang
soạn tin: gõ một bản nháp không thay đổi gì, và bạn đồng hành vẫn `idle` cho đến khi assistant
thực sự làm việc. Đừng bao giờ trình bày `tired`, `coffee`, `sleeping` hay `success` như những
fact về model. Chúng chỉ là các ẩn dụ trình bày trên trạng thái thô của client.

## Xem trước thủ công

Panel bánh răng liệt kê cả 15 cảnh dưới dạng thumbnail, kèm phụ đề theo ngôn ngữ giao diện đã
chọn. Chọn một cảnh sẽ buộc cảnh đó cho đến khi nhấn **Tự động** hoặc khi phiên thay đổi; cảnh
bị buộc không bao giờ được lưu lại. Panel cũng có **Đóng** (Escape cũng đóng được).

## Thêm hoặc đổi tên cảnh

1. Thêm cảnh vào `SCENES` trong `src/client/state.ts` và vào một rule trong `deriveScene`.
2. Thêm phụ đề của nó vào `SCENE_LABELS` trong `src/client/text.ts` cho cả sáu ngôn ngữ.
3. Thêm `assets/girl/<scene>.{webp,png}` và `assets/whale/<scene>.{webp,png}` (192×128, nền
   trong suốt; WebP có 16 frame ở 120 ms).
4. `npm run build` — manifest asset và bundler client sẽ nhận các file mới.
5. Mở rộng `tests/state.test.ts` cho rule mới.

## Giảm chuyển động

Khi `prefers-reduced-motion: reduce` khớp, hoặc khi người dùng tắt **Chuyển động**, PNG tĩnh
của cảnh sẽ được vẽ thay vì WebP động. Việc kiểm tra chạy lại trên mỗi lần đổi cảnh, nên một
thay đổi ở mức hệ điều hành được nhận ra mà không cần tải lại trang.
