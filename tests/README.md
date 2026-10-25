# Kiểm tra nâng cấp học sáo

Cài Node.js và Playwright, rồi chạy:

```sh
npm install --no-save --package-lock=false playwright@1.64.1
npx playwright install chromium
node tests/run.cjs
```

Runner tự mở máy chủ cục bộ trên cổng ngẫu nhiên. Có thể đặt `CHROMIUM_EXECUTABLE_PATH` để dùng Chromium đã cài; `PLAYWRIGHT_MODULE` để dùng gói Playwright ở đường dẫn khác.

Các kiểm tra gồm:

- 240 bộ câu hỏi luyện tai: đáp án cân bằng, đúng hướng cao độ, đúng nốt mốc, số nốt và lựa chọn hợp lệ.
- Phát mẫu sáo tre và xác nhận cao độ xấp xỉ Đô C5; phát được khi tùy chọn tiếng nốt chung đang tắt.
- Đáp án chỉ mở sau khi nghe; không cộng điểm hoặc ghi lịch sử hai lần; nhớ mức và loại bài.
- Micro bằng MediaStream phát từ bộ dao động: đúng nốt, sai quãng, ngắt tiếng khi đổi nốt, từ chối quyền mic và kết thúc track sau bài.
- Sheet bằng tín hiệu tổng hợp: sớm/muộn, thiếu/dư trường độ và bù trễ; hoàn thành câu, lặp câu, tăng tốc sau ba lượt đạt và hủy lặp khi chuyển mục.
- Bố cục 320/390 px và ngang 844 px, không tràn ngang, không có lỗi JavaScript.

Tín hiệu thử là tín hiệu âm thanh có kiểm soát, không thay thế việc thử trên điện thoại với sáo thật. Tiếng phòng, tiếng loa và độ trễ mic vẫn có thể làm sai phép đo; ngân và tách tiếng chỉ là ước lượng âm học.

# Nguồn âm mẫu

PanPiper5, **Low Bamboo Flute.wav**, Freesound 659915, CC0:
https://freesound.org/people/PanPiper5/sounds/659915/

Dùng bản preview HQ do tác giả công khai. Đã cắt đoạn ổn định, chuyển cao độ bằng Rubber Band (FFmpeg), chuẩn hóa và nhúng WAV mono 24 kHz trong trang để không cần tải từ bên thứ ba lúc tập. Mẫu gốc sau xử lý khoảng 523,804 Hz; bộ phát hiệu chỉnh về tần số chuẩn theo MIDI. Các nốt khác dùng tốc độ phát khác nhau. Đây không phải bộ từng nốt thu riêng trên sáo trúc Việt Nam.
