// Android orientation + cutout + AdMob permission setup. Runs right after `npx cap add android`,
// before the manifest is built into the final package.
//
//  * Phones stay locked to PORTRAIT (the game is designed for a vertical phone layout).
//  * Tablets (smallest screen width >= 600dp) may rotate freely, so the game also works in landscape.
//    The manifest can only lock ALL devices or none, so the "phones only" lock is applied in code:
//    MainActivity picks the orientation at start-up from the device's smallest width.
//  * On tablets in LANDSCAPE the system bars (status bar + bottom navigation bar / taskbar) are hidden
//    (immersive mode), so only the game is visible. A swipe from the screen edge shows them briefly.
//    They are re-hidden after dialogs/ads and on rotation, and shown again in portrait.
//  * Display-cutout support is enabled and the AD_ID permission (needed by AdMob on Android 13+) is declared.
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------- manifest
const manifestPath = path.join('android', 'app', 'src', 'main', 'AndroidManifest.xml');
if (!fs.existsSync(manifestPath)) {
  console.log('AndroidManifest.xml not found — skipping orientation setup.');
  process.exit(0);
}
let manifest = fs.readFileSync(manifestPath, 'utf8');

// make sure no fixed orientation lock is left in the manifest (it would also lock tablets)
if (/\sandroid:screenOrientation="[^"]*"/.test(manifest)) {
  manifest = manifest.replace(/\s+android:screenOrientation="[^"]*"/g, '');
  console.log('Removed the manifest-level orientation lock (it is applied per device type in MainActivity).');
}

if (manifest.includes('android:windowLayoutInDisplayCutoutMode')) {
  console.log('Display-cutout mode already configured — skipping.');
} else {
  manifest = manifest.replace(
    /<activity\s/,
    '<activity\n            android:windowLayoutInDisplayCutoutMode="shortEdges"\n            '
  );
  console.log('Enabled display-cutout support.');
}

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

// ------------------------------------------------------------ MainActivity
function findFile(dir, name) {
  if (!fs.existsSync(dir)) return null;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const hit = findFile(full, name);
      if (hit) return hit;
    } else if (entry.name === name) {
      return full;
    }
  }
  return null;
}

const javaRoot = path.join('android', 'app', 'src', 'main', 'java');
const activityPath = findFile(javaRoot, 'MainActivity.java');
if (!activityPath) {
  // Fail safe: without the code-level lock phones could rotate, so lock everything instead.
  console.log('MainActivity.java not found — falling back to a portrait lock for all devices.');
  let m = fs.readFileSync(manifestPath, 'utf8');
  if (!/android:screenOrientation=/.test(m)) {
    m = m.replace(/<activity\s/, '<activity\n            android:screenOrientation="portrait"\n            ');
    fs.writeFileSync(manifestPath, m);
  }
  process.exit(0);
}

let src = fs.readFileSync(activityPath, 'utf8');
if (src.includes('smallestScreenWidthDp')) {
  console.log('MainActivity already applies the phone/tablet orientation rule — skipping.');
  process.exit(0);
}

// imports
const imports = [
  'android.content.pm.ActivityInfo',
  'android.content.res.Configuration',
  'android.os.Bundle',
  'androidx.core.view.WindowCompat',
  'androidx.core.view.WindowInsetsCompat',
  'androidx.core.view.WindowInsetsControllerCompat'
];
for (const imp of imports) {
  if (!src.includes('import ' + imp + ';')) {
    src = src.replace(/(package\s+[\w.]+;)/, (m0) => m0 + '\nimport ' + imp + ';');
  }
}

const orientationRule =
  '        // Phones: portrait only. Tablets (smallest width >= 600dp): free rotation.\n' +
  '        boolean isTabletDevice = getResources().getConfiguration().smallestScreenWidthDp >= 600;\n' +
  '        setRequestedOrientation(isTabletDevice\n' +
  '            ? ActivityInfo.SCREEN_ORIENTATION_FULL_USER\n' +
  '            : ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);\n';

const helperMethods =
  '\n    // Tablets in landscape: hide the status bar and the bottom navigation bar / taskbar so only the game shows.\n' +
  '    // (A swipe from the screen edge reveals them for a moment.) Everywhere else the bars stay as usual.\n' +
  '    private void applyTabletImmersive() {\n' +
  '        Configuration cfg = getResources().getConfiguration();\n' +
  '        boolean tablet = cfg.smallestScreenWidthDp >= 600;\n' +
  '        boolean landscape = cfg.orientation == Configuration.ORIENTATION_LANDSCAPE;\n' +
  '        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());\n' +
  '        if (controller == null) return;\n' +
  '        if (tablet && landscape) {\n' +
  '            controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);\n' +
  '            controller.hide(WindowInsetsCompat.Type.systemBars());\n' +
  '        } else {\n' +
  '            controller.show(WindowInsetsCompat.Type.systemBars());\n' +
  '        }\n' +
  '    }\n' +
  '\n' +
  '    @Override\n' +
  '    public void onWindowFocusChanged(boolean hasFocus) {\n' +
  '        super.onWindowFocusChanged(hasFocus);\n' +
  '        if (hasFocus) applyTabletImmersive();   // bars come back after dialogs / ads / keyboard\n' +
  '    }\n' +
  '\n' +
  '    @Override\n' +
  '    public void onConfigurationChanged(Configuration newConfig) {\n' +
  '        super.onConfigurationChanged(newConfig);\n' +
  '        applyTabletImmersive();                 // rotation\n' +
  '    }\n';

const classRe = /(class\s+MainActivity\s+extends\s+BridgeActivity\s*\{)/;
if (!classRe.test(src)) {
  console.log('Unexpected MainActivity shape — falling back to a portrait lock for all devices.');
  let m = fs.readFileSync(manifestPath, 'utf8');
  if (!/android:screenOrientation=/.test(m)) {
    m = m.replace(/<activity\s/, '<activity\n            android:screenOrientation="portrait"\n            ');
    fs.writeFileSync(manifestPath, m);
  }
  process.exit(0);
}

const onCreateRe = /(void\s+onCreate\s*\(\s*Bundle\s+(\w+)\s*\)\s*\{)/;
const hasOnCreate = onCreateRe.test(src);
if (hasOnCreate) {
  // an onCreate already exists: orientation rule at its start, immersive call right after super.onCreate(...)
  src = src.replace(onCreateRe, (m0) => m0 + '\n' + orientationRule);
  src = src.replace(/(super\.onCreate\s*\(\s*\w+\s*\)\s*;)/, (m0) => m0 + '\n        applyTabletImmersive();');
  src = src.replace(classRe, (m0) => m0 + helperMethods);
} else {
  const onCreate =
    '\n    @Override\n' +
    '    public void onCreate(Bundle savedInstanceState) {\n' +
    orientationRule +
    '        super.onCreate(savedInstanceState);\n' +
    '        applyTabletImmersive();\n' +
    '    }\n';
  src = src.replace(classRe, (m0) => m0 + onCreate + helperMethods);
}
fs.writeFileSync(activityPath, src);
console.log('MainActivity: phones locked to portrait; tablets rotate freely and hide the system bars in landscape.');
