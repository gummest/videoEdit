import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';
import { promisify } from 'util';

/**
 * Get video duration using ffprobe
 */
async function getVideoDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      const duration = metadata.format.duration;
      resolve(duration);
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
 */
async function concatenateSegments(segmentPaths, outputPath) {
  return new Promise((resolve, reject) => {
    const command = ffmpeg();

    // Add all input files
    segmentPaths.forEach(segmentPath => {
      command.input(segmentPath);
    });

    // Use concat filter
    const filterComplex = segmentPaths
      .map((_, index) => `[${index}:v:0][${index}:a:0]`)
      .join('') + `concat=n=${segmentPaths.length}:v=1:a=1[outv][outa]`;

    command
      .complexFilter(filterComplex)
      .outputOptions(['-map', '[outv]', '-map', '[outa]'])
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
 * 1. Get video duration
 * 2. Calculate number of cuts needed
 * 3. Extract segments from beginning, middle, and end
 * 4. Concatenate all segments
 * 5. Return the output file path
 */
export async function processVideo(inputPath, totalLength, cutDuration) {
  const videoDuration = await getVideoDuration(inputPath);

  if (!Number.isFinite(videoDuration) || videoDuration <= 0) {
    throw new Error('Unable to determine video duration');
  }

  console.log(`Input video duration: ${videoDuration.toFixed(2)}s`);

  if (totalLength > videoDuration) {
    throw new Error('Requested total length exceeds the video duration');
  }

  // Calculate number of cuts
  const totalCuts = Math.floor(totalLength / cutDuration);
  
  if (totalCuts === 0) {
    throw new Error('Total length too short for the given cut duration');
  }

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

    // Concatenate all segments
    const outputPath = path.join(outputDir, `processed_${timestamp}.mp4`);
    console.log(`Concatenating ${segmentPaths.length} segments...`);
    await concatenateSegments(segmentPaths, outputPath);

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
