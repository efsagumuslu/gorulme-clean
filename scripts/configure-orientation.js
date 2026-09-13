// Locks the Android app to portrait orientation (the game is designed
// exclusively for a vertical phone layout) and declares the AD_ID
// permission required by AdMob on Android 13+ (API 33+). Runs right after
// `npx cap add android`, before the manifest gets built into the final
// package.
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
  console.log('Locked Android app to portrait orientation.');
}

// Explicitly declare the AD_ID permission (needed for apps targeting
// Android 13+/API 33+ that use an advertising ID via AdMob). Some SDK
// versions already merge this in automatically, but declaring it directly
// in our own manifest guarantees it's present regardless.
if (manifest.includes('com.google.android.gms.permission.AD_ID')) {
  console.log('AD_ID permission already present — skipping.');
} else {
  manifest = manifest.replace(
    /<manifest([^>]*)>/,
    '<manifest$1>\n    <uses-permission android:name="com.google.android.gms.permission.AD_ID"/>'
  );
  console.log('Added AD_ID permission to AndroidManifest.xml.');
}

fs.writeFileSync(manifestPath, manifest);
