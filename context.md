# CapCut Project Collector - Tài liệu Bối cảnh Dự án (Context)

## 1. Tổng quan

**CapCut Project Collector** là một ứng dụng desktop chuyên dụng giúp người dùng di chuyển các dự án CapCut PC từ máy tính này sang máy tính khác một cách dễ dàng. Ứng dụng tự động thu thập tất cả tài nguyên (video, âm thanh, hình ảnh, font chữ) mà dự án đang sử dụng, đóng gói thành file ZIP và hỗ trợ import lại trên máy mới với khả năng tự động sửa đường dẫn (path patching).

Ngoài ra, ứng dụng còn tích hợp **Tab VIP** — tính năng cao cấp yêu cầu License Key, cho phép **tải video từ đa nguồn** (YouTube, TikTok, Facebook, Instagram, Twitter/X, v.v.) chỉ bằng cách paste link, với auto-detect chất lượng tốt nhất và theo dõi tiến trình tải real-time.

## 2. Công nghệ sử dụng (Tech Stack)

- **Core**: Electron (v33+) + React 18
- **Build Tool**: `electron-vite` (Tối ưu hóa việc build riêng biệt Main, Preload và Renderer)
- **Ngôn ngữ**: TypeScript
- **Xử lý File**: `fs-extra`, `path`, `child_process`
- **Nén/Giải nén**: `archiver` (Nén streaming), `unzipper` (Giải nén)
- **Tải Video**: `yt-dlp` (CLI wrapper) qua `child_process.spawn` — hỗ trợ 1000+ platform
- **Giao diện**: Vanilla CSS với thiết kế Dark Mode cao cấp, Glassmorphism, và hiệu ứng chuyển động mượt mà.

## 3. Cấu trúc chi tiết mã nguồn

### 📂 Sơ đồ Cấu trúc Thư mục & Tệp tin (Directory Tree)

```
capcut-move/
├── out/                      # Thư mục chứa mã nguồn biên dịch chạy thực tế (tự sinh)
├── release/                  # Chứa các bản cài đặt đóng gói (.exe, latest.yml, blockmap)
├── src/                      # Mã nguồn chính của ứng dụng
│   ├── main/                 # Main Process (Xử lý tác vụ hệ thống & Node.js APIs)
│   │   ├── analytics.ts      # Khởi tạo và theo dõi telemetry qua PostHog Node SDK
│   │   ├── assetCollector.ts # Thuật toán quét đệ quy trích xuất file media, font chữ
│   │   ├── capcutLocator.ts  # Tự động dò tìm thư mục lưu dự án mặc định của CapCut
│   │   ├── fileClassifier.ts # Phân loại file media theo loại (video/audio/image/font)
│   │   ├── fontCollector.ts  # Thu thập font chữ đang được dùng trong dự án
│   │   ├── importService.ts  # Giải nén ZIP64, khôi phục project & relink path an toàn
│   │   ├── index.ts          # Điểm khởi chạy Electron, quản lý cửa sổ & safe-file://
│   │   ├── ipcHandlers.ts    # Lắng nghe và điều phối các kênh giao tiếp IPC
│   │   ├── licenseService.ts # [VIP] Xác thực License Key bằng SHA-256 hash
│   │   ├── pathExtractor.ts  # Trích xuất đường dẫn file từ JSON của CapCut
│   │   ├── pathPatchService.ts # Đổi đường dẫn tuyệt đối, xuất báo cáo patched_files.json
│   │   ├── processChecker.ts # Quản lý trạng thái hoạt động (bật/tắt) của CapCut PC
│   │   ├── projectResolver.ts# Quét, xác thực cấu trúc & trích xuất thumbnail của dự án
│   │   ├── settingsService.ts# Đọc/ghi file app-settings.json lưu thiết lập cục bộ
│   │   ├── updateService.ts  # Quản lý tự động check & tải ngầm bản cập nhật từ GitHub
│   │   ├── utils.ts          # Tiện ích dùng chung (getAvailableName, v.v.)
│   │   ├── videoDownloadService.ts # [VIP] Wrapper yt-dlp: tải binary, spawn download, parse progress
│   │   └── zipService.ts     # Công cụ nén streaming Deflate Level 9 tránh tràn RAM
│   ├── preload/              # Preload Script (Cầu nối bảo mật IPC)
│   │   ├── index.d.ts        # Định nghĩa kiểu dữ liệu (Types) cho window.api
│   │   └── index.ts          # Expose an toàn API chính qua contextBridge ra Renderer
│   └── renderer/             # Renderer Process (Giao diện người dùng React)
│       ├── index.html        # File HTML gốc của giao diện
│       └── src/              # Mã nguồn React + TypeScript
│           ├── assets/       # Tài nguyên đồ họa tĩnh (QR Code, logo mạng xã hội...)
│           ├── components/   # Các Component React dùng chung toàn app
│           │   ├── ConflictModal.tsx  # Modal xử lý xung đột tên file khi import
│           │   ├── CreatorWidget.tsx  # Widget thông tin tác giả và Donate ghim góc phải
│           │   ├── SupportModal.tsx   # Modal hiển thị QR Code chuyển khoản donate
│           │   └── UpdateWidget.tsx   # Toast cập nhật và nút check bản update thủ công
│           ├── pages/        # Các trang tính năng chính
│           │   ├── ExportProject.tsx  # Trang đóng gói & xuất bản dự án
│           │   ├── ImportProject.tsx  # Trang phục hồi dự án từ file ZIP lưu trữ
│           │   ├── VideoDownloader.tsx # [VIP] Trang tải video đa nguồn (paste URL → tải ngay)
│           │   └── VipGate.tsx        # [VIP] Màn hình nhập & kích hoạt License Key
│           ├── App.tsx       # Bố cục giao diện chính, Tab Control và Blocking Update Screen
│           ├── index.css     # Thiết kế Glassmorphism, animations và styles toàn cục
│           └── main.tsx      # Entrypoint khởi tạo React 18 DOM
├── electron-builder.yml      # Cấu hình đóng gói cài đặt và cấu hình cập nhật tự động
├── electron.vite.config.ts   # Cấu hình build đa phân vùng bằng electron-vite
├── package.json              # Quản lý các thư viện cài đặt và số phiên bản của app
├── tsconfig.json             # Thiết lập trình biên dịch TypeScript
└── context.md                # Tài liệu bối cảnh chi tiết của hệ thống
```

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
- **`videoDownloadService.ts`**: [VIP] Quản lý toàn bộ vòng đời tải video. Tự động tải `yt-dlp` và `ffmpeg` về `userData/binaries/` nếu chưa có, spawn tiến trình con tải xuống, parse stdout real-time để cập nhật progress, hủy bằng `SIGTERM`. Tự chọn format tốt nhất với ffmpeg hoặc fallback khi không có.
- **`licenseService.ts`**: [VIP] Xác thực License Key bằng SHA-256 hash. Key hợp lệ được lưu vào `userData/license.json`. Không cần kết nối mạng — validation offline hoàn toàn.
- **`fontCollector.ts`**: Thu thập font chữ từ dự án CapCut.
- **`pathExtractor.ts`**: Trích xuất và chuẩn hóa đường dẫn file từ JSON của CapCut.
- **`fileClassifier.ts`**: Phân loại file media theo loại (video/audio/image/font/other).
- **`utils.ts`**: Tiện ích dùng chung — `getAvailableName()` tạo tên file không trùng.

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
- **`src/pages/VipGate.tsx`**: [VIP] Màn hình kích hoạt License Key. Hiển thị khi Tab VIP được mở lần đầu. Sau khi kích hoạt thành công, lưu license và chuyển sang `VideoDownloader`.
- **`src/pages/VideoDownloader.tsx`**: [VIP] Giao diện tải video. Panel trái: chọn định dạng (Video MP4 / Audio MP3) và trạng thái yt-dlp. Panel phải: input URL (paste hoặc gõ), chọn thư mục lưu, danh sách task đang tải/hoàn thành/lỗi. Tích hợp clipboard watcher tự phát hiện link video.

## 4. Các tính năng đặc biệt & Tối ưu UX

- **Giao thức `safe-file://`**: Đã được tối ưu để đọc file trực tiếp bằng `fs.readFile`, fix triệt để lỗi không hiển thị ảnh thumbnail trên Windows.
- **Auto-Automation**: Tự động tắt CapCut khi làm việc với file hệ thống và tự động mở lại khi Import xong để người dùng kiểm tra kết quả ngay lập tức.
- **Pinned Branding**: Badge thông tin tác giả được ghim cố định ở góc màn hình, đi kèm nút "Buy me a coffee" tích hợp mã QR cá nhân.
- **Grid Layout 3 cột**: Tối ưu không gian hiển thị danh sách dự án với đầy đủ thông tin dung lượng và ngày cập nhật.
- **Streaming Logic**: Mọi thao tác nén/giải nén đều dùng Stream, đảm bảo app vẫn mượt mà ngay cả khi dự án nặng hàng chục GB.
- **[VIP] Multi-Source Downloader**: Tích hợp `yt-dlp` để tải video từ 1000+ nền tảng. Paste URL → tải ngay với chất lượng tốt nhất tự động (kết hợp ffmpeg khi có). Hỗ trợ hủy mid-progress và retry khi lỗi.
- **[VIP] License System**: Xác thực offline bằng SHA-256 hash, không cần server. Key được lưu tại `userData/license.json`.

## 5. Phân tích Thuật toán và Logic Chi tiết

### A. Thuật toán Quét và Thu thập Tài nguyên (Asset Collection)

Đây là "trái tim" của hệ thống, nằm tại `src/main/assetCollector.ts`. Để không bỏ sót bất cứ file media nào, thuật toán hoạt động theo các bước nghiêm ngặt:

1. **Đọc File Cấu hình:** Hệ thống nhắm trực tiếp vào 2 file cốt lõi của CapCut:
   - `draft_content.json`: Chứa dữ liệu toàn bộ timeline, hiệu ứng, và tài nguyên media sử dụng trong video.
   - `draft_meta_info.json`: Chứa metadata, ảnh bìa, và cấu hình dự án.
2. **Trích xuất Đường dẫn (Path Extraction):** Thay vì dùng Regex thô sơ có nguy cơ bỏ sót hoặc bắt nhầm văn bản thường, hệ thống parse toàn bộ file JSON thành Object, sau đó đệ quy duyệt qua mọi Value trong cây dữ liệu (`extractPathsFromObj`). Bất kỳ chuỗi nào mang định dạng của đường dẫn hệ thống (chứa `/` hoặc `\\`, có đuôi mở rộng) đều được gom lại.
3. **Thuật toán Lọc trùng (Deduplication):** Trên một timeline dài, một đoạn video/âm thanh có thể bị cắt làm hàng trăm mảnh nhỏ, tạo ra hàng trăm đường dẫn lặp lại. Hệ thống tạo một HashMap (`dedupeMap`). Tất cả đường dẫn được chuẩn hóa (đưa về chữ thường, đổi `\\` thành `/`) để làm Key. Nhờ độ phức tạp thuật toán O(1) của HashMap, thao tác lọc hàng ngàn file trùng lặp diễn ra gần như tức thời.
4. **Thuật toán Băm (Hashing) Chống Trùng tên:** Trên máy tính người dùng, rất dễ xảy ra tình trạng trùng tên file ở các thư mục khác nhau (VD: `C:\Downloads\video.mp4` và `D:\Camera\video.mp4`). Nếu copy thẳng vào thư mục `assets_collected`, chúng sẽ ghi đè nhau. Để giải quyết, ứng dụng dùng thuật toán băm **MD5** tạo mã định danh từ chuỗi `Đường_dẫn_tuyệt_đối + Dung_lượng_file + Thời_gian_sửa_đổi`.
   - Lấy 6 ký tự đầu tiên của mã Hash này nối vào tên file gốc (VD: `video_a1b2c3.mp4`). Điều này đảm bảo 100% sự độc nhất tuyệt đối cho mọi tài nguyên.

### B. Phương pháp Nén (Export Zip)

Quy trình nén được tối ưu tại `src/main/zipService.ts` bằng thư viện `archiver` kết nối trực tiếp với API File System của Node.js.

- **Phương pháp & Thuật toán:** Nén chuẩn Deflate với cường độ nén tối đa (`zlib: { level: 9 }`).
- **Cơ chế Streaming (Luồng dữ liệu):**
  - **Cách hoạt động:** Việc nạp một video 5GB vào RAM để nén sẽ làm sập ứng dụng (Crash OOM). Do đó, thuật toán áp dụng cơ chế Streaming. Dữ liệu được đọc từ ổ cứng thành từng "chunk" (gói nhỏ khoảng 64KB) -> Đưa ngay vào bộ giải thuật nén zlib -> Ghi xuất trực tiếp (Pipe) chunk đã nén xuống file `.zip` đích (`fs.createWriteStream`).
  - **Ưu điểm:** Cực kỳ tiết kiệm tài nguyên. Dung lượng RAM tiêu thụ chỉ dao động ở mức vài chục MB cho dù dự án cần xuất nặng tới 100GB.
  - **Nhược điểm:** Hiệu năng phụ thuộc nhiều vào tốc độ Đọc/Ghi IOPS của ổ cứng hệ thống. Bên cạnh đó, vì nén theo luồng, không thể biết trước dung lượng file ZIP cuối cùng là bao nhiêu. Do đó, thanh Progress UI phải tính toán tiến độ (%) dựa trên số Byte _dữ liệu gốc_ đã được đưa qua luồng đọc thay vì Byte dữ liệu đã nén.

### C. Phương pháp Giải nén (Import Zip)

Quy trình giải nén do `src/main/importService.ts` đảm nhiệm, sử dụng thư viện `unzipper` với kỹ thuật đọc phân vùng hiện đại.

- **Phương pháp Giải nén:** Đọc Central Directory (Thư mục trung tâm) nằm ở phần đuôi của cấu trúc file ZIP.
- **Cơ chế:**
  - Thông thường người ta sẽ dùng hàm `unzipper.Extract()` để xả nén nguyên file. Phương pháp cũ này đọc file ZIP tuần tự từ byte đầu đến cuối, rất rủi ro với file lớn và dễ bị chặn luồng (blocking).
  - Ứng dụng này sử dụng API `Open.file()`. API này sẽ quét nhanh phần "mục lục" (Central Directory) của file ZIP, nạp cấu trúc cây thư mục thành một mảng `directory.files`.
  - Sau đó, hệ thống lặp qua mảng này, khởi tạo `.stream()` cho từng file con và pipe dữ liệu giải nén ra thẳng ổ cứng.
  - **Ưu điểm:** Đây là phương pháp tối ưu nhất cho định dạng **ZIP64** (tiêu chuẩn cho file > 4GB). Nó là Non-blocking, kiểm soát được luồng dữ liệu chính xác đến từng file, giúp theo dõi phần trăm tiến độ cực kỳ nhạy bén. Đồng thời dễ dàng bắt lỗi từng file cụ thể mà không làm gián đoạn cả quá trình.

### D. Thuật toán Sửa đường dẫn tự động (Path Patching)

Khi dự án được mang sang máy mới, các đường dẫn tĩnh (VD: ổ `C:\...`) nằm trong file JSON sẽ chết (offline). Tính năng Patch Paths (`src/main/pathPatchService.ts`) thực thi một thuật toán thông minh để nối lại (Relink) tài nguyên.

1. **Chiến lược Thay thế Đa tầng (Multi-Priority Patching):**
   - _Tầng 1 đến 4 (Độ chính xác tuyệt đối):_ App sử dụng file `path_map.json` (được tạo ở khâu Export). Ứng dụng sinh ra 4 biến thể của đường dẫn cũ (VD: dùng `/`, dùng `\\`, dùng `\\\\` escape thông thường, và `\/` escape JSON). Khớp đúng 100% các biến thể này để đổi thành đường dẫn của `assets_collected` mới.
   - _Tầng 5 (Fallback Regex Hậu kiểm):_ Trường hợp CapCut tự sinh ra đường dẫn lạ hoặc bị thiếu sót, app dùng một biểu thức chính quy (Regex) quét toàn bộ mã nguồn file JSON để mò tìm bất cứ text nào có vẻ là đường dẫn media. Sau đó trích xuất phần đuôi tên file (Basename) khớp với mã Hash để suy ngược ra vị trí file mới nằm ở đâu.
2. **Kỹ thuật Thao tác chuỗi An toàn:**
   - Việc dùng Regex `String.replace()` để thay thế hàng loạt đường dẫn trong một file JSON nặng 50MB là tự sát do hiện tượng "Catastrophic Backtracking" (gây kẹt CPU).
   - Ứng dụng sử dụng một mẹo cực kỳ tốc độ: **`content.split(chuỗi_cũ).join(chuỗi_mới)`**. Phương thức chia cắt và hợp nhất mảng này loại bỏ hoàn toàn Regex ở khâu ghi đè, chạy với tốc độ chớp mắt và an toàn tuyệt đối cho mọi ký tự đặc biệt có trong đường dẫn hệ điều hành.
3. **Báo cáo Debug Nâng cao (`patched_files.json`):**
   - Khi tiến hành Relink cho các timeline phức tạp hoặc chứa timeline lồng nhau trong thư mục `Timelines/[UUID]/`, nhiều file cấu hình cùng mang tên `draft_content.json` sẽ được patch.
   - Thay vì lưu tên file trần (`draft_content.json`), thuật toán cải tiến sử dụng **đường dẫn tương đối so với thư mục dự án** (VD: `Timelines/1a2b3c.../draft_content.json`). Điều này giúp phân biệt rõ ràng và tăng tối đa khả năng kiểm thử gỡ lỗi cho lập trình viên và người dùng nâng cao.

### E. Hệ thống Định danh và Phân tích Dữ liệu (PostHog Analytics Integration)

Kể từ phiên bản v6.2.0, ứng dụng tích hợp hệ thống tracking an toàn qua **PostHog Node.js SDK** trong Main Process (`src/main/analytics.ts`):

1. **Định danh Khách hàng Trực quan (Anonymous ID):**
   - Định danh duy nhất được lưu trữ tại file `analytics_id.json` ở phân vùng `userData` của hệ điều hành.
   - Nếu chưa tồn tại, hệ thống sinh ngẫu nhiên UUID dạng phiên bản 4 (`crypto.randomUUID()`) và lưu trữ vĩnh viễn. Đảm bảo tính bảo mật và sự riêng tư tuyệt đối cho khách hàng mà không thu thập dữ liệu cá nhân nhạy cảm.
2. **Ghi nhận Vòng đời & Sự kiện cốt lõi (Event Tracking):**
   - `app_opened`: Gửi ngay khi app khởi tạo cửa sổ chính xong, bao gồm hệ điều hành (`platform`) và phiên bản sản phẩm (`appVersion`).
   - `import_completed`: Ghi lại sau khi import thành công một file ZIP, lưu kèm số lượng tệp tin và trạng thái kích hoạt patch đường dẫn.
   - `import_failed`: Ghi nhận sự cố phát sinh kèm thông tin chi tiết lỗi.
3. **Bọc lỗi & Tắt dọn dẹp An toàn (Failsafe & Graceful Shutdown):**
   - Toàn bộ lệnh gửi sự kiện đều được bọc trong các khối `try/catch` nghiêm ngặt. Nếu người dùng mất kết nối Internet hoặc API Key có trục trặc, ứng dụng **tuyệt đối không phát sinh crash** hay gián đoạn trải nghiệm người dùng.
   - Khi ứng dụng nhận tín hiệu `before-quit` từ hệ điều hành, lệnh `posthog.shutdown()` được kích hoạt để tiến hành làm sạch bộ nhớ và truyền gửi tất cả event còn tồn trong bộ đệm lên server trước khi tiến trình chính thức kết thúc.

### F. [VIP] Hệ thống Tải Video Đa Nguồn (Multi-Source Video Downloader)

Được thực thi tại `src/main/videoDownloadService.ts`, dựa trên công cụ CLI `yt-dlp` — thư viện mã nguồn mở hỗ trợ hơn **1000 nền tảng** (YouTube, TikTok, Facebook, Instagram, Twitter/X, Bilibili, Vimeo, Dailymotion, v.v.).

1. **Kiến trúc Giao tiếp (IPC Architecture):**
   - Renderer gọi `download:start { url, outputDir, mode }` → Main spawn `yt-dlp` và trả về `{ id }`.
   - Tiến trình tải chạy **hoàn toàn không đồng bộ**. stdout của `yt-dlp` được pipe và parse real-time.
   - Cập nhật được đẩy về qua `mainWindow.webContents.send('download:progress', task)`.
   - Hoàn thành → emit `download:done`. Lỗi → emit `download:error`.
   - Người dùng hủy qua `download:cancel { id }` — gọi `childProcess.kill('SIGTERM')`.

2. **Luồng Tải Xuống (Download Flow):**

   ```
   User paste URL vào input (hoặc clipboard watcher phát hiện)
       ↓
   IPC: download:start { url, outputDir, mode }
       ↓
   videoDownloadService.startDownload()
       → checkFfmpeg() — test thực thi binary, không chỉ check tồn tại
       → Nếu ffmpeg có: -f bestvideo+bestaudio/best --merge-output-format mp4
       → Nếu không:     -f best[vcodec!=none][ext=mp4]/best[vcodec!=none]/best
       → spawn yt-dlp với UUID task ID
       → Parse stdout: [download] 45.3% of 54.23MiB at 1.20MiB/s → progress update
       → Parse [download] Destination: ... → track file path
       → Parse Merging formats into "..." → update final path
       ↓
   Download xong: rename bỏ epoch suffix, tránh trùng tên bằng counter (1), (2)...
       ↓
   Emit: download:done { id, filePath, title, ... }
   ```

3. **Quản lý Binary yt-dlp và ffmpeg:**
   - Cả hai binary được tải về `userData/binaries/` lần đầu tiên dùng, không bundled vào installer.
   - `ensureYtDlp()` tải yt-dlp từ GitHub releases. `ensureFfmpeg()` tải ffmpeg từ ffbinaries.
   - Trên macOS, sau khi extract ffmpeg: tự động chạy `xattr -d com.apple.quarantine` để Gatekeeper không chặn.
   - `checkFfmpeg()` test thực thi thực tế (`"path/ffmpeg" -version`) thay vì chỉ check `existsSync` — tránh false positive khi binary bị quarantine hoặc sai arch.
   - Nếu local ffmpeg hoạt động: pass `--ffmpeg-location` cho yt-dlp. Nếu không: yt-dlp dùng system PATH hoặc fallback format.

4. **DownloadTask Object:**

   ```ts
   interface DownloadTask {
     id: string
     url: string
     status: 'queued' | 'downloading' | 'done' | 'error' | 'cancelled'
     title?: string
     progress: number // 0–100
     downloadedBytes: number
     totalBytes: number
     speed?: string // "1.20MiB/s"
     filePath?: string // đường dẫn file sau khi xong
     error?: string // thông báo lỗi tiếng Việt
     mode: 'video' | 'audio'
     thumbnailUrl?: string
   }
   ```

5. **Danh sách Nền tảng Hỗ trợ (Supported Platforms):**

   | Nền tảng    | Ghi chú                                         |
   | ----------- | ----------------------------------------------- |
   | YouTube     | Video + Audio, Playlist, Shorts, Live (VOD)     |
   | TikTok      | Video + referer header bypass                   |
   | Facebook    | Video công khai & Reels                         |
   | Instagram   | Reels, Posts + referer header bypass            |
   | Twitter / X | Video đính kèm tweet                            |
   | Bilibili    | Video + Danmaku (phụ đề bình luận)              |
   | Vimeo       | Hỗ trợ video riêng tư qua referer               |
   | Dailymotion | Video công khai                                 |
   | Reddit      | Video bài đăng                                  |
   | Pinterest   | Video & GIF                                     |
   | Twitch      | VODs & Clips                                    |
   | 1000+ khác  | Xem danh sách đầy đủ tại yt-dlp supported sites |

## 6. Giao tiếp & Tương tác trong App (App Interaction & Features)

### A. Tương tác Người dùng & Tính năng UI

- **Khởi động Tự động Refresh & Tự động quét (Zero-Click Scanning):**
  - Ngay khi vừa mở app, ứng dụng sẽ kiểm tra thư mục lưu dự án cuối cùng. Nếu trống hoặc không tồn tại trên ổ đĩa, thuật toán tự động kích hoạt chế độ **Dò tìm Auto-Detect**, tìm ra thư mục CapCut mặc định và nạp ngay cấu hình.
  - Người dùng lập tức thấy toàn bộ dự án hiện lên trực quan mà không cần thực hiện bất kỳ thao tác click chuột cấu hình nào.
- **Đồng bộ hóa Trạng thái Đa trang (Cross-Page Sync):**
  - Mọi thao tác thay đổi thư mục nguồn CapCut tại một tab (VD: Export) sẽ tự động kích hoạt đồng bộ hóa tức thì sang tab kia (VD: Import). Điều này tránh hiện tượng lệch thông tin và đảm bảo tính nhất quán của dữ liệu.
- **Cảnh báo File Thiếu (Warning Alert Banner):**
  - Sau khi quét tài nguyên dự án hoàn tất, nếu phát hiện có bất kỳ file media gốc nào bị mất/không tìm thấy trên đĩa (trực quan hóa bằng status `missing`), giao diện hiển thị ngay một banner cảnh báo màu vàng chuyên nghiệp.
  - Banner liệt kê rõ ràng danh sách tối đa 3 file bị mất và tổng số file thiếu, giúp người dùng chủ động kiểm tra trước khi tiến hành đóng gói xuất bản.
- **Phiên bản Động (Dynamic Versioning):**
  - Thay vì hardcode phiên bản, ứng dụng tự động load trực tiếp số phiên bản hiện tại từ `package.json` thông qua API IPC `get-app-version`, đảm bảo hiển thị đồng bộ `App Version v{currentVersion}` ở mọi vị trí UI.

### B. Giao tiếp Hệ thống (Architecture Communication)

- **Cầu nối IPC & Preload:** Mọi luồng tương tác giữa UI (React) và logic Core (Node.js) chạy qua một API Context an toàn được cấu hình ở `preload/index.ts` (`window.api`).
- **Non-blocking UI:** Nhờ thiết kế phân tách giữa Main (backend) và Renderer (frontend), tất cả thao tác nặng nhọc (File I/O, regex searching, zipping) đều thực thi song song ở Main Process. Giao diện React hoàn toàn không bị "đóng băng" (Blocking) và đảm bảo 60 FPS trong mọi tình huống.
- **Event-Driven Progress:** Thông qua `sendProgress`, tiến trình cập nhật được đẩy về Renderer dưới dạng Event liên tục. React State tiếp nhận để re-render chỉ riêng những thanh đo (progress bars) mà không ảnh hưởng toàn cục trang.

## 7. [VIP] Tab VIP — Bộ Công Cụ Cao Cấp

Tab VIP là tính năng tải video đa nguồn dành riêng cho người dùng có License Key. Gồm 2 trang: `VipGate` (kích hoạt) và `VideoDownloader` (tải video).

### A. Luồng License & VipGate (`VipGate.tsx`)

```
User click Tab VIP
    ↓
App.tsx kiểm tra license:check IPC
    ↓ chưa active          ↓ đã active
VipGate.tsx           VideoDownloader.tsx
    ↓
User nhập Key → license:activate
    ↓ success
VideoDownloader.tsx (sau 1.2s)
```

- Key được hash SHA-256 và so với danh sách hash hardcode trong `licenseService.ts`.
- Xác thực **offline hoàn toàn**, không gọi server.
- License lưu tại `userData/license.json` — tồn tại vĩnh viễn cho đến khi xóa thủ công.

### B. VideoDownloader (`VideoDownloader.tsx`)

Giao diện 2 panel:

**Panel trái (Settings):**

- Chọn định dạng: **Video (MP4)** hoặc **Chỉ âm thanh (MP3)**
- Trạng thái engine yt-dlp (đang tải / sẵn sàng / lỗi)

**Panel phải (Download Area):**

- Input URL với clipboard watcher (auto-detect link mỗi 1.5s)
- Toast "Phát hiện link video, tải ngay không?" với nút Có/Bỏ qua
- Chọn thư mục lưu (lưu vào settings `lastVideoOutputDir`)
- Danh sách task chia 3 nhóm: Đang tải → Hoàn thành → Lỗi

**Task UI:**
| Thành phần | Mô tả |
|------------------|-----------------------------------------------------------------|
| **Thumbnail** | 80×45px — lấy từ YouTube CDN hoặc yt-dlp `--get-thumbnail` |
| **Platform tag** | Badge nhỏ nhận diện nguồn (YouTube/TikTok/Facebook/Instagram) |
| **Progress Bar** | % real-time + tốc độ + dung lượng |
| **Nút hành động**| Cancel (đang tải), Mở thư mục + Xóa (xong), Thử lại + Xóa (lỗi) |

### C. Kênh IPC cho Video Download

| Kênh IPC                | Chiều           | Mô tả                                   |
| ----------------------- | --------------- | --------------------------------------- |
| `download:start`        | Renderer → Main | Bắt đầu tải `{ url, outputDir, mode }`  |
| `download:cancel`       | Renderer → Main | Hủy task theo `{ id }`                  |
| `download:checkYtDlp`   | Renderer → Main | Kiểm tra yt-dlp đã có chưa              |
| `download:ensureYtDlp`  | Renderer → Main | Tải yt-dlp + ffmpeg nếu chưa có         |
| `download:showInFolder` | Renderer → Main | Mở Explorer tới file đã tải             |
| `download:deleteFile`   | Renderer → Main | Xóa file khỏi ổ đĩa                     |
| `download:progress`     | Main → Renderer | Cập nhật tiến độ real-time (push event) |
| `download:done`         | Main → Renderer | Thông báo hoàn thành kèm `filePath`     |
| `download:error`        | Main → Renderer | Thông báo lỗi kèm message tiếng Việt    |

### D. Thiết lập được lưu trong `app-settings.json`

```json
{
  "lastVideoOutputDir": "D:\\Videos",
  "videoDownloadMode": "video"
}
```

- **`lastVideoOutputDir`**: Thư mục lưu gần nhất. Nếu chưa có, app hỏi lần đầu tiên tải.
- **`videoDownloadMode`**: `"video"` (MP4) hoặc `"audio"` (MP3).

### E. yt-dlp và ffmpeg — tải về lúc chạy, không bundled

- Cả hai binary được download **lần đầu sử dụng** về `userData/binaries/` — không bundle vào installer (giảm kích thước app).
- Path: `yt-dlp.exe` / `yt-dlp_macos` / `yt-dlp` (Linux) và `ffmpeg.exe` / `ffmpeg`.
- Sau khi tải: `ensureYtDlp()` cũng gọi `ensureFfmpeg()` ngầm để chuẩn bị sẵn.
- macOS: tự remove quarantine sau khi extract để tránh Gatekeeper block.

---

_Tài liệu này được cập nhật vào ngày 20/05/2026 bởi Antigravity._
