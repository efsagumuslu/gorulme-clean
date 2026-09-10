// Injects the required AdMob/App Tracking Transparency entries, PLUS a
// portrait-only orientation lock, into the freshly-generated iOS project's
// Info.plist during CI (after `npx cap add ios`). This exists so you never
// need to open Xcode or touch a Mac yourself.
const fs = require('fs');
const path = require('path');

const IOS_ADMOB_APP_ID = 'ca-app-pub-8061507782344181~7726800949';

const plistPath = path.join('ios', 'App', 'App', 'Info.plist');
if (!fs.existsSync(plistPath)) {
  console.log('Info.plist not found at ' + plistPath + ' — skipping iOS configuration.');
  process.exit(0);
}

let plist = fs.readFileSync(plistPath, 'utf8');

const insertions = `
	<key>GADApplicationIdentifier</key>
	<string>${IOS_ADMOB_APP_ID}</string>
	<key>NSUserTrackingUsageDescription</key>
	<string>This identifier will be used to deliver personalized ads to you.</string>
	<key>ITSAppUsesNonExemptEncryption</key>
	<false/>
	<key>SKAdNetworkItems</key>
	<array>
		<dict>
			<key>SKAdNetworkIdentifier</key>
			<string>cstr6suwn9.skadnetwork</string>
		</dict>
		<dict>
			<key>SKAdNetworkIdentifier</key>
			<string>4fzdc2evr5.skadnetwork</string>
		</dict>
		<dict>
			<key>SKAdNetworkIdentifier</key>
			<string>4pfyvq9l8r.skadnetwork</string>
		</dict>
	</array>
`;

if (plist.includes('GADApplicationIdentifier')) {
  console.log('Info.plist already contains AdMob configuration — skipping.');
} else {
  plist = plist.replace('<dict>', '<dict>' + insertions);
  fs.writeFileSync(plistPath, plist);
  console.log('Injected AdMob + ATT entries into Info.plist');
}

// Lock to portrait-only (the game is designed exclusively for a vertical layout)
plist = fs.readFileSync(plistPath, 'utf8');
if (plist.includes('UISupportedInterfaceOrientations')) {
  console.log('Orientation already configured — skipping.');
} else {
  const orientationBlock = `
	<key>UISupportedInterfaceOrientations</key>
	<array>
		<string>UIInterfaceOrientationPortrait</string>
	</array>
	<key>UISupportedInterfaceOrientations~ipad</key>
	<array>
		<string>UIInterfaceOrientationPortrait</string>
	</array>
`;
  plist = plist.replace('<dict>', '<dict>' + orientationBlock);
  fs.writeFileSync(plistPath, plist);
  console.log('Locked iOS app to portrait orientation.');
}
