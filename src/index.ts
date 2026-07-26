#!/usr/bin/env node
import { Command } from 'commander';
import { generateVideo } from './engine.js';
import fs from 'node:fs/promises';
import path from 'node:path';

const program = new Command();

program
  .name('gen-video')
  .description('Generate MP4 video from HTML')
  .requiredOption('-h, --html <path>', 'Path to HTML file')
  .option('-o, --output <path>', 'Output video path', 'output/video.mp4')
  .option('-d, --duration <seconds>', 'Video duration in seconds (auto from TTS if 0)', '0')
  .option('--fps <number>', 'Frames per second', '30')
  .option('-W, --width <px>', 'Video width', '1080')
  .option('-H, --height <px>', 'Video height', '1920')
  .option('-q, --quality <number>', 'JPEG quality 1-100', '90')
  .option('-f, --format <format>', 'Frame format: jpeg|png', 'jpeg')
  .option('--crf <number>', 'H.264 CRF (0-51, lower=better)', '16')
  .option('--preset <preset>', 'x264 preset: ultrafast|fast|medium|slow|slower', 'slow')
  .option('-b, --bitrate <rate>', 'Video bitrate (e.g. 6M, 8M)')
  .option('-a, --audio <path>', 'Background audio file (mp3/wav)')
  .option('--audio-volume <0-1>', 'Audio volume', '0.5')
  .option('--audio-no-loop', 'Do not loop audio')
  .option('--tts <text>', 'Text-to-speech content (generates voiceover)')
  .option('--tts-file <path>', 'Text file for TTS')
  .option('--tts-voice <voice>', 'TTS voice (default: vi-VN-NamMinhNeural)', 'vi-VN-NamMinhNeural')
  .option('--tts-rate <rate>', 'TTS speed (e.g. +20%, -10%)', '+20%')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    try {
      const htmlPath = options.html;
      const htmlContent = await fs.readFile(htmlPath, 'utf-8');

      const audio = options.audio
        ? path.resolve(options.audio)
        : undefined;

      // Resolve TTS text
      let ttsText: string | undefined;
      if (options.ttsFile) {
        ttsText = await fs.readFile(path.resolve(options.ttsFile), 'utf-8');
      } else if (options.tts) {
        ttsText = options.tts;
      }

      await generateVideo({
        html: htmlContent,
        output: options.output,
        duration: Number(options.duration),
        fps: Number(options.fps),
        width: Number(options.width),
        height: Number(options.height),
        quality: Number(options.quality),
        format: options.format as 'jpeg' | 'png',
        crf: Number(options.crf),
        preset: options.preset,
        audio,
        audioVolume: Number(options.audioVolume),
        audioLoop: !options.audioNoLoop,
        ttsText,
        ttsVoice: options.ttsVoice,
        ttsRate: options.ttsRate,
        verbose: options.verbose ?? false,
      });

      console.log(`Done => ${options.output}`);
    } catch (err) {
      console.error('Error:', (err as Error).message);
      process.exit(1);
    }
  });

program.parse();
