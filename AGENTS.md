# Video Generator — AI Agent Guide

Generate 9:16 portrait MP4 videos from HTML/CSS/JS for TikTok, Reels, Shorts.

## Quick Start

```bash
npm install
npm run generate -- --html templates/index.html -o output/video.mp4 -d 54 --fps 30
```

`-d` phải bằng tổng `dur` của tất cả scenes trong VIDEO config.

## CLI Usage

```bash
npx tsx src/index.ts --html templates/index.html -o output/video.mp4 -d 54 --fps 30 -v
```

### Audio / Voiceover

Nhạc nền:
```bash
npx tsx src/index.ts --html templates/index.html -o output/video.mp4 -d 54 --fps 30 -a music.mp3 --audio-volume 0.3
```

Giọng đọc (TTS via Microsoft Edge, không cần API key):
```bash
npx tsx src/index.ts --html templates/index.html -o output/video.mp4 --tts-file voiceover.txt --tts-voice vi-VN-NamMinhNeural --fps 30 -v
```

TTS tự động tính duration theo độ dài giọng đọc. Có thể ghi đè bằng `-d`.

### Options

| Flag | Default | Description |
|------|---------|-------------|
| `-h, --html <path>` | (required) | Path to HTML file |
| `-o, --output <path>` | `output/video.mp4` | Output video file |
| `-d, --duration <s>` | `5` | Duration in seconds |
| `--fps <n>` | `30` | Frames per second |
| `-W, --width <px>` | `1080` | Video width |
| `-H, --height <px>` | `1920` | Video height |
| `-q, --quality <n>` | `90` | JPEG quality (1-100) |
| `-f, --format <f>` | `jpeg` | Frame format |
| `-a, --audio <path>` | — | Background music |
| `--audio-volume <0-1>` | `0.5` | Audio volume |
| `--audio-no-loop` | — | Don't loop audio |
| `--tts <text>` | — | Nội dung text-to-speech (inline) |
| `--tts-file <path>` | — | File text cho TTS |
| `--tts-voice <voice>` | `vi-VN-NamMinhNeural` | Giọng đọc (vd: `vi-VN-HoaiMyNeural` nữ) |
| `-v, --verbose` | | Show detailed logs |

## Kịch Bản Video

Thư mục `scripts/` chứa các tệp kịch bản `.md`.
Xem `scripts/kichban.md` để biết cấu trúc mẫu.

Bạn có thể thêm tệp `.md` vào `scripts/` để AI agent đọc và tạo video theo.

---

## Template

### `templates/index.html` — ⭐ Template duy nhất

Motion graphics với **GSAP** (GreenSock Animation Platform) — engine inject tự động.
Không code editor, không icon. Hiệu ứng cinematic (scanlines, vignette, glow) + safe zone TikTok.

**Cách hoạt động:** Agent định nghĩa mảng `scenes`, mỗi scene có `type` và `dur` (giây).
Engine tự động chạy tuần tự, tổng `dur` = thời lượng video.

**5 loại scene (type):**

| Type | Mô tả | Khi nào dùng |
|------|-------|-------------|
| `hero` | Hook mở đầu — icon + title (accent) + sub | Giới thiệu chủ đề, câu hỏi lớn |
| `content` | Nội dung text — title + body (hỗ trợ HTML) | Giải thích, dẫn dắt, kể chuyện |
| `list` | Danh sách staggered — items đổ bộ từng cái | Liệt kê, so sánh đối lập (✓/✕) |
| `compare` | So sánh 2 cột — trái (bad) / phải (good) + badges | Đối chiếu cũ-mới, trước-sau |
| `outro` | Kết thúc — icon + title + sub + button | CTA, câu hỏi kết, kêu gọi hành động |

**Lưu ý:** Engine tự động inject GSAP (GreenSock Animation Platform) vào template trước khi render.
Agent có thể dùng `gsap.timeline()` trong scene type mới để tạo hiệu ứng custom.

Các scene type mặc định đã dùng GSAP timeline với `fromTo()`, `stagger`, `ease` — agent chỉ cần sửa object `VIDEO`.

### Cấu trúc đầy đủ

```javascript
const VIDEO = {
  accent: "#8b5cf6",
  accent2: "#06b6d4",

  scenes: [
    {
      type: "hero",
      dur: 7,
      title: "Dòng trên",
      accent: "Từ nhấn gradient (dòng 2)",
      sub: "Dòng phụ bên dưới",
    },
    {
      type: "content",
      dur: 12,
      title: "Tiêu đề phần nội dung",
      body: '<span class="co-seg">Đoạn 1 hiện trước</span><span class="co-seg">Đoạn 2 hiện sau</span><span class="co-seg">Mỗi <span class="hl">co-seg</span> hiện tuần tự</span>',
    },
    {
      type: "list",
      dur: 14,
      items: [
        { text: "✕ Mục 1", desc: "Mô tả ngắn" },
        { text: "✓ Mục 2", desc: "Mô tả ngắn" },
      ],
    },
    {
      type: "compare",
      dur: 10,
      left:  { label: "✕ Cách cũ", items: ["Điểm A", "Điểm B", "Điểm C"], side: "bad" },
      right: { label: "✓ Cách mới", items: ["Điểm X", "Điểm Y", "Điểm Z"], side: "good" },
      badges: ["Badge 1", "Badge 2", "Badge 3"],
    },
    {
      type: "outro",
      dur: 8,
      title: "Câu kết<br>có thể xuống dòng",
      sub: "Dòng phụ",
      btn: "Nút kêu gọi →",
    },
  ],
};
```

### Scene type custom với GSAP

Agent có thể định nghĩa scene type bằng `"type": "custom"` kèm function `buildTimeline`:

```javascript
// Trong VIDEO.scenes, thêm:
{
  type: "custom",
  dur: 6,
  buildTimeline(el) {
    const tl = gsap.timeline({ paused: true });
    tl.fromTo(el.querySelector('.my-el'), { opacity: 0, scale: 0.5 },
      { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(2)' });
    return tl;
  },
  html: '<div class="my-el">Custom content</div>',
}
```

Mọi easing, stagger, timeline của GSAP đều dùng được. Xem [GSAP Docs](https://gsap.com/docs/).

### Hướng dẫn cho AI Agent

1. **Đọc kịch bản** từ `scripts/` trước. Hiểu cấu trúc nội dung: hook → thân bài → kết luận.
2. **Chia kịch bản thành scenes** phù hợp với 5 type mặc định hoặc custom. Mỗi scene = 1 ý chính.
3. **Tính `dur` cho mỗi scene:**
   - `hero`: 5-7s (đủ đọc hook)
   - `content`: 10-16s (tuỳ độ dài body)
   - `list`: 2-3s mỗi item (6 items = 12-18s)
   - `compare`: 8-12s (3 items mỗi cột)
   - `outro`: 6-10s
4. **Đảm bảo tổng `dur` = `-d` flag** khi chạy CLI.
5. **Tốc độ vừa phải:** Mỗi scene có animation + hold time. Scene càng ngắn càng nên ít nội dung.
6. **Không dùng icon, emoji, ký tự đặc biệt** trong text (trừ ❌✅✕✓ dùng trong list/compare).
7. **Safe zone:** Nội dung tự động nằm trong vùng an toàn (top 120px, bottom 200px, sides 60px).
8. **Tạo file HTML mới** cho mỗi video (copy từ `templates/index.html`, sửa object `VIDEO`).

---

## Quy Tắc Safe Zone cho TikTok

Nội dung quan trọng (chữ, logo, sub) phải đặt ở **trung tâm**, tránh sát mép:

- **Top 120px**: tránh — nơi đặt avatar, tên kênh, nút Follow
- **Bottom 200px**: tránh — nơi đặt thanh nhạc, Like/Comment/Share
- **Sides 60px**: tránh — đảm bảo an toàn

## Programmatic API

```typescript
import { generateVideo } from './src/engine.js';

await generateVideo({
  html: '<html>...<script>function __renderFrame(p) { ... }</script></html>',
  output: 'output/video.mp4',
  duration: 10,
  fps: 30,
  width: 1080,
  height: 1920,
  audio: 'background.mp3',
  audioVolume: 0.4,
  verbose: true,
});
```

## Requirements

- Node.js 18+
- npm (dùng `npm.cmd` trên Windows)

Chrome (bundled via Puppeteer) + ffmpeg (bundled via ffmpeg-static) — không cần cài đặt riêng.
