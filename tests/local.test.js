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

test('search indexes static text, literal terms, safe snippets and existing library after restart',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'pagenest-search-'));let app,origin;
 const start=async()=>{app=createApp({dataDir:dir});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));origin=`http://127.0.0.1:${app.server.address().port}`};
 const api=async(path,method='GET',body)=>{const r=await fetch(origin+path,{method,headers:{...(method==='GET'?{}:{Origin:origin}),...(body instanceof FormData?{}:body?{'Content-Type':'application/json'}:{})},body:body instanceof FormData?body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()}};
 const search=async(q,trash=0)=>{const r=await api('/api/search?q='+encodeURIComponent(q)+'&trash='+trash);assert.equal(r.status,200);return r.data.results};
 const html=Buffer.from('<!doctype html><head><title>记忆实践</title><script>秘密脚本</script><style>.a{content:"秘密样式"}</style></head><body><h1>正文</h1><p>向量数据<span>库</span>检索</p><p>Agent MEMORY &amp; Evidence；100% reliable_id；&lt;img onerror=alert(1)&gt;</p><p hidden>隐藏属性</p><p aria-hidden="true">隐藏辅助</p><p style="display:none !important">隐藏样式</p><p style="visibility: hidden">不可见片段</p><template>模板秘密</template><noscript>无脚本秘密</noscript><div>甲</div><div>乙</div></body>');
 const form=(bytes,id)=>{const f=new FormData();f.set('html',new Blob([bytes]),'fiction.html');f.set('requestId',id);return f};
 try{
  await start();const imported=await api('/api/import','POST',form(html,'search-request-001'));assert.equal(imported.status,201);const m=imported.data.material;
  assert.equal((await search('数据库'))[0].id,m.id);
  assert.equal((await search('memory'))[0].id,m.id);assert.equal((await search('记忆实践'))[0].id,m.id);
  for(const q of ['秘密脚本','秘密样式','隐藏属性','隐藏辅助','隐藏样式','不可见片段','模板秘密','无脚本秘密','甲乙','NOTHING'])assert.deepEqual(await search(q),[],q);
  assert.equal((await search('甲 乙'))[0].id,m.id);assert.equal((await search('& Evidence'))[0].id,m.id);
  assert.equal((await search('%'))[0].id,m.id);assert.equal((await search('_'))[0].id,m.id);assert.deepEqual(await search('%_'),[]);assert.deepEqual(await search("' OR 1=1 --"),[]);
  const snippet=(await search('onerror'))[0].snippet;assert.ok(snippet.includes('<img onerror=alert(1)>'));assert.ok(snippet.length<=182,'only bounded plain text, escaped by client');
  assert.deepEqual(Object.keys((await search('数据库'))[0]).sort(),['id','snippet']);
  assert.deepEqual(await search('   '),[]);assert.equal((await api('/api/search?q='+encodeURIComponent('字'.repeat(121)))).status,400);assert.equal((await api('/api/search?q=a&trash=2')).status,400);
  await api('/api/materials/'+m.id,'PATCH',{title:'立即更新标题'});assert.equal((await search('立即更新标题'))[0].id,m.id);assert.deepEqual(await search('记忆实践'),[]);
  await api('/api/materials/'+m.id,'PATCH',{deleted:true});assert.deepEqual(await search('数据库'),[]);assert.equal((await search('数据库',1))[0].id,m.id);
  await api('/api/materials/'+m.id,'PATCH',{deleted:false});assert.equal((await search('数据库'))[0].id,m.id);assert.deepEqual(await search('数据库',1),[]);
  const visual=await api('/api/import','POST',form(Buffer.from('<title>图示</title><svg></svg>'),'search-request-002'));assert.equal(visual.status,201);assert.equal((await search('图示'))[0].snippet,'');
  const hidden=await api('/api/import','POST',form(Buffer.from('<title>旧库隐含内容</title><p hidden>旧版已接受内容</p>'),'search-request-003'));assert.equal(hidden.status,201,'retain accepted V1 import rules while excluding hidden text from search');assert.deepEqual(await search('旧版已接受内容'),[]);assert.equal((await search('旧库隐含内容'))[0].snippet,'');
  const before=app.store.library();app.store.db.exec('DROP TABLE material_text');await app.close();app=null;await start();
  assert.deepEqual(app.store.library(),before,'backfill preserves existing business state');assert.deepEqual(app.store.raw(m.htmlFileId),html);
  assert.equal((await search('数据库'))[0].id,m.id);assert.equal(app.store.db.prepare('SELECT count(*) n FROM material_text').get().n,3);
  await app.close();app=null;await start();assert.equal(app.store.db.prepare('SELECT count(*) n FROM material_text').get().n,3);assert.equal((await search('数据库'))[0].id,m.id);
 }finally{if(app)await app.close();rmSync(dir,{recursive:true,force:true})}
});

test('search ignores obsolete responses after typing, clearing, category changes and leaving',async()=>{
 const calls=[],renders=[];
 const client=vm.runInNewContext(`let query='',folder='all',screen='library',searchTimer,searchRequest=0,searchState={results:[],loading:false,error:''};${clientPart('function invalidateSearch','function renderList')}\n({scheduleSearch,invalidateSearch,setContext:(q,f='all',s='library')=>{query=q;folder=f;screen=s},state:()=>searchState})`,{
  api:path=>{const r={path,...deferred()};calls.push(r);return r.promise},
  setTimeout:fn=>{fn();return 1},clearTimeout:()=>{},renderList:()=>renders.push(client.state())
 });
 client.setContext('旧');client.scheduleSearch();client.setContext('新');client.scheduleSearch();
 calls[1].resolve({results:[{id:'new',snippet:'新结果'}]});await new Promise(r=>setImmediate(r));
 calls[0].resolve({results:[{id:'old',snippet:'旧结果'}]});await new Promise(r=>setImmediate(r));assert.equal(client.state().results[0].id,'new');
 client.setContext('失败');client.scheduleSearch();calls[2].reject(Error('暂不可用'));await new Promise(r=>setImmediate(r));assert.match(client.state().error,/暂不可用/);assert.equal(client.state().loading,false);
 client.setContext('待清空');client.scheduleSearch();client.setContext('');client.scheduleSearch();calls[3].resolve({results:[{id:'old'}]});await new Promise(r=>setImmediate(r));assert.equal(client.state().results.length,0);
 client.setContext('跨分类');client.scheduleSearch();client.setContext('','trash');client.invalidateSearch();calls[4].resolve({results:[{id:'old'}]});await new Promise(r=>setImmediate(r));assert.equal(client.state().results.length,0);
 client.setContext('离开');client.scheduleSearch();client.setContext('离开','all','reader');client.invalidateSearch();calls[5].reject(Error('迟到错误'));await new Promise(r=>setImmediate(r));assert.equal(client.state().error,'');
});
