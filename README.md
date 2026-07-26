# Video Generator

Generate 9:16 portrait MP4 videos from HTML/CSS/JS for TikTok, Reels, Shorts.
Uses Puppeteer to render frames and ffmpeg to encode. Built-in TTS voiceover via Microsoft Edge (no API key).

## Quick Start

```bash
npm install
npm run generate -- --html templates/index.html -o output/video.mp4 -d 10 --fps 30
```

## CLI

```bash
npx tsx src/index.ts --html templates/index.html -o output/video.mp4 -d 10 --fps 30 -v
```

### Voiceover (TTS)

```bash
npx tsx src/index.ts --html templates/index.html -o output/video.mp4 --tts-file voiceover.txt --tts-voice vi-VN-NamMinhNeural --tts-rate +20% --fps 30 -v
```

Duration auto-detects from TTS audio length. Override with `-d`.

### Audio background

```bash
npx tsx src/index.ts --html templates/index.html -o output/video.mp4 -d 10 --fps 30 -a music.mp3 --audio-volume 0.3
```

### Options

| Flag | Default | Description |
|------|---------|-------------|
| `-h, --html <path>` | (required) | Path to HTML file |
| `-o, --output <path>` | `output/video.mp4` | Output video file |
| `-d, --duration <s>` | `0` | Duration (auto from TTS if 0) |
| `--fps <n>` | `30` | Frames per second |
| `-W, --width <px>` | `1080` | Video width |
| `-H, --height <px>` | `1920` | Video height |
| `--crf <n>` | `16` | H.264 CRF (0-51, lower=better) |
| `--preset <p>` | `slow` | x264 preset |
| `-a, --audio <path>` | -- | Background music |
| `--audio-volume <0-1>` | `0.5` | Audio volume |
| `--tts <text>` | -- | TTS content (inline) |
| `--tts-file <path>` | -- | TTS text file |
| `--tts-voice <voice>` | `vi-VN-NamMinhNeural` | TTS voice |
| `--tts-rate <rate>` | `+20%` | TTS speed |
| `-v, --verbose` | | Verbose logs |

## Template System

Single template at `templates/index.html` with 5 scene types:

| Type | Purpose |
|------|---------|
| `hero` | Hook opening with title + accent + subtitle |
| `content` | Text content with line-by-line reveal |
| `list` | Staggered list with alternating slide-in |
| `compare` | Split comparison (bad vs good) + badges |
| `outro` | Call-to-action with button |

Configure via `VIDEO` object in `<script>`:

```javascript
const VIDEO = {
  accent: "#8b5cf6",
  accent2: "#06b6d4",
  scenes: [
    { type: "hero",     dur: 7,  title: "...", accent: "...", sub: "..." },
    { type: "content",  dur: 12, title: "...", body: '...<span class="co-seg">...</span>' },
    { type: "list",     dur: 14, items: [{ text: "...", desc: "..." }] },
    { type: "compare",  dur: 10, left: {...}, right: {...}, badges: [...] },
    { type: "outro",    dur: 8,  title: "...", sub: "...", btn: "..." },
  ],
};
```

Copy `templates/index.html` to a new file, edit `VIDEO`, and run.

## Safe Zone (TikTok)

Content auto-placed within safe zone: top 120px, bottom 200px, sides 60px.

## Programmatic API

```typescript
import { generateVideo } from './src/engine.js';

await generateVideo({
  html: '<html>...</html>',
  output: 'output/video.mp4',
  duration: 10,
  fps: 30,
  width: 1080,
  height: 1920,
  ttsText: 'Voiceover text',
  ttsVoice: 'vi-VN-NamMinhNeural',
  ttsRate: '+20%',
});
```

## Requirements

- Node.js 18+
- npm

Chrome (Puppeteer) + ffmpeg (ffmpeg-static) bundled -- no system install.
