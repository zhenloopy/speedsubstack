import { copyFileSync, mkdirSync, existsSync, readdirSync, writeFileSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const distDir = resolve(rootDir, 'dist');

// Ensure directories exist
if (!existsSync(resolve(distDir, 'icons'))) {
  mkdirSync(resolve(distDir, 'icons'), { recursive: true });
}
if (!existsSync(resolve(distDir, 'styles'))) {
  mkdirSync(resolve(distDir, 'styles'), { recursive: true });
}

// Copy manifest.json
copyFileSync(
  resolve(rootDir, 'manifest.json'),
  resolve(distDir, 'manifest.json')
);

// Copy popup.html
let popupHtml = readFileSync(resolve(rootDir, 'src/popup/popup.html'), 'utf-8');
popupHtml = popupHtml.replace(' type="module"', '');
writeFileSync(resolve(distDir, 'popup.html'), popupHtml);

// Copy popup.css
copyFileSync(
  resolve(rootDir, 'src/popup/popup.css'),
  resolve(distDir, 'popup.css')
);

// Copy styles
const stylesDir = resolve(rootDir, 'styles');
if (existsSync(stylesDir)) {
  for (const file of readdirSync(stylesDir)) {
    copyFileSync(
      resolve(stylesDir, file),
      resolve(distDir, 'styles', file)
    );
  }
}

// Copy icons if they exist
const iconsDir = resolve(rootDir, 'icons');
if (existsSync(iconsDir)) {
  for (const file of readdirSync(iconsDir)) {
    copyFileSync(
      resolve(iconsDir, file),
      resolve(distDir, 'icons', file)
    );
  }
}

console.log('Static files copied to dist/');
