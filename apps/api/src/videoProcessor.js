import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';
import { promisify } from 'util';

/**
 * Get video duration and audio stream info using ffprobe
 */
async function getVideoInfo(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      const duration = metadata.format.duration;
      const hasAudio = metadata.streams.some(stream => stream.codec_type === 'audio');
      resolve({ duration, hasAudio });
    });
  });
}

/**
 * Extract a segment from the video
 */
async function extractSegment(inputPath, outputPath, startTime, duration) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(startTime)
      .setDuration(duration)
      .output(outputPath)
      .outputOptions([
        '-c:v libx264',     // Re-encode video for precise cuts
        '-c:a aac',         // Re-encode audio
        '-preset ultrafast', // Fast encoding
        '-avoid_negative_ts make_zero'
      ])
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

/**
 * Concatenate multiple video segments
 * @param {string[]} segmentPaths - Paths to segment files
 * @param {string} outputPath - Output file path
 * @param {boolean} hasAudio - Whether segments have audio streams
 */
async function concatenateSegments(segmentPaths, outputPath, hasAudio = true) {
  return new Promise((resolve, reject) => {
    const command = ffmpeg();

    // Add all input files
    segmentPaths.forEach(segmentPath => {
      command.input(segmentPath);
    });

    // Use concat filter - adapt based on whether audio exists
    let filterComplex, outputOptions;
    if (hasAudio) {
      filterComplex = segmentPaths
        .map((_, index) => `[${index}:v:0][${index}:a:0]`)
        .join('') + `concat=n=${segmentPaths.length}:v=1:a=1[outv][outa]`;
      outputOptions = ['-map', '[outv]', '-map', '[outa]'];
    } else {
      // Video-only concat (no audio streams)
      filterComplex = segmentPaths
        .map((_, index) => `[${index}:v:0]`)
        .join('') + `concat=n=${segmentPaths.length}:v=1[outv]`;
      outputOptions = ['-map', '[outv]'];
    }

    command
      .complexFilter(filterComplex)
      .outputOptions(outputOptions)
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log(`Concatenation progress: ${Math.round(progress.percent)}%`);
        }
      })
      .run();
  });
}

/**
 * Main video processing function
 * 
 * Algorithm:
 * 1. Get video duration and check for audio stream
 * 2. Clamp totalLength to video duration
 * 3. Calculate number of cuts needed
 * 4. Extract segments from beginning, middle, and end
 * 5. Concatenate all segments (adapt for video-only if no audio)
 * 6. Return the output file path
 */
export async function processVideo(inputPath, totalLength, cutDuration) {
  const { duration: videoDuration, hasAudio } = await getVideoInfo(inputPath);

  if (!Number.isFinite(videoDuration) || videoDuration <= 0) {
    throw new Error('Unable to determine video duration');
  }

  console.log(`Input video duration: ${videoDuration.toFixed(2)}s, has audio: ${hasAudio}`);

  // Clamp effectiveTotalLength to video duration
  const effectiveTotalLength = Math.min(totalLength, Math.floor(videoDuration));

  if (effectiveTotalLength <= 0) {
    throw new Error('Video duration is too short or invalid total length requested');
  }

  // Calculate number of cuts
  const totalCuts = Math.floor(effectiveTotalLength / cutDuration);
  
  if (totalCuts === 0) {
    throw new Error('Total length too short for the given cut duration, or video is shorter than requested');
  }

  console.log(`Requested total length: ${totalLength}s, clamped to: ${effectiveTotalLength}s`);
  console.log(`Extracting ${totalCuts} cuts of ${cutDuration}s each`);

  // Distribute cuts evenly across beginning, middle, and end
  const cutsPerSection = Math.ceil(totalCuts / 3);
  const beginCuts = Math.min(cutsPerSection, totalCuts);
  const remainingCuts = totalCuts - beginCuts;
  const endCuts = Math.min(cutsPerSection, remainingCuts);
  const middleCuts = totalCuts - beginCuts - endCuts;

  console.log(`Distribution: ${beginCuts} beginning, ${middleCuts} middle, ${endCuts} end`);

  const segmentPaths = [];
  const outputDir = path.dirname(inputPath);
  const timestamp = Date.now();

  try {
    // Extract beginning cuts
    for (let i = 0; i < beginCuts; i++) {
      const startTime = i * cutDuration;
      if (startTime + cutDuration > videoDuration) break;
      
      const segmentPath = path.join(outputDir, `segment_begin_${timestamp}_${i}.mp4`);
      console.log(`Extracting beginning cut ${i + 1}/${beginCuts} at ${startTime}s`);
      await extractSegment(inputPath, segmentPath, startTime, cutDuration);
      segmentPaths.push(segmentPath);
    }

    // Extract middle cuts
    const middleStart = (videoDuration / 2) - ((middleCuts * cutDuration) / 2);
    for (let i = 0; i < middleCuts; i++) {
      const startTime = middleStart + (i * cutDuration);
      if (startTime < 0 || startTime + cutDuration > videoDuration) continue;
      
      const segmentPath = path.join(outputDir, `segment_middle_${timestamp}_${i}.mp4`);
      console.log(`Extracting middle cut ${i + 1}/${middleCuts} at ${startTime.toFixed(2)}s`);
      await extractSegment(inputPath, segmentPath, startTime, cutDuration);
      segmentPaths.push(segmentPath);
    }

    // Extract end cuts
    const endStart = videoDuration - (endCuts * cutDuration);
    for (let i = 0; i < endCuts; i++) {
      const startTime = endStart + (i * cutDuration);
      if (startTime < 0 || startTime + cutDuration > videoDuration) continue;
      
      const segmentPath = path.join(outputDir, `segment_end_${timestamp}_${i}.mp4`);
      console.log(`Extracting end cut ${i + 1}/${endCuts} at ${startTime.toFixed(2)}s`);
      await extractSegment(inputPath, segmentPath, startTime, cutDuration);
      segmentPaths.push(segmentPath);
    }

    if (segmentPaths.length === 0) {
      throw new Error('No segments could be extracted from the video');
    }

    // Concatenate all segments (pass hasAudio flag for proper filter)
    const outputPath = path.join(outputDir, `processed_${timestamp}.mp4`);
    console.log(`Concatenating ${segmentPaths.length} segments (hasAudio: ${hasAudio})...`);
    await concatenateSegments(segmentPaths, outputPath, hasAudio);

    // Cleanup segment files
    console.log('Cleaning up temporary segments...');
    await Promise.all(segmentPaths.map(p => fs.unlink(p).catch(() => {})));

    console.log(`Processing complete: ${outputPath}`);
    return outputPath;

  } catch (error) {
    // Cleanup on error
    await Promise.all(segmentPaths.map(p => fs.unlink(p).catch(() => {})));
    throw error;
  }
}
