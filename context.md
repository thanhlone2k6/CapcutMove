# CapCut Project Collector - Tài liệu Bối cảnh Dự án (Context)

## 1. Tổng quan

**CapCut Project Collector** (tên app: **CapCutMove**) là một ứng dụng desktop chuyên dụng giúp người dùng di chuyển các dự án CapCut PC từ máy tính này sang máy tính khác một cách dễ dàng. Ứng dụng tự động thu thập tất cả tài nguyên (video, âm thanh, hình ảnh, font chữ) mà dự án đang sử dụng, đóng gói thành file ZIP và hỗ trợ import lại trên máy mới với khả năng tự động sửa đường dẫn (path patching).

Ngoài ra, ứng dụng còn tích hợp **Tab VIP** — tính năng cao cấp yêu cầu License Key, gồm hai công cụ:
- **Tải Video**: Tải video từ đa nguồn (YouTube, TikTok, Facebook, Instagram, Twitter/X, v.v.) chỉ bằng cách paste link, với auto-detect chất lượng tốt nhất và theo dõi tiến trình tải real-time.
- **Transcript**: Chuyển giọng nói thành văn bản (Speech-to-Text) offline bằng Whisper AI — hỗ trợ 90+ ngôn ngữ, xuất SRT/VTT/TXT.

Bên cạnh đó, Tab **Free** (miễn phí) gồm:
- **Export Project**: Đóng gói dự án CapCut thành file ZIP.
- **Import Project**: Giải nén và khôi phục dự án từ file ZIP.
- **Lưu nhanh (QuickLinks)**: Lưu và truy cập nhanh các thư mục/file/URL quan trọng, kèm popup toàn cục kích hoạt bằng phím tắt (mặc định `Alt+Q`).

## 2. Công nghệ sử dụng (Tech Stack)

- **Core**: Electron (v33+) + React 18
- **Build Tool**: `electron-vite` (Tối ưu hóa việc build riêng biệt Main, Preload và Renderer)
- **Ngôn ngữ**: TypeScript
- **Xử lý File**: `fs-extra`, `path`, `child_process`
- **Nén/Giải nén**: `archiver` (Nén streaming), `unzipper` (Giải nén)
- **Tải Video**: `yt-dlp` (CLI wrapper) qua `child_process.spawn` — hỗ trợ 1000+ platform
- **Transcript**: `Faster-Whisper-XXL` (Windows) / `whisper.cpp` (macOS) — inference offline hoàn toàn
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
│   │   ├── index.ts          # Điểm khởi chạy Electron, quản lý cửa sổ chính & popup, tray icon, global shortcut
│   │   ├── ipcHandlers.ts    # Lắng nghe và điều phối các kênh giao tiếp IPC
│   │   ├── licenseService.ts # [VIP] Xác thực License Key bằng SHA-256 hash
│   │   ├── pathExtractor.ts  # Trích xuất đường dẫn file từ JSON của CapCut
│   │   ├── pathPatchService.ts # Đổi đường dẫn tuyệt đối, xuất báo cáo patched_files.json
│   │   ├── processChecker.ts # Quản lý trạng thái hoạt động (bật/tắt) của CapCut PC
│   │   ├── projectResolver.ts# Quét, xác thực cấu trúc & trích xuất thumbnail của dự án
│   │   ├── settingsService.ts# Đọc/ghi file app-settings.json lưu thiết lập cục bộ
│   │   ├── transcriptService.ts # [VIP] Wrapper Whisper AI: tải binary, spawn transcribe, parse SRT/VTT output
│   │   ├── updateService.ts  # Quản lý tự động check & tải ngầm bản cập nhật từ GitHub
│   │   ├── utils.ts          # Tiện ích dùng chung (getAvailableName, v.v.)
│   │   ├── videoDownloadService.ts # [VIP] Wrapper yt-dlp: tải binary, spawn download, parse progress
│   │   └── zipService.ts     # Công cụ nén streaming Deflate Level 9 tránh tràn RAM
│   ├── preload/              # Preload Script (Cầu nối bảo mật IPC)
│   │   ├── index.d.ts        # Định nghĩa kiểu dữ liệu (Types) cho window.api
│   │   └── index.ts          # Expose an toàn API chính qua contextBridge ra Renderer
│   └── renderer/             # Renderer Process (Giao diện người dùng React)
│       ├── index.html        # File HTML gốc của giao diện chính
│       ├── popup.html        # File HTML riêng cho cửa sổ popup QuickLinks
│       └── src/              # Mã nguồn React + TypeScript
│           ├── assets/       # Tài nguyên đồ họa tĩnh (QR Code, logo mạng xã hội...)
│           ├── components/   # Các Component React dùng chung toàn app
│           │   ├── ConflictModal.tsx  # Modal xử lý xung đột tên file khi import
│           │   ├── CreatorWidget.tsx  # Widget thông tin tác giả và Donate ghim góc phải
│           │   ├── SupportModal.tsx   # Modal hiển thị QR Code chuyển khoản donate
│           │   └── UpdateWidget.tsx   # Toast cập nhật và nút check bản update thủ công
│           ├── pages/        # Các trang tính năng chính
│           │   ├── ExportProject.tsx  # [Free] Trang đóng gói & xuất bản dự án
│           │   ├── ImportProject.tsx  # [Free] Trang phục hồi dự án từ file ZIP lưu trữ
│           │   ├── VideoDownloader.tsx # [VIP] Trang tải video đa nguồn (paste URL → tải ngay)
│           │   ├── VipGate.tsx        # [VIP] Màn hình nhập & kích hoạt License Key
│           │   └── VipTools/          # [VIP] Container cho các công cụ VIP
│           │       ├── index.tsx      # Sub-tab bar VIP: "Tải Video" | "Transcript" + lock overlay
│           │       ├── QuickLinks/    # [Free] Tính năng lưu & truy cập nhanh
│           │       │   └── index.tsx  # Quản lý Groups & Items (folder/file/URL), CRUD đầy đủ
│           │       └── Transcript/    # [VIP] Tính năng chuyển giọng nói thành văn bản
│           │           ├── index.tsx          # Giao diện upload media + chọn ngôn ngữ + run Whisper
│           │           ├── WhisperSetupModal.tsx # Modal hướng dẫn cài đặt & chọn đường dẫn Whisper
│           │           └── TranscriptResult.tsx  # Hiển thị kết quả phân đoạn + xuất SRT/VTT/TXT
│           ├── popup/        # Cửa sổ popup QuickLinks (BrowserWindow riêng, frameless)
│           │   ├── popup.tsx    # Entrypoint React cho popup window
│           │   └── PopupApp.tsx # UI chính của popup: hiển thị QuickLink Groups dạng compact
│           ├── App.tsx       # Bố cục giao diện chính, Main Tab Bar (Free/VIP) và điều hướng
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

- **`index.ts`**: Điểm khởi đầu của ứng dụng. Thiết lập cửa sổ chính, popup QuickLinks (BrowserWindow frameless, alwaysOnTop), tray icon system (ẩn ra khay khi đóng), giao thức bảo mật `safe-file://`, và đăng ký global shortcut (mặc định `Alt+Q`) để mở/đóng popup QuickLinks từ bất kỳ đâu.
- **`ipcHandlers.ts`**: Nơi đăng ký tất cả các sự kiện IPC, kết nối giữa giao diện người dùng và các dịch vụ xử lý ở Main.
- **`capcutLocator.ts`**: Tự động tìm kiếm thư mục lưu trữ dự án mặc định của CapCut trên Windows (trong `AppData` hoặc `Documents`).
- **`projectResolver.ts`**: Liệt kê các thư mục dự án, kiểm tra tính hợp lệ (phải có `draft_meta_info.json` và `draft_content.json`), đọc metadata và lấy ảnh cover.
- **`assetCollector.ts`**: "Trái tim" của app. Sử dụng Regex để quét toàn bộ file JSON của dự án nhằm tìm ra đường dẫn của tất cả Media và Font chữ đang được sử dụng.
- **`zipService.ts`**: Thực hiện nén dự án. Sử dụng cơ chế Streaming để xử lý các file video dung lượng lớn mà không làm tràn bộ nhớ RAM.
- **`importService.ts`**: Xử lý giải nén, kiểm tra trùng tên dự án và khôi phục tài nguyên vào đúng vị trí trên máy mới.
- **`pathPatchService.ts`**: (Thực nghiệm) Tự động sửa lại các đường dẫn tuyệt đối bên trong file JSON của CapCut để trỏ về thư mục tài nguyên mới sau khi import.
- **`processChecker.ts`**: Kiểm tra trạng thái hoạt động của CapCut, hỗ trợ tắt (kill) và mở lại ứng dụng tự động.
- **`settingsService.ts`**: Lưu trữ cấu hình người dùng (thư mục cuối cùng, chế độ sắp xếp, phím tắt QuickLinks, đường dẫn Whisper...) vào file JSON cục bộ.
- **`videoDownloadService.ts`**: [VIP] Quản lý toàn bộ vòng đời tải video. Tự động tải `yt-dlp` và `ffmpeg` về `userData/binaries/` nếu chưa có, spawn tiến trình con tải xuống, parse stdout real-time để cập nhật progress, hủy bằng `SIGTERM`. Tự chọn format tốt nhất với ffmpeg hoặc fallback khi không có.
- **`transcriptService.ts`**: [VIP] Wrapper cho Whisper AI. Tự động phát hiện hoặc dùng đường dẫn Whisper do người dùng chỉ định. Hỗ trợ hai backend: `Faster-Whisper-XXL` (Windows — tích hợp sẵn trong Subtitle Edit) và `whisper.cpp` (macOS/Linux). Spawn tiến trình con chạy transcribe, parse output theo từng segment `[start --> end] text`, xuất SRT/VTT/TXT. Cho phép hủy mid-progress.
- **`licenseService.ts`**: [VIP] Xác thực License Key bằng SHA-256 hash. Key hợp lệ được lưu vào `userData/license.json`. Không cần kết nối mạng — validation offline hoàn toàn.
- **`fontCollector.ts`**: Thu thập font chữ từ dự án CapCut.
- **`pathExtractor.ts`**: Trích xuất và chuẩn hóa đường dẫn file từ JSON của CapCut.
- **`fileClassifier.ts`**: Phân loại file media theo loại (video/audio/image/font/other).
- **`utils.ts`**: Tiện ích dùng chung — `getAvailableName()` tạo tên file không trùng.

### B. Preload Script (`src/preload/`)

Cầu nối bảo mật giữa Main và Renderer.

- **`index.ts`**: Lọc và phơi bày các hàm cần thiết ra đối tượng `window.api` cho React sử dụng.
- **`index.d.ts`**: Định nghĩa kiểu dữ liệu (Types) cho API, bao gồm `QuickLinkItem` và `QuickLinkGroup`, giúp code Renderer có gợi ý (Intellisense) chính xác.

### C. Renderer Process (`src/renderer/`)

Giao diện người dùng (Frontend).

- **`src/App.tsx`**: Quản lý bố cục chính với Main Tab Bar hai cấp:
  - **Level 1 (Main tabs)**: `Free` (icon Zap, màu purple) và `VIP` (icon Lock/Star, màu amber/vàng — luôn hiển thị nổi bật).
  - **Level 2 (Free sub-tabs)**: `Export Project` | `Import Project` | `Lưu nhanh`.
  - **Level 2 (VIP sub-tabs)**: `Tải Video` | `Transcript` (trong VipTools/index.tsx).
  - Khi VIP chưa kích hoạt, hiển thị lock overlay với VipGate bên trên preview mờ của content.
  - Badge thương hiệu "Build by ThanhNguyen" ghim góc phải + Modal ủng hộ (Donate).

- **`src/index.css`**: Hệ thống Style toàn cục. **Quan trọng:** Tab VIP luôn hiển thị màu `#d97706` (amber) ở trạng thái inactive/locked, `#f59e0b` (gold) ở trạng thái active — khắc phục lỗi tab VIP bị ẩn do màu `--text-muted` quá thấp tương phản. Dùng biến CSS, bo góc hiện đại, scrollbar tùy chỉnh, animation.

- **`src/pages/ExportProject.tsx`**: [Free] Bố cục 2 cột (Settings + Project Preview). Tự động Check & Scan khi chọn dự án.

- **`src/pages/ImportProject.tsx`**: [Free] Quy trình Import file ZIP, cho phép đổi tên nếu trùng, tự động mở CapCut sau khi xong.

- **`src/pages/VipGate.tsx`**: [VIP] Màn hình kích hoạt License Key. Hiển thị khi VIP chưa active. Sau khi kích hoạt thành công, chuyển sang nội dung VIP (sau 1.2s).

- **`src/pages/VideoDownloader.tsx`**: [VIP] Giao diện tải video. Panel trái: chọn định dạng (Video MP4 / Audio MP3) và trạng thái yt-dlp. Panel phải: input URL (paste hoặc gõ), chọn thư mục lưu, danh sách task đang tải/hoàn thành/lỗi. Tích hợp clipboard watcher tự phát hiện link video.

- **`src/pages/VipTools/index.tsx`**: [VIP] Container cho các công cụ VIP. Hiển thị sub-tab bar "Tải Video" | "Transcript" — luôn render kể cả khi chưa unlock. Khi chưa kích hoạt, hiển thị blurred preview + VipGate overlay.

- **`src/pages/VipTools/QuickLinks/index.tsx`**: [Free] Quản lý bookmark nhanh. Hỗ trợ Groups (nhóm) và Items (mục). Mỗi Item có thể là: `folder` (mở trong Explorer), `file` (mở file), hoặc `link` (mở trình duyệt). Có CRUD đầy đủ, bulk select/delete, kéo-thả sắp xếp, cài đặt phím tắt global shortcut.

- **`src/pages/VipTools/Transcript/index.tsx`**: [VIP] Giao diện upload file audio/video → chọn ngôn ngữ (90+ languages) → chạy Whisper → hiển thị TranscriptResult. Kiểm tra xem Whisper đã được cài đặt chưa (qua WhisperSetupModal nếu chưa có).

- **`src/pages/VipTools/Transcript/WhisperSetupModal.tsx`**: Modal hướng dẫn cài đặt Whisper. Trên Windows: trỏ đến Purfview Faster-Whisper-XXL trong Subtitle Edit hoặc chọn thư mục tùy chỉnh. Trên macOS: hướng dẫn build whisper.cpp.

- **`src/pages/VipTools/Transcript/TranscriptResult.tsx`**: Hiển thị kết quả transcript dạng segments với timestamp. Hỗ trợ xuất file SRT, VTT, TXT. Preview trực tiếp trong app.

- **`src/popup/PopupApp.tsx`** và **`popup.tsx`**: Giao diện cho cửa sổ popup QuickLinks (BrowserWindow riêng biệt, frameless, alwaysOnTop, transparent). Hiển thị danh sách QuickLink Groups dạng compact khi nhấn phím tắt. Tự đóng khi mất focus.

## 4. Các tính năng đặc biệt & Tối ưu UX

- **Giao thức `safe-file://`**: Đọc file trực tiếp bằng `fs.readFile`, fix lỗi không hiển thị ảnh thumbnail trên Windows.
- **Auto-Automation**: Tự động tắt CapCut khi làm việc với file hệ thống và tự động mở lại khi Import xong.
- **Pinned Branding**: Badge thông tin tác giả ghim cố định góc màn hình, nút "Buy me a coffee" tích hợp QR code.
- **Grid Layout 3 cột**: Tối ưu không gian hiển thị danh sách dự án với đầy đủ thông tin.
- **Streaming Logic**: Mọi thao tác nén/giải nén dùng Stream, đảm bảo mượt mà ngay cả với dự án hàng chục GB.
- **[Free] QuickLinks Popup**: Kích hoạt bằng phím tắt toàn cục (Alt+Q), mở nhanh QuickLinks mà không cần bật app chính. Tự đóng khi mất focus.
- **[VIP] Multi-Source Downloader**: Paste URL → tải ngay với chất lượng tốt nhất (kết hợp ffmpeg). Hủy mid-progress, retry khi lỗi.
- **[VIP] Transcript Offline**: Nhận dạng giọng nói hoàn toàn offline bằng Whisper AI, không gửi dữ liệu lên server, bảo mật tuyệt đối.
- **[VIP] License System**: Xác thực offline bằng SHA-256, không cần server.
- **VIP Tab Visibility**: Tab VIP luôn hiển thị màu amber/vàng (#d97706 inactive, #f59e0b active) để người dùng luôn nhận ra dù chưa kích hoạt.

## 5. Phân tích Thuật toán và Logic Chi tiết

### A. Thuật toán Quét và Thu thập Tài nguyên (Asset Collection)

Đây là "trái tim" của hệ thống, nằm tại `src/main/assetCollector.ts`. Để không bỏ sót bất cứ file media nào, thuật toán hoạt động theo các bước nghiêm ngặt:

1. **Đọc File Cấu hình:** Hệ thống nhắm trực tiếp vào 2 file cốt lõi của CapCut:
   - `draft_content.json`: Chứa dữ liệu toàn bộ timeline, hiệu ứng, và tài nguyên media sử dụng trong video.
   - `draft_meta_info.json`: Chứa metadata, ảnh bìa, và cấu hình dự án.
2. **Trích xuất Đường dẫn (Path Extraction):** Parse toàn bộ JSON thành Object, đệ quy duyệt mọi Value. Bất kỳ chuỗi nào mang định dạng đường dẫn (chứa `/` hoặc `\\`, có đuôi mở rộng) đều được gom lại.
3. **Thuật toán Lọc trùng (Deduplication):** Dùng HashMap (`dedupeMap`). Tất cả đường dẫn được chuẩn hóa (chữ thường, `\\` → `/`) làm Key. Độ phức tạp O(1).
4. **Thuật toán Băm (Hashing) Chống Trùng tên:** Dùng MD5 hash từ `đường_dẫn + dung_lượng + thời_gian_sửa_đổi`. Lấy 6 ký tự đầu nối vào tên file (VD: `video_a1b2c3.mp4`). Đảm bảo 100% uniqueness.

### B. Phương pháp Nén (Export Zip)

Tối ưu tại `src/main/zipService.ts` bằng `archiver` với Deflate Level 9 và cơ chế Streaming (chunk ~64KB → zlib → pipe xuống file). RAM tiêu thụ chỉ vài chục MB dù dự án nặng 100GB.

### C. Phương pháp Giải nén (Import Zip)

`src/main/importService.ts` dùng `unzipper` API `Open.file()` — đọc Central Directory (mục lục cuối ZIP), duyệt mảng files, stream từng file ra ổ cứng. Tối ưu cho ZIP64, non-blocking, track progress chính xác.

### D. Thuật toán Sửa đường dẫn tự động (Path Patching)

`src/main/pathPatchService.ts` dùng chiến lược đa tầng (4 biến thể đường dẫn exact-match từ `path_map.json`, sau đó fallback Regex). Kỹ thuật `content.split(old).join(new)` tránh Catastrophic Backtracking. Báo cáo `patched_files.json` dùng relative path để debug.

### E. Hệ thống Định danh và Phân tích Dữ liệu (PostHog Analytics Integration)

PostHog Node.js SDK trong `src/main/analytics.ts`. Anonymous UUID lưu tại `userData/analytics_id.json`. Events: `app_opened`, `import_completed`, `import_failed`. Graceful shutdown qua `before-quit`.

### F. [VIP] Hệ thống Tải Video Đa Nguồn (Multi-Source Video Downloader)

`src/main/videoDownloadService.ts` dựa trên `yt-dlp` — hỗ trợ 1000+ platforms.

**Luồng Tải:**
```
User paste URL → IPC download:start { url, outputDir, mode }
    → checkFfmpeg() → spawn yt-dlp với UUID task ID
    → Parse stdout real-time → progress update
    → Download xong → rename bỏ epoch suffix
    → Emit download:done { filePath, title, ... }
```

**Binary Management**: `yt-dlp` và `ffmpeg` tải về `userData/binaries/` lần đầu dùng. `checkFfmpeg()` test thực thi thực tế (không chỉ check tồn tại) để tránh false positive khi bị quarantine.

**DownloadTask Object:**
```ts
interface DownloadTask {
  id: string
  url: string
  status: 'queued' | 'downloading' | 'done' | 'error' | 'cancelled'
  title?: string
  progress: number       // 0–100
  downloadedBytes: number
  totalBytes: number
  speed?: string         // "1.20MiB/s"
  filePath?: string
  error?: string
  mode: 'video' | 'audio'
  thumbnailUrl?: string
}
```

### G. [VIP] Hệ thống Transcript Offline (Whisper AI)

`src/main/transcriptService.ts` quản lý vòng đời transcription.

**Luồng Transcript:**
```
User upload file audio/video
    → getSavedOrDetectedWhisperPath() → tìm binary Whisper
    → Nếu chưa có: hiển thị WhisperSetupModal
    → spawn Whisper process với: --output_format srt --language <code>
    → Parse stdout: "[00:00:00.000 --> 00:00:05.120] Nội dung..." → segments[]
    → Emit transcript:progress (real-time)
    → Hoàn thành: trả về Segment[]
    → TranscriptResult: preview + export SRT/VTT/TXT
```

**Backend Whisper:**
| Platform | Binary | Nguồn |
|----------|--------|--------|
| Windows  | `faster-whisper-xxl.exe` | Subtitle Edit / Purfview releases |
| macOS    | `whisper-cli` hoặc `main` | whisper.cpp (build thủ công) |
| Linux    | `whisper-cli` hoặc `main` | whisper.cpp |

**Segment interface:**
```ts
interface Segment {
  start: number  // giây
  end: number    // giây
  text: string
}
```

## 6. Giao tiếp & Tương tác trong App (App Interaction & Features)

### A. Tương tác Người dùng & Tính năng UI

- **Zero-Click Scanning**: Mở app → tự động dò CapCut folder → nạp dự án ngay.
- **Cross-Page Sync**: Đổi thư mục CapCut ở Export → tự đồng bộ sang Import.
- **Warning Alert Banner**: Hiện cảnh báo vàng nếu media file bị thiếu sau khi scan.
- **Dynamic Versioning**: Tự load `appVersion` từ `package.json` qua IPC.
- **QuickLinks Global Popup**: `Alt+Q` mở/đóng popup frameless, alwaysOnTop tại vị trí con trỏ chuột.

### B. Giao tiếp Hệ thống (Architecture Communication)

- **IPC & Preload**: `window.api` (contextBridge) là cầu nối duy nhất giữa Renderer và Main.
- **Non-blocking UI**: Tất cả I/O nặng chạy ở Main Process, Renderer luôn 60fps.
- **Event-Driven Progress**: `sendProgress` / `mainWindow.webContents.send(...)` đẩy progress real-time về Renderer.

## 7. [Free] Tab Lưu Nhanh — QuickLinks

### A. Tính năng

Cho phép người dùng lưu và truy cập nhanh các đường dẫn thường dùng:
- **Folder**: Mở trong File Explorer
- **File**: Mở file bằng ứng dụng mặc định
- **Link (URL)**: Mở trong trình duyệt mặc định

Hỗ trợ tổ chức thành **Groups** (nhóm), CRUD đầy đủ, bulk select, sắp xếp kéo thả.

### B. Popup QuickLinks

- Cửa sổ **BrowserWindow** riêng biệt: `frame: false`, `alwaysOnTop: true`, `transparent: true`, `skipTaskbar: true`.
- Kích hoạt bằng **global shortcut** (mặc định `Alt+Q`), đặt tại vị trí con trỏ.
- Tự đóng khi mất focus (sau 600ms debounce tránh transient blur).
- Phím tắt có thể tùy chỉnh trong Settings của QuickLinks tab.

### C. Settings lưu trong `app-settings.json`
```json
{
  "quickLinkGroups": [...],
  "quickLinkShortcut": "Alt+Q"
}
```

## 8. [VIP] Tab VIP — Bộ Công Cụ Cao Cấp

Tab VIP chứa các tính năng tải video và transcript dành riêng cho người dùng có License Key. Gồm 2 sub-tab: `Tải Video` (VideoDownloader) và `Transcript`.

### A. Luồng License & VipGate (`VipGate.tsx`)

```
User click Tab VIP
    ↓
App.tsx kiểm tra license:check IPC
    ↓ chưa active          ↓ đã active
VipGate overlay       Nội dung VIP đầy đủ
    ↓
User nhập Key → license:activate
    ↓ success
VIP unlocked (sau 1.2s)
```

Key được hash SHA-256 và so với danh sách hash hardcode trong `licenseService.ts`. Xác thực **offline hoàn toàn**. License lưu tại `userData/license.json`.

### B. VideoDownloader (`VideoDownloader.tsx`)

**Panel trái (Settings):**
- Chọn định dạng: **Video (MP4)** hoặc **Chỉ âm thanh (MP3)**
- Trạng thái engine yt-dlp (đang tải / sẵn sàng / lỗi)

**Panel phải (Download Area):**
- Input URL với clipboard watcher (auto-detect link mỗi 1.5s)
- Toast "Phát hiện link video, tải ngay không?"
- Chọn thư mục lưu (lưu vào settings `lastVideoOutputDir`)
- Danh sách task chia 3 nhóm: Đang tải → Hoàn thành → Lỗi

### C. Transcript (`Transcript/index.tsx`)

- Upload file audio/video (drag & drop hoặc browse)
- Chọn ngôn ngữ (90+ languages)
- Kiểm tra Whisper đã cài chưa → nếu chưa hiển thị `WhisperSetupModal`
- Chạy transcribe → progress real-time → kết quả trong `TranscriptResult`
- Xuất: SRT, VTT, TXT

### D. Kênh IPC cho Video Download

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

### E. Kênh IPC cho Transcript

| Kênh IPC                    | Chiều           | Mô tả                                        |
| --------------------------- | --------------- | -------------------------------------------- |
| `transcript:start`          | Renderer → Main | Bắt đầu transcribe `{ filePath, language }`  |
| `transcript:cancel`         | Renderer → Main | Hủy process đang chạy                        |
| `transcript:checkWhisper`   | Renderer → Main | Kiểm tra Whisper đã setup chưa               |
| `transcript:setWhisperPath` | Renderer → Main | Lưu đường dẫn Whisper vào settings           |
| `transcript:progress`       | Main → Renderer | Cập nhật segments real-time                  |
| `transcript:done`           | Main → Renderer | Trả về `Segment[]` hoàn chỉnh                |
| `transcript:error`          | Main → Renderer | Thông báo lỗi                                |

### F. Thiết lập được lưu trong `app-settings.json`

```json
{
  "lastVideoOutputDir": "D:\\Videos",
  "videoDownloadMode": "video",
  "quickLinkGroups": [],
  "quickLinkShortcut": "Alt+Q",
  "vip": {
    "whisperPath": "C:\\...\\Purfview-Faster-Whisper-XXL"
  }
}
```

### G. Nền tảng Tải Video Hỗ trợ

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

---

_Tài liệu này được cập nhật vào ngày 26/05/2026 bởi Antigravity._
