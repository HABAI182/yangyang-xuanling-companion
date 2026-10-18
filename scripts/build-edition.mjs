import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const version=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8')).version;
const edition=process.argv[2];
if(!['static','basic','full'].includes(edition))throw Error('Usage: node scripts/build-edition.mjs static|basic|full [--web-only] [--portable-only]');
const webOnly=process.argv.includes('--web-only');
const portableOnly=process.argv.includes('--portable-only');
const stage=path.join(root,'work','editions',edition),publicDir=path.join(stage,'public');
const dist=path.join(stage,'dist'),source=path.join(root,'public');
await fs.mkdir(publicDir,{recursive:true});
const copy=async rel=>{
 const from=path.resolve(source,rel),to=path.resolve(publicDir,rel);
 if(!from.startsWith(source+path.sep)||!to.startsWith(publicDir+path.sep))throw Error('Asset path escapes curated runtime');
 await fs.mkdir(path.dirname(to),{recursive:true});await fs.cp(from,to,{recursive:true});
};
await copy('assets/ui/xuanling-crest.svg');
if(edition==='static')await copy('assets/static');
else{
const config=JSON.parse(await fs.readFile(path.join(source,'assets/model-config.json'),'utf8'));
await copy('assets/model-config.json');
await copy(path.dirname(config.entry.replace(/^\//,'')));
await copy('vendor/live2d');
const details=JSON.parse(await fs.readFile(path.join(source,'assets/detail-v14/patches.json'),'utf8'));
if(edition==='basic')details.patches=details.patches.filter(p=>!p.moods||p.moods.includes('default'));
for(const patch of details.patches)await copy(patch.file.replace(/^\//,''));
await fs.mkdir(path.join(publicDir,'assets/detail-v14'),{recursive:true});
await fs.writeFile(path.join(publicDir,'assets/detail-v14/patches.json'),JSON.stringify(details,null,2));
}
await fs.writeFile(path.join(publicDir,'assets/edition.json'),JSON.stringify({edition,version,priceCny:edition==='full'?15:0,status:'local-release-candidate',publicSaleApproved:false},null,2));
const env={...process.env,VITE_APP_EDITION:edition,YANGYANG_PUBLIC_DIR:publicDir,YANGYANG_DIST_DIR:dist};
const run=(args)=>{
 const r=spawnSync(process.execPath,args,{cwd:root,env,stdio:'inherit'});
 if(r.status!==0)process.exit(r.status??1);
};
run(['node_modules/typescript/bin/tsc','--noEmit']);
run(['node_modules/vite/bin/vite.js','build']);
if(webOnly){console.log(JSON.stringify({edition,dist,webOnly:true}));process.exit(0);}
const label=edition==='static'?'静态版':edition==='basic'?'基础版':'完整版';
// A Windows drive path can deserialize as an external URL in Tauri's
// FrontendDist union, which skips embedding. A relative path selects Directory.
const embeddedDist=path.relative(path.join(root,'src-tauri'),dist).split(path.sep).join('/');
const override={productName:`秧秧玄翎${label}`,identifier:`local.habai182.yangyang-xuanling.${edition}`,
 build:{beforeBuildCommand:'',frontendDist:embeddedDist},bundle:{shortDescription:`秧秧玄翎${label} · 本地候选包`}};
const cfg=path.join(stage,'tauri-edition.json');await fs.writeFile(cfg,JSON.stringify(override,null,2));
const features=edition==='static'?'custom-protocol,edition-static':edition==='basic'?'custom-protocol,edition-basic':'custom-protocol';
const args=['node_modules/@tauri-apps/cli/tauri.js','build','--config',cfg,...(portableOnly?['--no-bundle']:['--bundles','nsis']),'--features',features];
run(args);
const target=process.env.CARGO_TARGET_DIR?path.resolve(process.env.CARGO_TARGET_DIR):path.join(root,'src-tauri/target');
const delivery=path.resolve(root,'../yangyang-bilibili-launch/packages',version,edition);
await fs.mkdir(delivery,{recursive:true});
const executable=path.join(delivery,`秧秧玄翎${label}.exe`),binary=await fs.readFile(path.join(target,'release/yangyang-xuanling-companion.exe'));
try{if(!(await fs.readFile(executable)).equals(binary))throw Error('Historical executable differs; use a new version instead of overwriting it');}
catch(e){if(e.code!=='ENOENT')throw e;await fs.writeFile(executable,binary);}
const nsis=path.join(target,'release/bundle/nsis');
if(!portableOnly)for(const name of await fs.readdir(nsis))if(name.startsWith(`秧秧玄翎${label}_${version}_`)&&name.endsWith('.exe'))await fs.copyFile(path.join(nsis,name),path.join(delivery,`YangyangXuanling-${version}-${edition}-win-x64-setup-candidate.exe`));
for(const file of ['LICENSE.txt','LICENSE-CHANG-LI-MIT.txt','THIRD-PARTY-NOTICES.md'])await fs.copyFile(path.join(root,file),path.join(delivery,file));
for(const file of ['CORE-LICENSE.md','CORE-REDISTRIBUTABLE-FILES.txt','FRAMEWORK-LICENSE.md'])await fs.copyFile(path.join(source,'vendor/live2d',file),path.join(delivery,file));
await fs.writeFile(path.join(delivery,'edition.json'),JSON.stringify({edition,version,priceCny:edition==='full'?15:0,status:'local-candidate',publicSaleApproved:false},null,2));
console.log(JSON.stringify({edition,stage,dist,native:true}));
