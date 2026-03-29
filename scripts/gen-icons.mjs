import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';

// Simple recipe-themed icon: purple background + white fork & knife
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#7c3aed"/>
  <!-- Fork (left) -->
  <g fill="white">
    <!-- Fork tines -->
    <rect x="172" y="100" width="16" height="80" rx="8"/>
    <rect x="200" y="100" width="16" height="80" rx="8"/>
    <rect x="228" y="100" width="16" height="80" rx="8"/>
    <!-- Fork neck -->
    <rect x="180" y="172" width="56" height="16" rx="8"/>
    <!-- Fork handle -->
    <rect x="196" y="188" width="24" height="140" rx="12"/>
    <!-- Fork base -->
    <rect x="188" y="320" width="40" height="92" rx="12"/>
  </g>
  <!-- Knife (right) -->
  <g fill="white">
    <!-- Blade -->
    <path d="M300 100 Q340 100 340 180 L300 188 Z" rx="8"/>
    <!-- Handle -->
    <rect x="296" y="188" width="24" height="220" rx="12"/>
  </g>
</svg>`;

mkdirSync('public', { recursive: true });

for (const size of [192, 512]) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(`public/icon-${size}.png`);
  console.log(`Generated icon-${size}.png`);
}

// Apple touch icon (180x180)
await sharp(Buffer.from(svg))
  .resize(180, 180)
  .png()
  .toFile('public/apple-touch-icon.png');
console.log('Generated apple-touch-icon.png');
