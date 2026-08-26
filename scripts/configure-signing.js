const fs = require('fs');
const p = 'android/app/build.gradle';
let c = fs.readFileSync(p, 'utf8');

// add signingConfig reference inside the existing release buildType
c = c.replace(/release\s*\{/, 'release {\n            signingConfig signingConfigs.release');

// insert a signingConfigs block right after "android {"
const block = `
    signingConfigs {
        release {
            storeFile file(System.getenv("CM_KEYSTORE_PATH"))
            storePassword System.getenv("CM_KEYSTORE_PASSWORD")
            keyAlias System.getenv("CM_KEY_ALIAS")
            keyPassword System.getenv("CM_KEY_PASSWORD")
        }
    }
`;
c = c.replace('android {', 'android {' + block);

fs.writeFileSync(p, c);
console.log('build.gradle patched for release signing');
