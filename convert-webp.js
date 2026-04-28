const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function convert(inputPath, outputPath) {
  const framesDir = path.join(__dirname, 'demo-frames');
  if (fs.existsSync(framesDir)) fs.rmSync(framesDir, { recursive: true });
  fs.mkdirSync(framesDir, { recursive: true });

  console.log('Reading animated WebP...');
  const metadata = await sharp(inputPath, { animated: true, pages: -1, limitInputPixels: false }).metadata();
  const totalFrames = metadata.pages;
  const pageHeight = metadata.height / totalFrames;
  console.log(`Total frames: ${totalFrames}, Each: ${metadata.width}x${pageHeight}`);

  // Extract frames one at a time (memory efficient)
  for (let i = 0; i < totalFrames; i++) {
    const frameFile = path.join(framesDir, `frame_${String(i).padStart(5, '0')}.png`);
    // Read just one page at a time to save memory
    const buf = await sharp(inputPath, { page: i, limitInputPixels: false })
      .resize(1536, 864, { fit: 'contain', background: { r: 30, g: 30, b: 30 } })
      .png({ quality: 80, compressionLevel: 6 })
      .toBuffer();
    fs.writeFileSync(frameFile, buf);
    
    if (i % 50 === 0) {
      // Force garbage collection hint
      if (global.gc) global.gc();
      console.log(`Frame ${i}/${totalFrames}`);
    }
  }
  console.log(`\nExtracted all ${totalFrames} frames`);

  // Calculate FPS: aim for ~5 min video = 300 seconds
  // Each frame in browser recording is ~500ms apart, so ~2fps is natural
  const fps = 2;
  console.log(`Creating MP4 at ${fps} fps (~${Math.round(totalFrames/fps)} seconds)...`);
  
  execSync(
    `ffmpeg -y -framerate ${fps} -i "${framesDir}\\frame_%05d.png" -c:v libx264 -pix_fmt yuv420p -r 24 -crf 18 -preset slow "${outputPath}"`,
    { stdio: 'inherit' }
  );
  
  const size = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(1);
  console.log(`Done! ${outputPath} (${size} MB)`);
  
  fs.rmSync(framesDir, { recursive: true });
}

const input = process.argv[2];
const output = process.argv[3] || path.join(__dirname, 'demo-video.mp4');
if (!input) { console.log('Usage: node convert-webp.js <input.webp> [output.mp4]'); process.exit(1); }
convert(input, output).catch(console.error);
