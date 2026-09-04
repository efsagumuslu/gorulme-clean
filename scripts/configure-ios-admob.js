// Injects the required AdMob/App Tracking Transparency entries into the
// freshly-generated iOS project's Info.plist during CI (after `npx cap add ios`).
// This exists so you never need to open Xcode or touch a Mac yourself.
const fs = require('fs');
const path = require('path');

const IOS_ADMOB_APP_ID = 'ca-app-pub-XXXXXXXXXXXXXXXX~WWWWWWWWWW'; // TODO: replace with your iOS AdMob App ID

const plistPath = path.join('ios', 'App', 'App', 'Info.plist');
if (!fs.existsSync(plistPath)) {
  console.log('Info.plist not found at ' + plistPath + ' — skipping iOS AdMob configuration.');
  process.exit(0);
}

let plist = fs.readFileSync(plistPath, 'utf8');

const insertions = `
	<key>GADApplicationIdentifier</key>
	<string>${IOS_ADMOB_APP_ID}</string>
	<key>NSUserTrackingUsageDescription</key>
	<string>This identifier will be used to deliver personalized ads to you.</string>
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
