// Locks the Android app to portrait orientation (the game is designed
// exclusively for a vertical phone layout). Runs right after `npx cap add
// android`, before the manifest gets built into the final package.
const fs = require('fs');
const path = require('path');

const manifestPath = path.join('android', 'app', 'src', 'main', 'AndroidManifest.xml');
if (!fs.existsSync(manifestPath)) {
  console.log('AndroidManifest.xml not found — skipping orientation lock.');
  process.exit(0);
}

let manifest = fs.readFileSync(manifestPath, 'utf8');

if (manifest.includes('android:screenOrientation')) {
  console.log('Orientation already configured — skipping.');
} else {
  manifest = manifest.replace(
    /<activity\s/,
    '<activity\n            android:screenOrientation="portrait"\n            '
  );
  fs.writeFileSync(manifestPath, manifest);
  console.log('Locked Android app to portrait orientation.');
}
