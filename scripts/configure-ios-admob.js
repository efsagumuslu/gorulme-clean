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

// Lock iPhone to portrait-only (the game is designed exclusively for a vertical
// layout). iPad, however, MUST support all four orientations — Apple rejects
// uploads otherwise, since iPad's multitasking/Split View requires it.
// Capacitor's default Info.plist already ships a UISupportedInterfaceOrientations
// key (with all orientations enabled), so we must REPLACE its value, not just
// insert one if missing.
plist = fs.readFileSync(plistPath, 'utf8');
const portraitOnly = '<array>\n\t\t<string>UIInterfaceOrientationPortrait</string>\n\t</array>';
const allOrientations = '<array>\n\t\t<string>UIInterfaceOrientationPortrait</string>\n\t\t<string>UIInterfaceOrientationPortraitUpsideDown</string>\n\t\t<string>UIInterfaceOrientationLandscapeLeft</string>\n\t\t<string>UIInterfaceOrientationLandscapeRight</string>\n\t</array>';
const orientationKeyRegex = /<key>UISupportedInterfaceOrientations<\/key>\s*<array>[\s\S]*?<\/array>/;
const orientationIpadKeyRegex = /<key>UISupportedInterfaceOrientations~ipad<\/key>\s*<array>[\s\S]*?<\/array>/;

if (orientationKeyRegex.test(plist)) {
  plist = plist.replace(orientationKeyRegex, '<key>UISupportedInterfaceOrientations</key>\n\t' + portraitOnly);
} else {
  plist = plist.replace('<dict>', '<dict>\n\t<key>UISupportedInterfaceOrientations</key>\n\t' + portraitOnly);
}

if (orientationIpadKeyRegex.test(plist)) {
  plist = plist.replace(orientationIpadKeyRegex, '<key>UISupportedInterfaceOrientations~ipad</key>\n\t' + allOrientations);
} else {
  plist = plist.replace('<dict>', '<dict>\n\t<key>UISupportedInterfaceOrientations~ipad</key>\n\t' + allOrientations);
}

fs.writeFileSync(plistPath, plist);
console.log('Locked iPhone to portrait; iPad allows all orientations (Apple multitasking requirement).');
