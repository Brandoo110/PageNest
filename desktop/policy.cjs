const {isAbsolute,join,resolve}=require('node:path');
function desktopPaths(userData,override){if(override&&!isAbsolute(override))throw Error('桌面资料目录须为绝对路径。');return override?{dataDir:resolve(override),profileDir:join(resolve(override),'.electron')}:{dataDir:join(userData,'library'),profileDir:userData}}
const parsed=value=>{try{return new URL(value)}catch{return null}};
const uuid='[0-9a-f-]{36}';
function navigation({url,origin,isMainFrame,fromMainFrame}){
 const u=parsed(url);if(!u||u.username||u.password||!fromMainFrame)return 'block';
 if(u.origin===origin&&u.protocol==='http:'){
  if(isMainFrame&&u.pathname==='/')return 'allow';
  if(!isMainFrame&&new RegExp(`^/api/(files/${uuid}/(display|raw)|previews/${uuid})$`).test(u.pathname))return 'allow';
 }
 return isMainFrame&&u.protocol==='https:'?'external':'block';
}
function networkAllowed(url,origin,type){const u=parsed(url);if(!u||u.username||u.password)return false;return (u.protocol==='http:'&&u.origin===origin)||(u.protocol==='blob:'&&u.origin===origin)||(u.protocol==='data:'&&['image','font'].includes(type))}
function downloadAllowed(url,origin){const u=parsed(url);if(!u||u.origin!==origin||u.username||u.password)return false;return u.protocol==='blob:'||(u.protocol==='http:'&&new RegExp(`^/api/(files/${uuid}/download|materials/${uuid}/markdown|backup/export)$`).test(u.pathname))}
function safeFilename(value){let s=String(value||'PageNest-download').replace(/[/\\\0\r\n]/g,'_').trim();const chars=Array.from(s);while(Buffer.byteLength(chars.join(''))>180)chars.pop();s=chars.join('');return s&&s!=='.'&&s!=='..'?s:'PageNest-download'}
module.exports={desktopPaths,navigation,networkAllowed,downloadAllowed,safeFilename};
