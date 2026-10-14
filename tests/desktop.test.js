import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import http from 'node:http';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {createApp} from '../src/server.js';
const {desktopPaths,navigation,networkAllowed,downloadAllowed,safeFilename}=createRequire(import.meta.url)('../desktop/policy.cjs');
const origin='http://127.0.0.1:43123',id='01234567-1234-1234-1234-123456789012';
test('desktop keeps default and override profile/library separate without relative paths',()=>{
 assert.deepEqual(desktopPaths('/Application Support/PageNest'),{dataDir:'/Application Support/PageNest/library',profileDir:'/Application Support/PageNest'});
 assert.deepEqual(desktopPaths('/Application Support/PageNest','/temporary/fake'),{dataDir:'/temporary/fake',profileDir:'/temporary/fake/.electron'});
 assert.throws(()=>desktopPaths('/Application Support/PageNest','relative'),/绝对路径/);
});
test('desktop only opens HTTPS from the initiating main frame and constrains network/downloads',()=>{
 const nav=(url,isMainFrame=true,fromMainFrame=true)=>navigation({url,origin,isMainFrame,fromMainFrame});
 assert.equal(nav(origin+'/#library'),'allow');assert.equal(nav('https://example.com/source'),'external');assert.equal(nav('https://example.com/source',true,false),'block');assert.equal(nav('https://example.com/source',false,false),'block');
 for(const url of ['file:///private/secret','javascript:alert(1)','mailto:a@example.com','https://user:secret@example.com','http://127.0.0.1:43124/','http://127.0.0.1:43123.attacker.com/','data:text/html,test'])assert.equal(nav(url),'block');
 assert.equal(nav(origin+`/api/files/${id}/display`,false,true),'allow');assert.equal(nav(origin+`/api/files/${id}/display`,false,false),'block');
 assert.equal(networkAllowed(origin+'/api/library',origin,'xhr'),true);assert.equal(networkAllowed('https://example.com/',origin,'xhr'),false);assert.equal(networkAllowed('file:///private/secret',origin,'image'),false);assert.equal(networkAllowed('data:image/png;base64,AA==',origin,'image'),true);assert.equal(networkAllowed('data:text/html,x',origin,'mainFrame'),false);assert.equal(networkAllowed('blob:null/a',origin,'other'),false);
 for(const url of [origin+`/api/materials/${id}/markdown`,origin+`/api/files/${id}/download`,origin+'/api/backup/export','blob:'+origin+'/abc'])assert.equal(downloadAllowed(url,origin),true);
 for(const url of ['https://example.com/',origin+'/api/library','blob:null/a','file:///secret'])assert.equal(downloadAllowed(url,origin),false);
 assert.equal(safeFilename('../secret\r\n.md'),'.._secret__.md');
});
test('desktop shutdown bounds an unfinished request and closes SQLite exactly once',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'pagenest-desktop-close-'));let app,req,closing;
 try{
  app=createApp({dataDir:dir});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const host='http://127.0.0.1:'+app.server.address().port;
  const received=new Promise(r=>app.server.once('request',r));req=http.request(host+'/api/folders',{method:'POST',headers:{Origin:host,'Content-Type':'application/json'}});req.on('error',()=>{});req.write('{"name":"');await received;
  closing=app.close({timeoutMs:80});const result=await Promise.race([closing.then(()=>true),new Promise(r=>setTimeout(()=>r(false),500))]);assert.equal(result,true,'an unfinished upload must not keep the desktop process alive');await app.close();assert.throws(()=>app.store.library(),/not open|closed/i);
 }finally{req?.destroy();if(closing)await closing;else if(app)await app.close();rmSync(dir,{recursive:true,force:true})}
});

test('desktop renderer protects pending imports and unsaved notes without adding privileges',async()=>{
 const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8'),code=source.slice(source.indexOf("if(navigator.userAgent.includes('PageNestDesktop/1'))"));const handlers={};let complete;
 const win={fetch:()=>new Promise(r=>complete=r),addEventListener:(name,fn)=>handlers[name]=fn};
 const client=vm.runInNewContext('let notesEditor=null,draft=null,batchDraft=null;const dirtyReading=new Map();'+code+';({setNotes:value=>notesEditor=value})',{navigator:{userAgent:'PageNestDesktop/1'},window:win,document:{addEventListener:()=>{}},URL});
 const blocked=()=>{let value=false;handlers.beforeunload({preventDefault:()=>value=true});return value};
 assert.equal(blocked(),false);const pending=win.fetch('/api/import',{method:'POST'});assert.equal(blocked(),true);complete({ok:true});await pending;assert.equal(blocked(),false);
 client.setNotes({saved:'已保存',draft:'草稿',busy:false});assert.equal(blocked(),true);client.setNotes({saved:'已保存',draft:'已保存',busy:false});assert.equal(blocked(),false);
});
