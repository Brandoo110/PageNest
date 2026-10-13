import http from 'node:http';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Store} from './store.js';
import {multipart,validateFile,fail} from './upload.js';
import {inspectHTML,HTML_CSP} from './html.js';
import {readBackup} from './backup.js';
const publicDir=new URL('../public/',import.meta.url);
const SHELL_CSP="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'";
const uuid='[0-9a-f-]{36}';
function send(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data))}
async function json(req){let size=0;const chunks=[];for await(const c of req){size+=c.length;if(size>16384)throw fail(413,'表单数据过大。');chunks.push(c)}try{const value=JSON.parse(Buffer.concat(chunks).toString());if(!value||Array.isArray(value)||typeof value!=='object')throw Error();return value}catch{throw fail(400,'表单格式无效。')}}
export function createApp({dataDir=resolve('.data')}={}){
 const store=new Store(dataDir),previews=new Map();let closed=false;
 const server=http.createServer(async(req,res)=>{try{
  const address=server.address(),host=`127.0.0.1:${address.port}`,origin='http://'+host;
  if(req.headers.host!==host)throw fail(403,'只允许当前本机地址访问。');
  if(req.headers.origin&&req.headers.origin!==origin)throw fail(403,'不允许跨站访问。');
  if(!['GET','HEAD'].includes(req.method)&&req.headers.origin!==origin)throw fail(403,'写入必须来自当前 PageNest 页面。');
  if(req.headers['sec-fetch-site']==='cross-site')throw fail(403,'不允许跨站访问。');
  const url=new URL(req.url,origin),path=url.pathname;let match;
  if(req.method==='GET'&&path==='/api/health')return send(res,200,{ok:true,localOnly:true});
  if(req.method==='GET'&&path==='/api/backup/export'){const buffer=store.exportBackup();res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename="PageNest-${new Date().toISOString().slice(0,10)}.pagenest"`,'Content-Length':buffer.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});return res.end(buffer)}
  if(req.method==='POST'&&path==='/api/backup/restore')return send(res,200,store.restoreBackup(await readBackup(req)));
  if(req.method==='GET'&&path==='/api/library')return send(res,200,store.library());
  if(req.method==='GET'&&path==='/api/search'){const trash=url.searchParams.get('trash')??'0';if(!['0','1'].includes(trash))throw fail(400,'搜索范围无效。');return send(res,200,store.search(url.searchParams.get('q'),trash==='1'))}
  if(path==='/api/folders'&&req.method==='POST')return send(res,201,store.createFolder((await json(req)).name));
  if((match=path.match(new RegExp(`^/api/folders/(${uuid})$`)))){if(req.method==='PATCH')return send(res,200,store.renameFolder(match[1],(await json(req)).name));if(req.method==='DELETE')return send(res,200,store.deleteFolder(match[1]));}
  if(path==='/api/import'&&req.method==='POST'){const result=store.import(await multipart(req));return send(res,result.replayed?200:201,result)}
  if(path==='/api/inspect'&&req.method==='POST'){const data=await multipart(req);const file=data.files.html||data.files.source;validateFile(file,true);const inspected=inspectHTML(file.buffer);for(const [id,p] of previews)if(p.expires<Date.now())previews.delete(id);while(previews.size>=3)previews.delete(previews.keys().next().value);const id=randomUUID();previews.set(id,{display:inspected.display,expires:Date.now()+600000});return send(res,200,{title:inspected.title,warnings:inspected.warnings,previewUrl:'/api/previews/'+id})}
  if((match=path.match(new RegExp(`^/api/previews/(${uuid})$`)))&&req.method==='GET'){const p=previews.get(match[1]);if(!p||p.expires<Date.now())throw fail(404,'受限预览已过期，请重新选择文件。');res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':HTML_CSP,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});return res.end(p.display)}
  if((match=path.match(new RegExp(`^/api/materials/(${uuid})$`)))){if(req.method==='GET')return send(res,200,store.get(match[1]));if(req.method==='PATCH')return send(res,200,store.edit(match[1],await json(req)));}
  if((match=path.match(new RegExp(`^/api/materials/(${uuid})/open$`)))&&req.method==='POST')return send(res,200,store.open(match[1]));
  if((match=path.match(new RegExp(`^/api/materials/(${uuid})/source$`)))&&req.method==='POST')return send(res,200,store.source(match[1],await multipart(req)));
  if((match=path.match(new RegExp(`^/api/materials/(${uuid})/reading$`)))&&req.method==='GET')return send(res,200,store.reading(match[1]));
  if((match=path.match(new RegExp(`^/api/materials/(${uuid})/reading/(html|source)$`)))&&req.method==='PUT')return send(res,200,store.updateReading(match[1],match[2],await json(req)));
  if((match=path.match(new RegExp(`^/api/files/(${uuid})/(download|display|raw)$`)))&&req.method==='GET'){
   const file=store.file(match[1]),mode=match[2];if(mode==='display'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':HTML_CSP,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});return res.end(store.display(file.id))}
   if(mode==='raw'&&file.mime!=='application/pdf')throw fail(400,'此原始文件仅提供下载。');
   const disposition=mode==='download'?'attachment':'inline';res.writeHead(200,{'Content-Type':file.mime,'Content-Length':file.size,'Content-Disposition':`${disposition}; filename="file.${file.mime==='text/html'?'html':file.mime==='text/plain'?'txt':'pdf'}"; filename*=UTF-8''${encodeURIComponent(file.name).replace(/'/g,'%27')}`,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; sandbox"});return res.end(store.raw(file.id));
  }
  if(req.method==='GET'&&['/','/app.js','/style.css'].includes(path)){res.writeHead(200,{'Content-Type':path.endsWith('.js')?'text/javascript; charset=utf-8':path.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8','Content-Security-Policy':SHELL_CSP,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store','Referrer-Policy':'no-referrer'});return res.end(readFileSync(new URL(path==='/'?'index.html':path.slice(1),publicDir)))}
  throw fail(404,'没有找到这个页面或文件。');
 }catch(error){if(!res.headersSent)send(res,error.status||500,{error:error.status?error.message:req.method==='GET'?'暂时无法完成请求，请重试。':'未保存成功，请保留表单后重试。',...(error.code?{code:error.code}:{}),...(error.materialId?{materialId:error.materialId}:{}),...(error.warnings?{warnings:error.warnings}:{})});else res.end()}});
 server.requestTimeout=120000;
 return {server,store,close:async()=>{if(closed)return;closed=true;await new Promise(r=>server.close(r));store.close()}};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const port=Number(process.env.PAGENEST_PORT||4173);if(!Number.isInteger(port)||port<1||port>65535)throw Error('PAGENEST_PORT 无效。');
 const app=createApp({dataDir:resolve(process.env.PAGENEST_DATA_DIR||'.data')});app.server.on('error',error=>{console.error(error.code==='EADDRINUSE'?`本机端口 ${port} 已占用，请明确设置 PAGENEST_PORT。`:error.message);app.store.close();process.exitCode=1});app.server.listen(port,'127.0.0.1',()=>console.log(`PageNest: http://127.0.0.1:${port} （本机单用户）`));
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>app.close().then(()=>process.exit(0)));
}
