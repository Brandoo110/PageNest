import test from 'node:test';
import http from 'node:http';
import assert from 'node:assert/strict';
import {mkdtempSync,readdirSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import vm from 'node:vm';
import {createApp} from '../src/server.js';

test('real import, byte preservation, deduplication, folders, reading and restart',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'pagenest-focused-'));
 let app,origin;
 const start=async()=>{app=createApp({dataDir:dir});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));origin=`http://127.0.0.1:${app.server.address().port}`;};
 const api=async(path,method='GET',body)=>{const res=await fetch(origin+path,{method,headers:{...(method==='GET'?{}:{Origin:origin}),...(body instanceof FormData?{}:body?{'Content-Type':'application/json'}:{})},body:body instanceof FormData?body:body?JSON.stringify(body):undefined});return {status:res.status,data:await res.json()};};
 const html=Buffer.from('<!doctype html><title>测试笔记</title><h1>虚构资料</h1><p>本地真实输入。</p>');
 const txt=Buffer.from('<script>alert("plain text")</script>\n原文测试');
 const form=(id='request-test-0001',bytes=html,source=txt)=>{const f=new FormData();f.set('requestId',id);f.set('html',new Blob([bytes]),'note.html');if(source)f.set('source',new Blob([source]),'source.txt');f.set('folderId',folderId);return f;};
 let folderId;
 try {
  await start();
  assert.equal((await api('/api/library')).data.materials.length,0);
  folderId=(await api('/api/folders','POST',{name:'阅读笔记'})).data.id;
  const imported=await api('/api/import','POST',form());assert.equal(imported.status,201);
  const material=imported.data.material;assert.equal(material.title,'测试笔记');
  const file=await fetch(origin+`/api/files/${material.htmlFileId}/download`);assert.deepEqual(Buffer.from(await file.arrayBuffer()),html);
  const source=await fetch(origin+`/api/files/${material.sourceFileId}/download`);assert.deepEqual(Buffer.from(await source.arrayBuffer()),txt);
  assert.equal((await api('/api/import','POST',form())).data.material.id,material.id);
  const duplicate=await api('/api/import','POST',form('request-test-0002'));assert.equal(duplicate.status,409);assert.equal(duplicate.data.materialId,material.id);
  assert.equal((await api(`/api/materials/${material.id}/reading/html`,'PUT',{scrollTop:380,page:1})).status,200);
  assert.equal((await api(`/api/materials/${material.id}/reading/source`,'PUT',{scrollTop:140,page:1})).status,200);
  assert.equal((await api(`/api/materials/${material.id}/reading/html`,'PUT',{scrollTop:-1})).status,400);
  assert.equal((await api('/api/folders','POST',{name:' 阅读笔记 '})).status,409);
  await api('/api/folders/'+folderId,'DELETE');
  assert.equal((await api('/api/library')).data.materials[0].folderId,null);
  await api(`/api/materials/${material.id}`,'PATCH',{deleted:true});
  await api(`/api/materials/${material.id}`,'PATCH',{deleted:false});
  await app.close();await start();
  const library=(await api('/api/library')).data;
  assert.equal(library.materials.length,1);assert.equal(library.materials[0].deletedAt,null);
  assert.equal((await api(`/api/materials/${material.id}/reading`)).data.html.scrollTop,380);
  assert.equal((await api(`/api/materials/${material.id}/reading`)).data.source.scrollTop,140);
  assert.deepEqual(Buffer.from(await (await fetch(origin+`/api/files/${material.htmlFileId}/download`)).arrayBuffer()),html);
  const badHost=await new Promise((resolve,reject)=>{const req=http.request(origin+'/api/library',{headers:{Host:'evil.example'}},res=>{res.resume();resolve(res.statusCode)});req.on('error',reject);req.end()});assert.equal(badHost,403);
  assert.equal((await fetch(origin+'/api/folders',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:'{"name":"evil"}'})).status,403);
  assert.equal((await fetch(origin+'/api/folders',{method:'POST',headers:{Origin:'null','Content-Type':'application/json'},body:'{"name":"evil"}'})).status,403);
  assert.equal((await fetch(origin+'/api/folders',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"name":"evil"}'})).status,403);
  assert.equal((await fetch(origin+'/api/files/not-a-uuid/download')).status,404);
  assert.equal((await fetch(origin+'/api/files/..%2f..%2fetc%2fpasswd/download')).status,404);
  const display=await fetch(origin+`/api/files/${material.htmlFileId}/display`);
  assert.match(display.headers.get('content-security-policy'),/sandbox allow-scripts/);
  assert.doesNotMatch(display.headers.get('content-security-policy'),/allow-same-origin/);
  assert.match(display.headers.get('content-security-policy'),/connect-src 'none'/);
  const sourcePreview=await fetch(origin+`/api/files/${material.sourceFileId}/display`);
  assert.match(await sourcePreview.text(),/&lt;script&gt;/);
  const shell=await fetch(origin+'/');assert.match(shell.headers.get('content-security-policy'),/frame-src 'self'/);
  const external=Buffer.from('<title>依赖示例</title><h1>正文</h1><img src="https://example.com/a.png">');
  const warning=await api('/api/import','POST',form('request-external-1',external,null));assert.equal(warning.status,422);assert.equal(warning.data.code,'external_resources');
  app.store.db.exec("CREATE TRIGGER reject_source BEFORE INSERT ON files WHEN new.mime='text/plain' BEGIN SELECT RAISE(ABORT,'forced source failure'); END;");
  const failureForm=form('request-failure-1',Buffer.from('<h1>附件提交失败反例</h1>'));failureForm.set('folderId','');
  assert.equal((await api('/api/import','POST',failureForm)).status,500);
  assert.equal((await api('/api/library')).data.materials.length,1);
  assert.equal(readdirSync(join(dir,'files')).length,2);
  assert.deepEqual(Buffer.from(await (await fetch(origin+`/api/files/${material.htmlFileId}/download`)).arrayBuffer()),html);
  app.store.db.exec('DROP TRIGGER reject_source');
  const empty=Buffer.from('<title>无正文</title><script>document.write("hidden")</script><style>body{color:red}</style>');
  assert.equal((await api('/api/import','POST',form('request-empty-1',empty,null))).status,400);
 }finally{if(app)await app.close();rmSync(dir,{recursive:true,force:true});}
});

// Execute the shipped client functions with controlled network ordering, no DOM framework.
const clientSource=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const clientPart=(start,end)=>clientSource.slice(clientSource.indexOf(start),clientSource.indexOf(end,clientSource.indexOf(start)));
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject}};
function selectionClient(){
 const requests=[],errors=[],renders=[],save={disabled:false};
 const client=vm.runInNewContext(`let draft=null;${clientPart('async function selectHTML','async function saveImport')}\n({selectHTML,selectSource,setDraft:value=>draft=value,getDraft:()=>draft})`,{
  inspectFile:file=>{const request={file,...deferred()};requests.push(request);return request.promise},
  importError:message=>errors.push(message),$:()=>save,
  renderImport:()=>{const d=client.getDraft();renders.push({html:d.html,source:d.source});save.disabled=!d.html||d.loading}
 });
 return {client,requests,errors,renders,save};
}
const importDraft=()=>({title:'',html:null,source:null,warnings:[],accepted:false,previewUrl:'',loading:false});

test('async selection ignores outdated HTML/source checks and renders current failure',async()=>{
 for(const select of ['selectHTML','selectSource']){
  const {client,requests,errors,save}=selectionClient(),draft=importDraft();client.setDraft(draft);
  const a={name:'a.html',size:10},b={name:'b.html',size:10};
  const old=client[select]([a]),latest=client[select]([b]);
  requests[0].reject(new Error('old check failed'));await old;
  requests[1].resolve({title:'B',warnings:[],previewUrl:'/preview-b'});await latest;
  assert.equal(draft[select==='selectHTML'?'html':'source'],b);
  assert.equal(errors.length,0);
  if(select==='selectHTML')assert.equal(save.disabled,false);
  else assert.equal(draft.sourceOpen,true,'selected source remains expanded after asynchronous rerender');
 }
 {
  const {client,requests,errors}=selectionClient(),draft=importDraft();client.setDraft(draft);
  const file={name:'same.html',size:10};
  const old=client.selectHTML([file]),latest=client.selectHTML([file]);
  requests[1].resolve({title:'latest',warnings:[],previewUrl:'/latest'});await latest;
  requests[0].resolve({title:'stale',warnings:['old'],previewUrl:'/old'});await old;
  assert.equal(draft.title,'latest');assert.equal(draft.previewUrl,'/latest');assert.equal(errors.length,0);
 }
 for(const select of ['selectHTML','selectSource']){
  const {client,requests,errors,renders}=selectionClient(),draft=importDraft();client.setDraft(draft);
  const pending=client[select]([{name:'bad.html',size:10}]);requests[0].reject(new Error('current check failed'));await pending;
  const key=select==='selectHTML'?'html':'source';assert.equal(draft[key],null);assert.equal(renders.at(-1)[key],null);assert.equal(errors.at(-1),'current check failed');
 }
 {
  const {client,requests,errors,renders}=selectionClient();client.setDraft(importDraft());
  const pending=client.selectSource([{name:'leaving.html',size:10}]);client.setDraft(null);
  requests[0].reject(new Error('late after leaving'));await pending;
  assert.equal(errors.length,0);assert.equal(renders.length,0);
 }
});

function readingClient(){
 const calls=[],handlers={};
 const client=vm.runInNewContext(`let readingTimer,flushPromise;const dirtyReading=new Map();${clientPart('async function api','async function refresh')}${clientPart('function queueReading','async function openReader')}${clientSource.split('\n').find(line=>line.startsWith("window.addEventListener('pagehide'"))}\n({queueReading,flushReading,pending:()=>[...dirtyReading.values()]})`,{
  FormData,setTimeout:()=>1,clearTimeout:()=>{},toast:()=>{},
  window:{addEventListener:(type,handler)=>handlers[type]=handler},
  fetch:(path,options)=>{const request={path,options,...deferred()};calls.push(request);return request.promise}
 });
 return {client,calls,pagehide:()=>handlers.pagehide()};
}
const ack=()=>({ok:true,json:async()=>({})});

test('reading delivery retains in-flight/latest until matching ACK and supplements pagehide',async()=>{
 {
  const {client,calls,pagehide}=readingClient();client.queueReading('material','html',{scrollTop:100,page:1});
  const flushing=client.flushReading();const rejected=assert.rejects(flushing,/连接中断/);
  assert.equal(calls[0].options.keepalive,true);
  assert.equal(client.pending().length,1);
  pagehide();assert.equal(calls.length,2);assert.equal(calls[1].options.keepalive,true);
  assert.equal(JSON.parse(calls[1].options.body).scrollTop,100);
  calls[1].resolve(ack());calls[0].reject(new Error('cancelled while leaving'));await rejected;
  assert.equal(client.pending()[0].scrollTop,100);assert.equal(calls.length,2,'no automatic failure loop');
 }
 {
  const {client,calls,pagehide}=readingClient();client.queueReading('material','html',{scrollTop:100,page:1});const flushing=client.flushReading();
  client.queueReading('material','html',{scrollTop:250,page:1});calls[0].resolve(ack());
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(client.pending()[0].scrollTop,250,'old ACK must not remove newer position');
  assert.equal(calls.length,2);assert.equal(JSON.parse(calls[1].options.body).scrollTop,250);
  pagehide();assert.equal(JSON.parse(calls[2].options.body).scrollTop,250);
  calls[2].resolve(ack());calls[1].resolve(ack());await flushing;assert.equal(client.pending().length,0);
 }
 {
  const {client,calls}=readingClient();client.queueReading('material','source',{scrollTop:30,page:2});const flushing=client.flushReading();const rejected=assert.rejects(flushing,/连接中断/);
  client.queueReading('material','source',{scrollTop:80,page:3});calls[0].reject(new Error('failed old PUT'));await rejected;
  assert.equal(client.pending()[0].scrollTop,80);assert.equal(client.pending()[0].page,3);assert.equal(calls.length,1);
 }
});

test('skip link focuses main without replacing the current reader route',()=>{
 const id='9d7c0807-cbb0-4bb2-86dd-d9d31175ce57',location={hash:'#read/'+id};
 let handler,focused=false,prevented=false;
 const main={focus:()=>{focused=true}};
 const link={};
 vm.runInNewContext(clientSource.split('\n').find(line=>line.startsWith("document.addEventListener('click'")),{
  document:{addEventListener:(name,callback)=>{handler=callback}},
  $:selector=>selector==='#main-content'?main:null,
  handleClick:()=>{throw Error('skip link must not dispatch a business action')}
 });
 handler({target:{closest:selector=>selector==='.skip-link'?link:null},preventDefault:()=>{prevented=true}});
 if(!prevented)location.hash='#main-content'; // Native anchor default after the click event.
 assert.equal(location.hash,'#read/'+id);
 assert.equal(focused,true);
 assert.equal(location.hash.match(/^#read\/([0-9a-f-]{36})$/)?.[1],id,'reload can still select the same reader');
});
