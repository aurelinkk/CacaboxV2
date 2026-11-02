// Signature « ad hoc » de l'appli Mac (sans certificat Apple payant).
// Sans ça, electron-builder modifie l'appli sans la re-signer, et les Mac
// Apple Silicon refusent de l'ouvrir : « LiveKgb est endommagé ».
const { execFileSync } = require('child_process');
const path = require('path');

exports.default = async function (context) {
  if (context.electronPlatformName !== 'darwin') return;
  const app = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  console.log('  • signature ad hoc', app);
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'inherit' });
};
