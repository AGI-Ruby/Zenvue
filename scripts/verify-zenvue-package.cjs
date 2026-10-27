const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const asar = require('@electron/asar');
const ResEdit = require('resedit');
const output = path.resolve(process.argv[2] || path.join(root, 'release/zenvue/win-unpacked'));
const archive = path.join(output, 'resources/app.asar');
const hash = data => crypto.createHash('sha256').update(Buffer.from(data)).digest('hex');
const files=[];
function walk(dir) { for(const item of fs.readdirSync(dir,{withFileTypes:true})) { const file=path.join(dir,item.name); if(item.isDirectory()) walk(file); else files.push(path.relative(root,file)); } }
walk(path.join(root,'dist')); walk(path.join(root,'dist-electron'));
let matched=0;
for(const file of files) {
 if(file.replaceAll('\\','/').startsWith('dist/wallpapers/')) continue;
 if(hash(fs.readFileSync(path.join(root,file)))!==hash(asar.extractFile(archive,file))) throw Error('Package differs from build: '+file);
 matched++;
}
const pkg=JSON.parse(asar.extractFile(archive,'package.json'));
if(pkg.name!=='zenvue'||pkg.productName!=='Zenvue'||pkg.version!=='1.4.0-zenvue.1') throw Error('Wrong packaged identity');
const helpers=[
 ['electron/native/bin/win32-x64/wgc-capture.exe','electron/native/bin/win32-x64/wgc-capture.exe'],
 ['electron/native/bin/win32-x64/cursor-monitor.exe','electron/native/bin/win32-x64/cursor-monitor.exe'],
 ['node_modules/ffmpeg-static/ffmpeg.exe','node_modules/ffmpeg-static/ffmpeg.exe'],
 ['node_modules/ffprobe-static/bin/win32/x64/ffprobe.exe','node_modules/ffprobe-static/bin/win32/x64/ffprobe.exe'],
 ['node_modules/uiohook-napi/build/Release/uiohook_napi.node','node_modules/uiohook-napi/build/Release/uiohook_napi.node'],
];
for(const [packaged,source] of helpers) {
 const file=path.join(output,'resources/app.asar.unpacked',packaged);
 if(hash(fs.readFileSync(file))!==hash(fs.readFileSync(path.join(root,source)))) throw Error('Native helper differs: '+packaged);
}
const executable=path.join(output,'Zenvue.exe');
const exe=ResEdit.NtExecutable.from(fs.readFileSync(executable),{ignoreCert:true});
const resources=ResEdit.NtExecutableResource.from(exe);
const icons=ResEdit.Resource.IconGroupEntry.fromEntries(resources.entries);
if(!icons.length) throw Error('Missing executable icon');
const primaryIcon=icons[0].getIconItemsFromEntries(resources.entries);
const iconData=item=>item.isRaw()?item.bin:item.generate();
const actualIcons=new Set(primaryIcon.map(icon=>hash(iconData(icon))));
const expected=ResEdit.Data.IconFile.from(fs.readFileSync(path.join(root,'icons/icons/win/icon.ico')));
for(const icon of expected.icons) if(!actualIcons.has(hash(iconData(icon.data)))) throw Error('Executable does not contain the approved Zenvue icon');
const versions=ResEdit.Resource.VersionInfo.fromEntries(resources.entries);
const values=versions.flatMap(v=>v.getAllLanguagesForStringValues().map(lang=>v.getStringValues(lang)));
if(!values.some(v=>v.ProductName==='Zenvue')) throw Error('Executable ProductName is not Zenvue');
const result={name:pkg.productName,version:pkg.version,matchingCompiledFiles:matched,matchingNativeHelpers:helpers.length,embeddedIconSizes:expected.icons.length,executableProductName:'Zenvue',exeSha256:hash(fs.readFileSync(executable)),appAsarSha256:hash(fs.readFileSync(archive)),uiRecordingAcceptance:'not run'};
fs.writeFileSync(path.join(root,'branding/package-verification.json'),JSON.stringify(result,null,2));
process.stdout.write(JSON.stringify(result,null,2)+'\n');
