// Adds the Game Center entitlement to the freshly generated iOS project (run after `npx cap add ios`).
// Creates ios/App/App/App.entitlements and points both App build configurations at it.
const fs = require('fs');
const path = require('path');

const entPath = path.join('ios', 'App', 'App', 'App.entitlements');
const pbxPath = path.join('ios', 'App', 'App.xcodeproj', 'project.pbxproj');

if (!fs.existsSync(pbxPath)) {
  console.error('project.pbxproj not found at ' + pbxPath);
  process.exit(1);
}

const entitlements = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>com.apple.developer.game-center</key>
	<true/>
</dict>
</plist>
`;

if (fs.existsSync(entPath)) {
  const existing = fs.readFileSync(entPath, 'utf8');
  if (!existing.includes('com.apple.developer.game-center')) {
    const merged = existing.replace('</dict>', '\t<key>com.apple.developer.game-center</key>\n\t<true/>\n</dict>');
    fs.writeFileSync(entPath, merged);
    console.log('Merged Game Center entitlement into existing App.entitlements');
  } else {
    console.log('App.entitlements already contains Game Center');
  }
} else {
  fs.writeFileSync(entPath, entitlements);
  console.log('Created ' + entPath);
}

let pbx = fs.readFileSync(pbxPath, 'utf8');
if (pbx.includes('CODE_SIGN_ENTITLEMENTS')) {
  console.log('CODE_SIGN_ENTITLEMENTS already present in project.pbxproj — leaving as is');
} else {
  let count = 0;
  pbx = pbx.replace(/^(\s*)PRODUCT_BUNDLE_IDENTIFIER = [^;]+;$/gm, (m, indent) => {
    count++;
    return m + '\n' + indent + 'CODE_SIGN_ENTITLEMENTS = App/App.entitlements;';
  });
  if (count === 0) {
    console.error('Could not find PRODUCT_BUNDLE_IDENTIFIER in project.pbxproj');
    process.exit(1);
  }
  fs.writeFileSync(pbxPath, pbx);
  console.log('Patched ' + count + ' build configuration(s) with CODE_SIGN_ENTITLEMENTS');
}
