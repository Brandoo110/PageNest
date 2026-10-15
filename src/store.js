import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,writeFileSync,renameSync,unlinkSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {fail,validateFile,HTML_LIMIT} from './upload.js';
import {inspectHTML,textDisplay,decodeHTML,normalizeEditedHTML} from './html.js';
import {encodeBackup,decodeBackup,BACKUP_LIMIT,RECORD_LIMIT} from './backup.js';
const now=()=>new Date().toISOString();
const SYSTEM=['全部资料','最近阅读','未分类','回收站'];
function title(value){const result=String(value??'').trim();if(!result||result.length>120)throw fail(400,'标题须为 1–120 字。');return result}
export function sourceURL(value){const s=String(value??'').trim();if(!s)return '';try{const u=new URL(s);if(u.protocol==='https:'&&u.hostname&&s.length<=4096)return s}catch{}throw fail(400,'来源链接须为完整的 HTTPS 地址。')}
const markdownText=value=>String(value).replace(/[\\`*_{}\[\]()#+.!<>&|~-]/g,'\\$&');
const markdownLine=value=>markdownText(String(value).replace(/\s+/g,' ').trim());
const stateLabels={unread:'未读',reading:'在读',read:'已读'};
const validStatus=value=>{if(typeof value!=='string'||!Object.hasOwn(stateLabels,value))throw fail(400,'阅读状态须为未读、在读或已读。');return value};
const validNotes=value=>{if(typeof value!=='string'||value.length>8000)throw fail(400,'备注须为不超过 8000 字的纯文本。');return value};
export class Store{
 constructor(dir){this.dir=dir;mkdirSync(join(dir,'files'),{recursive:true});mkdirSync(join(dir,'display'),{recursive:true});this.db=new DatabaseSync(join(dir,'library.sqlite'));this.db.exec(`PRAGMA foreign_keys=ON;PRAGMA journal_mode=WAL;
 CREATE TABLE IF NOT EXISTS folders(id TEXT PRIMARY KEY,name TEXT UNIQUE NOT NULL);
 CREATE TABLE IF NOT EXISTS files(id TEXT PRIMARY KEY,name TEXT NOT NULL,mime TEXT NOT NULL,size INTEGER NOT NULL,sha256 TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS materials(id TEXT PRIMARY KEY,title TEXT NOT NULL,folderId TEXT REFERENCES folders(id) ON DELETE SET NULL,htmlFileId TEXT REFERENCES files(id),sourceFileId TEXT REFERENCES files(id),sourceUrl TEXT NOT NULL DEFAULT '',htmlHash TEXT UNIQUE NOT NULL,deletedAt TEXT,createdAt TEXT NOT NULL,lastReadAt TEXT);
 CREATE TABLE IF NOT EXISTS requests(scope TEXT NOT NULL,id TEXT NOT NULL,materialId TEXT NOT NULL REFERENCES materials(id),PRIMARY KEY(scope,id));
 CREATE TABLE IF NOT EXISTS reading(materialId TEXT NOT NULL REFERENCES materials(id),view TEXT CHECK(view IN ('html','source')),scrollTop REAL NOT NULL DEFAULT 0,page INTEGER NOT NULL DEFAULT 1,updatedAt TEXT NOT NULL,PRIMARY KEY(materialId,view));
 CREATE TABLE IF NOT EXISTS material_text(materialId TEXT PRIMARY KEY REFERENCES materials(id) ON DELETE CASCADE,body TEXT NOT NULL);`);
  const columns=new Set(this.db.prepare('PRAGMA table_info(materials)').all().map(c=>c.name));
  if(!columns.has('readingStatus')||!columns.has('notes'))this.transaction(()=>{
   if(!columns.has('readingStatus')){this.db.exec("ALTER TABLE materials ADD COLUMN readingStatus TEXT NOT NULL DEFAULT 'unread' CHECK(readingStatus IN ('unread','reading','read'))");this.db.exec("UPDATE materials SET readingStatus=CASE WHEN lastReadAt IS NULL THEN 'unread' ELSE 'reading' END")}
   if(!columns.has('notes'))this.db.exec("ALTER TABLE materials ADD COLUMN notes TEXT NOT NULL DEFAULT '' CHECK(length(notes)<=8000)");
  });
  if(!columns.has('originalHtmlFileId'))this.transaction(()=>this.db.exec('ALTER TABLE materials ADD COLUMN originalHtmlFileId TEXT REFERENCES files(id)'));
  const missing=this.db.prepare('SELECT m.id,m.htmlFileId FROM materials m LEFT JOIN material_text t ON t.materialId=m.id WHERE t.materialId IS NULL').all();
  if(missing.length)this.transaction(()=>{const insert=this.db.prepare('INSERT INTO material_text VALUES (?,?)');for(const m of missing)insert.run(m.id,inspectHTML(this.raw(m.htmlFileId)).text)});
 }
 get(id){const m=this.db.prepare('SELECT id,title,folderId,htmlFileId,originalHtmlFileId,sourceFileId,sourceUrl,deletedAt,createdAt,lastReadAt,readingStatus,notes FROM materials WHERE id=?').get(id);if(!m)throw fail(404,'没有找到这份资料。');return m}
 file(id){if(!/^[0-9a-f-]{36}$/.test(id))throw fail(404,'没有找到这个文件。');const f=this.db.prepare('SELECT * FROM files WHERE id=?').get(id);if(!f)throw fail(404,'没有找到这个文件。');return f}
 library(){return {folders:this.db.prepare('SELECT * FROM folders ORDER BY rowid').all(),materials:this.db.prepare('SELECT id,title,folderId,htmlFileId,originalHtmlFileId,sourceFileId,sourceUrl,deletedAt,createdAt,lastReadAt,readingStatus,notes FROM materials ORDER BY createdAt DESC,rowid DESC').all(),files:this.db.prepare('SELECT * FROM files').all()}}
 search(value,trash=false){
  const q=String(value??'').trim();if(q.length>120)throw fail(400,'搜索词最多 120 字。');if(!q)return {results:[]};
  const rows=this.db.prepare(`SELECT m.id,t.body FROM materials m JOIN material_text t ON t.materialId=m.id WHERE ${trash?'m.deletedAt IS NOT NULL':'m.deletedAt IS NULL'} AND (instr(lower(m.title),lower(?))>0 OR instr(lower(t.body),lower(?))>0) ORDER BY m.createdAt DESC,m.rowid DESC`).all(q,q);
  return {results:rows.map(({id,body})=>{const index=body.toLowerCase().indexOf(q.toLowerCase()),start=Math.max(0,index-40),end=Math.min(body.length,start+180);return {id,snippet:(start?'…':'')+body.slice(start,end)+(end<body.length?'…':'')}})};
 }
 folderName(value){const name=String(value??'').trim();if(!name||name.length>30||SYSTEM.includes(name))throw fail(400,'文件夹名称须为 1–30 字，且不能使用系统名称。');return name}
 checkFolder(id){if(id&&!this.db.prepare('SELECT id FROM folders WHERE id=?').get(id))throw fail(400,'文件夹已不存在，请重新选择。');return id||null}
 createFolder(name){name=this.folderName(name);if(this.db.prepare('SELECT id FROM folders WHERE name=?').get(name))throw fail(409,'这个文件夹名称已存在。');const id=randomUUID();this.db.prepare('INSERT INTO folders VALUES (?,?)').run(id,name);return {id,name}}
 renameFolder(id,name){name=this.folderName(name);if(!this.db.prepare('SELECT id FROM folders WHERE id=?').get(id))throw fail(404,'文件夹不存在。');if(this.db.prepare('SELECT id FROM folders WHERE name=? AND id!=?').get(name,id))throw fail(409,'这个文件夹名称已存在。');this.db.prepare('UPDATE folders SET name=? WHERE id=?').run(name,id);return {id,name}}
 deleteFolder(id){this.db.prepare('DELETE FROM folders WHERE id=?').run(id);return {ok:true}}
 writeFile(file,mime,display,paths){const id=randomUUID(),path=join(this.dir,'files',id),temp=path+'.tmp';paths.push(temp,path);writeFileSync(temp,file.buffer,{flag:'wx',mode:0o600});renameSync(temp,path);if(display!==null){const p=join(this.dir,'display',id+'.html');paths.push(p);writeFileSync(p,display,{flag:'wx',mode:0o600})}const meta={id,name:file.name,mime,size:file.buffer.length,sha256:createHash('sha256').update(file.buffer).digest('hex')};this.db.prepare('INSERT INTO files VALUES (?,?,?,?,?)').run(meta.id,meta.name,meta.mime,meta.size,meta.sha256);return meta}

 transaction(operation){const paths=[];this.db.exec('BEGIN IMMEDIATE');try{const result=operation(paths);this.db.exec('COMMIT');return result}catch(error){this.db.exec('ROLLBACK');for(const path of paths)try{unlinkSync(path)}catch{}throw error}}
 requestId(value){if(typeof value!=='string'||value.length<8||value.length>100||!/^[a-zA-Z0-9_-]+$/.test(value))throw fail(400,'导入请求标识无效，请重新开始导入。');return value}
 import({fields,files}){
  if(Object.keys(fields).some(k=>!['requestId','title','folderId','sourceUrl','acceptExternal'].includes(k)))throw fail(400,'导入字段无效。');
  const requestId=this.requestId(fields.requestId),prior=this.db.prepare("SELECT materialId FROM requests WHERE scope='import' AND id=?").get(requestId);if(prior)return {material:this.get(prior.materialId),replayed:true};
  validateFile(files.html,true);if(files.html.buffer.length>HTML_LIMIT||Object.keys(files).some(k=>k!=='html'))throw fail(400,'仅接受最多 20 MiB 的 HTML。');
  const hash=createHash('sha256').update(files.html.buffer).digest('hex'),duplicate=this.db.prepare('SELECT id FROM materials WHERE htmlHash=?').get(hash);
  if(duplicate)throw fail(409,'这份资料已存在。',{code:'duplicate',materialId:duplicate.id});
  const inspected=inspectHTML(files.html.buffer);if(inspected.warnings.length&&fields.acceptExternal!=='true')throw fail(422,'此文件引用其他资源，请查看受限预览后确认继续。',{code:'external_resources',warnings:inspected.warnings});
  const name=title(fields.title||inspected.title||files.html.name.replace(/\.html?$/i,'')),folderId=this.checkFolder(fields.folderId),url=sourceURL(fields.sourceUrl);
  return this.transaction(paths=>{const html=this.writeFile(files.html,'text/html',inspected.display,paths),id=randomUUID();this.db.prepare('INSERT INTO materials(id,title,folderId,htmlFileId,sourceUrl,htmlHash,createdAt) VALUES (?,?,?,?,?,?,?)').run(id,name,folderId,html.id,url,hash,now());this.db.prepare('INSERT INTO material_text VALUES (?,?)').run(id,inspected.text);this.db.prepare("INSERT INTO requests VALUES ('import',?,?)").run(requestId,id);return {material:this.get(id),replayed:false}});
 }
 html(id){const material=this.get(id),file=this.file(material.htmlFileId);return {source:decodeHTML(this.raw(file.id)),revision:file.sha256,filename:file.name,material}}
 saveHTML(id,{fields,files}){
  if(Object.keys(fields).length!==1||typeof fields.revision!=='string'||! /^[0-9a-f]{64}$/.test(fields.revision)||Object.keys(files).length!==1||!files.html)throw fail(400,'保存仅接受 HTML 与有效版本标识。');
  validateFile(files.html,true);if(files.html.buffer.length>HTML_LIMIT)throw fail(413,'HTML 超过 20 MiB。');
  const normalized=normalizeEditedHTML(files.html.buffer);if(normalized.buffer.length>HTML_LIMIT)throw fail(413,'规范后的 HTML 超过 20 MiB。');
  const hash=createHash('sha256').update(normalized.buffer).digest('hex'),inspected=inspectHTML(normalized.buffer);
  return this.transaction(paths=>{
   const material=this.get(id),file=this.file(material.htmlFileId);
   if(hash===file.sha256)return {...this.html(id),material};
   if(fields.revision!==file.sha256)throw fail(409,'这份 HTML 已被其它窗口修改。草稿已保留，请放弃后重新载入服务器版本。',{code:'revision_conflict'});
   if(this.db.prepare('SELECT id FROM materials WHERE htmlHash=? AND id!=?').get(hash,id))throw fail(409,'另一个条目已保存相同 HTML，未覆盖任何资料。',{code:'duplicate'});
   const saved=this.writeFile({name:file.name,buffer:normalized.buffer},'text/html',inspected.display,paths);
   this.db.prepare('UPDATE materials SET originalHtmlFileId=?,htmlFileId=?,htmlHash=? WHERE id=?').run(material.originalHtmlFileId||file.id,saved.id,hash,id);
   this.db.prepare('INSERT INTO material_text VALUES (?,?) ON CONFLICT(materialId) DO UPDATE SET body=excluded.body').run(id,inspected.text);
   return {material:this.get(id),revision:saved.sha256,filename:saved.name,source:normalized.source};
  });
 }
 edit(id,body){const m=this.get(id);const nextTitle=Object.hasOwn(body,'title')?title(body.title):m.title;const folder=Object.hasOwn(body,'folderId')?this.checkFolder(body.folderId):m.folderId;const url=Object.hasOwn(body,'sourceUrl')?sourceURL(body.sourceUrl):m.sourceUrl;if(Object.hasOwn(body,'deleted')&&typeof body.deleted!=='boolean')throw fail(400,'资料状态无效。');const deleted=Object.hasOwn(body,'deleted')?(body.deleted?now():null):m.deletedAt;const status=Object.hasOwn(body,'readingStatus')?validStatus(body.readingStatus):m.readingStatus;const notes=Object.hasOwn(body,'notes')?validNotes(body.notes):m.notes;this.db.prepare('UPDATE materials SET title=?,folderId=?,sourceUrl=?,deletedAt=?,readingStatus=?,notes=? WHERE id=?').run(nextTitle,folder,url,deleted,status,notes,id);return this.get(id)}

 reading(id){this.get(id);const rows=this.db.prepare('SELECT view,scrollTop,page,updatedAt FROM reading WHERE materialId=?').all(id);return Object.fromEntries(rows.map(({view,...data})=>[view,data]))}
 updateReading(id,view,body){this.get(id);if(!['html','source'].includes(view)||!Number.isFinite(body.scrollTop)||body.scrollTop<0||body.scrollTop>10000000||!Number.isInteger(body.page??1)||(body.page??1)<1||(body.page??1)>100000)throw fail(400,'阅读位置无效。');this.db.prepare('INSERT INTO reading VALUES (?,?,?,?,?) ON CONFLICT(materialId,view) DO UPDATE SET scrollTop=excluded.scrollTop,page=excluded.page,updatedAt=excluded.updatedAt').run(id,view,body.scrollTop,body.page??1,now());return this.reading(id)}
 open(id){this.get(id);this.db.prepare("UPDATE materials SET lastReadAt=?,readingStatus=CASE WHEN readingStatus='unread' THEN 'reading' ELSE readingStatus END WHERE id=?").run(now(),id);return {material:this.get(id),reading:this.reading(id)}}
 raw(id){this.file(id);return readFileSync(join(this.dir,'files',id))}
 outline(id){const material=this.get(id);return inspectHTML(this.raw(material.htmlFileId)).outline}
 display(id){const file=this.file(id);if(file.mime==='application/pdf')throw fail(400,'PDF 请使用原生预览或下载。');if(file.mime==='text/html')return inspectHTML(this.raw(id)).display;return readFileSync(join(this.dir,'display',id+'.html'))}
 markdown(id){
  const m=this.get(id),html=this.file(m.htmlFileId),source=m.sourceFileId?this.file(m.sourceFileId):null;
  const url=m.sourceUrl?new URL(m.sourceUrl).href.replace(/[()<>]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase()):'';
  return '# '+markdownLine(m.title)+'\n\n- 阅读状态：'+stateLabels[m.readingStatus]+'\n- HTML 文件：'+markdownLine(html.name)+'\n'+(source?'- 原文文件：'+markdownLine(source.name)+'\n':'')+(url?'- 来源链接：[来源网页](<'+url+'>)\n':'')+'\n## 个人备注\n\n'+(m.notes?markdownText(m.notes):'尚未填写备注')+'\n';
 }
 exportBackup(){return this.transaction(()=>{
  const data=this.library(),reading=this.db.prepare('SELECT * FROM reading').all();
  if(data.folders.length+data.materials.length+data.files.length+reading.length>RECORD_LIMIT)throw fail(413,'备份记录总数超过 2000。');
  if(data.files.reduce((n,f)=>n+f.size,0)>BACKUP_LIMIT)throw fail(413,'备份原件总量超过 100 MiB。');
  const pack={format:'PageNest',version:3,exportedAt:now(),folders:data.folders,materials:data.materials,files:data.files.map(f=>({...f,data:this.raw(f.id).toString('base64')})),reading};return encodeBackup(pack);
 })}
 restoreBackup(bytes){
  const {pack,buffers}=decodeBackup(bytes),prepared=new Map();
  // Derive every display before opening the write transaction, even for skipped records.
  for(const f of pack.files){const buffer=buffers.get(f.id),html=f.mime==='text/html'?inspectHTML(buffer):null;prepared.set(f.id,{buffer,display:html?.display??(f.mime==='text/plain'?textDisplay(buffer):null),text:html?.text})}
  return this.transaction(paths=>{
   const folders=new Map(),files=new Map(),materials=new Map();let added=0,skipped=0;
   for(const f of pack.folders){const existing=this.db.prepare('SELECT id FROM folders WHERE name=?').get(f.name);folders.set(f.id,existing?.id||this.createFolder(f.name).id)}
   const key=f=>JSON.stringify([f.sha256,f.mime,f.name]),existingFiles=new Map();
   for(const f of this.db.prepare('SELECT * FROM files').all())if(!existingFiles.has(key(f)))existingFiles.set(key(f),f);
   // Match only pre-existing files, preserving every distinct record in an empty restore.
   for(const f of pack.files){const old=existingFiles.get(key(f)),p=prepared.get(f.id);files.set(f.id,old||this.writeFile({name:f.name,buffer:p.buffer},f.mime,p.display,paths))}
   for(const m of pack.materials){const html=files.get(m.htmlFileId);if(this.db.prepare('SELECT id FROM materials WHERE htmlHash=?').get(html.sha256)){skipped++;continue}
    const id=randomUUID();this.db.prepare('INSERT INTO materials(id,title,folderId,htmlFileId,originalHtmlFileId,sourceFileId,sourceUrl,htmlHash,deletedAt,createdAt,lastReadAt,readingStatus,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,m.title,m.folderId===null?null:folders.get(m.folderId),html.id,m.originalHtmlFileId===null?null:files.get(m.originalHtmlFileId).id,m.sourceFileId===null?null:files.get(m.sourceFileId).id,m.sourceUrl,html.sha256,m.deletedAt,m.createdAt,m.lastReadAt,m.readingStatus,m.notes);
    this.db.prepare('INSERT INTO material_text VALUES (?,?)').run(id,prepared.get(m.htmlFileId).text);materials.set(m.id,id);added++;
   }
   for(const r of pack.reading){const id=materials.get(r.materialId);if(id)this.db.prepare('INSERT INTO reading VALUES (?,?,?,?,?)').run(id,r.view,r.scrollTop,r.page,r.updatedAt)}
   return {added,skipped};
  });
 }
 close(){this.db.close()}
}
