import puppeteer, { ScreenshotClip } from 'puppeteer';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { EdgeTTS } from 'edge-tts-universal';

declare global {
  interface Window {
    __renderFrame: (progress: number) => void;
  }
}

export interface GenerateOptions {
  html: string;
  output: string;
  duration: number;
  fps: number;
  width: number;
  height: number;
  quality?: number;
  format?: 'jpeg' | 'png';
  crf?: number;
  preset?: string;
  audio?: string;
  audioVolume?: number;
  audioLoop?: boolean;
  ttsText?: string;
  ttsVoice?: string;
  ttsRate?: string;
  verbose?: boolean;
}

ffmpeg.setFfmpegPath(ffmpegStatic!);

function log(msg: string, verbose?: boolean) {
  if (verbose) console.log(`[engine] ${msg}`);
}

function runFFmpeg(cmd: ffmpeg.FfmpegCommand, outPath: string, verbose?: boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    cmd
      .on('start', (c) => { if (verbose) log(`ffmpeg: ${c}`, true); })
      .on('end', () => resolve())
      .on('error', (err) => reject(new Error(`ffmpeg: ${err.message}`)))
      .save(outPath);
  });
}

export async function generateVideo(opts: GenerateOptions): Promise<void> {
  const {
    html, output, duration, fps, width, height,
    quality = 90, format = 'jpeg', crf = 16, preset = 'slow',
    audio, audioVolume = 0.5, audioLoop = true,
    ttsText, ttsVoice = 'vi-VN-NamMinhNeural', ttsRate = '+20%', verbose = false
  } = opts;

  const outputAbs = path.resolve(output);
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vidgen-'));
  const framesDir = path.join(tmpDir, 'frames');
  await fs.mkdir(framesDir, { recursive: true });

  let audioFile = audio ? path.resolve(audio) : undefined;
  let finalDuration = duration;

  // Generate TTS if requested
  if (ttsText) {
    const ttsPath = path.join(tmpDir, 'voiceover.mp3');
    log(`Generating TTS (voice: ${ttsVoice})...`, verbose);
    const tts = new EdgeTTS(ttsText, ttsVoice, { rate: ttsRate });
    const result = await tts.synthesize();
    const audioBuf = Buffer.from(await result.audio.arrayBuffer());
    await fs.writeFile(ttsPath, audioBuf);
    log(`TTS generated (${audioBuf.length} bytes)`, verbose);
    audioFile = ttsPath;

    // Estimate duration: 48kbps MP3 → 6000 bytes/sec
    const audioDur = audioBuf.length / 6000;
    log(`TTS duration: ~${audioDur.toFixed(1)}s (estimate)`, verbose);

    if (duration <= 0 && audioDur > 0) {
      finalDuration = Math.ceil(audioDur);
      log(`Auto-duration: ${finalDuration}s (from TTS)`, verbose);
    } else if (audioDur > 0) {
      finalDuration = Math.max(duration, Math.ceil(audioDur));
    }
  }

  const totalFrames = finalDuration * fps;
  const padLen = String(totalFrames).length;

  log(`Launching browser (${width}x${height})...`, verbose);
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width, height });

  log('Rendering HTML...', verbose);
  await page.setContent(html, { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => {
    if (typeof window.__renderFrame !== 'function') {
      window.__renderFrame = () => {};
    }
  });

  const clip: ScreenshotClip = { x: 0, y: 0, width, height };
  const ext = format === 'png' ? 'png' : 'jpg';

  log(`Capturing ${totalFrames} frames @ ${fps}fps (${finalDuration}s)...`, verbose);
  for (let i = 0; i < totalFrames; i++) {
    const progress = totalFrames > 1 ? i / (totalFrames - 1) : 1;
    await page.evaluate((p) => {
      window.__renderFrame(p);
    }, progress);
    await page.evaluate(() => new Promise((r) => setTimeout(r, 5)));
    const name = `frame_${String(i).padStart(padLen, '0')}.${ext}`;
    await page.screenshot({ type: format, quality, clip, path: path.join(framesDir, name) });
    if (verbose && i % Math.max(1, Math.floor(totalFrames / 10)) === 0) {
      log(`  progress: ${Math.round((i / totalFrames) * 100)}%`, verbose);
    }
  }
  log(`Captured ${totalFrames} frames`, verbose);
  await browser.close();

  const inputGlob = path.join(framesDir, `frame_%0${padLen}d.${ext}`);
  const tempVideo = path.join(tmpDir, 'video.mp4');

  log('Encoding video...', verbose);

  const vcodecOpts = [
    '-c:v libx264',
    '-pix_fmt yuv420p',
    `-preset ${preset}`,
    `-crf ${crf}`,
  ];

  const encCmd = ffmpeg()
    .input(inputGlob)
    .inputFps(fps)
    .outputOptions(vcodecOpts);

  // If no audio, encode directly to final output
  if (!audioFile) {
    await runFFmpeg(encCmd, outputAbs, verbose);
    const stat = await fs.stat(outputAbs);
    log(`Video saved to ${outputAbs} (${(stat.size / 1024 / 1024).toFixed(1)} MB)`, verbose);
    await fs.rm(tmpDir, { recursive: true, force: true });
    return;
  }

  // Encode video without audio first
  await runFFmpeg(encCmd, tempVideo, verbose);

  // Merge audio with video
  log(`Merging audio: ${audioFile}`, verbose);

  const mergeCmd = ffmpeg().input(tempVideo);

  if (audioLoop && !ttsText) {
    mergeCmd.input(audioFile).inputOptions(['-stream_loop -1']);
  } else {
    mergeCmd.input(audioFile);
  }

  mergeCmd
    .audioCodec('aac')
    .outputOptions(['-af', `volume=${audioVolume}`, '-shortest'])
    .videoCodec('copy');

  await runFFmpeg(mergeCmd, outputAbs, verbose);

  const stat = await fs.stat(outputAbs);
  log(`Video saved to ${outputAbs} (${(stat.size / 1024 / 1024).toFixed(1)} MB)`, verbose);
  await fs.rm(tmpDir, { recursive: true, force: true });
}
