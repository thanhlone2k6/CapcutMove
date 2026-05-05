# CapCut Project Collector - Tài liệu Bối cảnh Dự án (Context)

## 1. Tổng quan
**CapCut Project Collector** là một ứng dụng desktop chuyên dụng giúp người dùng di chuyển các dự án CapCut PC từ máy tính này sang máy tính khác một cách dễ dàng. Ứng dụng tự động thu thập tất cả tài nguyên (video, âm thanh, hình ảnh, font chữ) mà dự án đang sử dụng, đóng gói thành file ZIP và hỗ trợ import lại trên máy mới với khả năng tự động sửa đường dẫn (path patching).

## 2. Công nghệ sử dụng (Tech Stack)
- **Core**: Electron (v33+) + React 18
- **Build Tool**: `electron-vite` (Tối ưu hóa việc build riêng biệt Main, Preload và Renderer)
- **Ngôn ngữ**: TypeScript
- **Xử lý File**: `fs-extra`, `path`, `child_process`
- **Nén/Giải nén**: `archiver` (Nén streaming), `unzipper` (Giải nén)
- **Giao diện**: Vanilla CSS với thiết kế Dark Mode cao cấp, Glassmorphism, và hiệu ứng chuyển động mượt mà.

## 3. Cấu trúc chi tiết mã nguồn

### A. Main Process (`src/main/`)
Quản lý các tác vụ hệ thống và tương tác trực tiếp với hệ điều hành.
- **`index.ts`**: Điểm khởi đầu của ứng dụng. Thiết lập cửa sổ chính, đăng ký giao thức bảo mật `safe-file://` để hiển thị ảnh thumbnail và icon từ ổ cứng mà không vi phạm chính sách bảo mật của Chrome.
- **`ipcHandlers.ts`**: Nơi đăng ký tất cả các sự kiện IPC, kết nối giữa giao diện người dùng và các dịch vụ xử lý ở Main.
- **`capcutLocator.ts`**: Tự động tìm kiếm thư mục lưu trữ dự án mặc định của CapCut trên Windows (trong `AppData` hoặc `Documents`).
- **`projectResolver.ts`**: Liệt kê các thư mục dự án, kiểm tra tính hợp lệ (phải có `draft_meta_info.json` và `draft_content.json`), đọc metadata và lấy ảnh cover.
- **`assetCollector.ts`**: "Trái tim" của app. Sử dụng Regex để quét toàn bộ file JSON của dự án nhằm tìm ra đường dẫn của tất cả Media và Font chữ đang được sử dụng.
- **`zipService.ts`**: Thực hiện nén dự án. Sử dụng cơ chế Streaming để xử lý các file video dung lượng lớn mà không làm tràn bộ nhớ RAM.
- **`importService.ts`**: Xử lý giải nén, kiểm tra trùng tên dự án và khôi phục tài nguyên vào đúng vị trí trên máy mới.
- **`pathPatchService.ts`**: (Thực nghiệm) Tự động sửa lại các đường dẫn tuyệt đối bên trong file JSON của CapCut để trỏ về thư mục tài nguyên mới sau khi import.
- **`processChecker.ts`**: Kiểm tra trạng thái hoạt động của CapCut, hỗ trợ tắt (kill) và mở lại ứng dụng tự động.
- **`settingsService.ts`**: Lưu trữ cấu hình người dùng (thư mục cuối cùng, chế độ sắp xếp...) vào file JSON cục bộ.

### B. Preload Script (`src/preload/`)
Cầu nối bảo mật giữa Main và Renderer.
- **`index.ts`**: Lọc và phơi bày các hàm cần thiết ra đối tượng `window.api` cho React sử dụng.
- **`index.d.ts`**: Định nghĩa kiểu dữ liệu (Types) cho API, giúp code Renderer có gợi ý (Intellisense) chính xác.

### C. Renderer Process (`src/renderer/`)
Giao diện người dùng (Frontend).
- **`src/App.tsx`**: Quản lý bố cục chính, chuyển đổi Tab (giữ nguyên trạng thái bằng `display: none`), và hiển thị Badge thương hiệu "Build by ThanhNguyen" cùng Modal ủng hộ (Donate).
- **`src/index.css`**: Hệ thống Style toàn cục. Sử dụng biến CSS (CSS Variables) để quản lý màu sắc, bo góc hiện đại, scrollbar tùy chỉnh và các hiệu ứng Hover/Animation cao cấp.
- **`src/pages/ExportProject.tsx`**: 
  - Bố cục 2 cột: Bên trái là cài đặt & trạng thái, bên phải là lưới Grid xem trước dự án.
  - Tự động Check & Scan ngay khi người dùng chọn dự án.
- **`src/pages/ImportProject.tsx`**: Quy trình Import file ZIP, cho phép đổi tên nếu trùng và tự động mở CapCut sau khi xong.

## 4. Các tính năng đặc biệt & Tối ưu UX
- **Giao thức `safe-file://`**: Đã được tối ưu để đọc file trực tiếp bằng `fs.readFile`, fix triệt để lỗi không hiển thị ảnh thumbnail trên Windows.
- **Auto-Automation**: Tự động tắt CapCut khi làm việc với file hệ thống và tự động mở lại khi Import xong để người dùng kiểm tra kết quả ngay lập tức.
- **Pinned Branding**: Badge thông tin tác giả được ghim cố định ở góc màn hình, đi kèm nút "Buy me a coffee" tích hợp mã QR cá nhân.
- **Grid Layout 3 cột**: Tối ưu không gian hiển thị danh sách dự án với đầy đủ thông tin dung lượng và ngày cập nhật.
- **Streaming Logic**: Mọi thao tác nén/giải nén đều dùng Stream, đảm bảo app vẫn mượt mà ngay cả khi dự án nặng hàng chục GB.

## 5. Quy trình làm việc (Workflows)

### Quy trình Export (Xuất dự án)
1. Chọn/Tự động tìm thư mục CapCut.
2. Click chọn dự án từ Grid (App tự động kiểm tra tính hợp lệ và quét tài nguyên).
3. App liệt kê số lượng file tìm thấy và dung lượng tổng.
4. Nhấn Export: App tắt CapCut -> Gom file JSON + Media + Font -> Đóng gói ZIP -> Báo cáo tiến độ theo %.

### Quy trình Import (Nhập dự án)
1. Chọn file ZIP đã xuất.
2. App đọc file Manifest bên trong ZIP:
   - Nếu tên dự án đã tồn tại trên máy, app sẽ hiện popup yêu cầu người dùng nhập tên mới.
3. Nhấn Import: App tắt CapCut -> Giải nén -> Di chuyển tài nguyên vào thư mục dự án -> (Tùy chọn) Sửa đường dẫn -> Mở lại CapCut.

---
*Tài liệu này được cập nhật vào ngày 05/05/2026 bởi Antigravity.*
