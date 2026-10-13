import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {fail,validateFile,HTML_LIMIT,SOURCE_LIMIT} from './upload.js';
export const BACKUP_LIMIT=100*1024*1024,JSON_LIMIT=150*1024*1024,RECORD_LIMIT=2000;
const systemNames=['全部资料','最近阅读','未分类','回收站'];
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ensure=(ok,message='备份内容无效。',status=400)=>{if(!ok)throw fail(status,message)};
function shape(value,keys){ensure(value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join('|')===keys.slice().sort().join('|'),'备份字段无效。')}
function date(value,nullable=false){if(nullable&&value===null)return;ensure(typeof value==='string'&&value.length===24&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value,'备份日期无效。')}
function label(value,max){ensure(typeof value==='string'&&value.length>0&&value.length<=max&&value.trim()===value,'备份名称或标题无效。')}
export function validateBackup(pack){
 shape(pack,['format','version','exportedAt','folders','materials','files','reading']);ensure(pack.format==='PageNest'&&pack.version===1,'不支持这个备份格式或版本。');date(pack.exportedAt);
 const groups=[pack.folders,pack.materials,pack.files,pack.reading];ensure(groups.every(Array.isArray),'备份记录无效。');ensure(groups.reduce((n,a)=>n+a.length,0)<=RECORD_LIMIT,'备份记录总数超过 2000。',413);
 const ids=new Set(),folderIds=new Set(),names=new Set(),files=new Map(),buffers=new Map(),materialIds=new Set(),readKeys=new Set();let total=0;
 const id=value=>{ensure(typeof value==='string'&&uuid.test(value)&&!ids.has(value),'备份 ID 无效或重复。');ids.add(value)};
 for(const folder of pack.folders){shape(folder,['id','name']);id(folder.id);label(folder.name,30);ensure(!systemNames.includes(folder.name)&&!names.has(folder.name),'备份分类名称无效或重复。');names.add(folder.name);folderIds.add(folder.id)}
 for(const file of pack.files){
  shape(file,['id','name','mime','size','sha256','data']);id(file.id);ensure(typeof file.name==='string'&&file.name.length>0&&file.name.length<=180&&!/[\r\n\0]/.test(file.name),'备份文件名无效。');ensure(['text/html','text/plain','application/pdf'].includes(file.mime),'备份文件类型无效。');ensure(Number.isInteger(file.size)&&file.size>0&&file.size<=SOURCE_LIMIT,'备份单文件超过 50 MiB 或大小无效。',413);
  total+=file.size;ensure(total<=BACKUP_LIMIT,'备份原件总量超过 100 MiB。',413);ensure(typeof file.sha256==='string'&&/^[0-9a-f]{64}$/.test(file.sha256),'备份文件 hash 无效。');ensure(typeof file.data==='string'&&file.data.length===4*Math.ceil(file.size/3),'备份文件编码或长度无效。');
  const buffer=Buffer.from(file.data,'base64');ensure(buffer.length===file.size&&buffer.toString('base64')===file.data,'备份文件须为严格 base64，且长度一致。');ensure(createHash('sha256').update(buffer).digest('hex')===file.sha256,'备份文件 hash 不一致。');ensure(validateFile({name:file.name,buffer})===file.mime,'备份文件类型与原件不一致。');files.set(file.id,file);buffers.set(file.id,buffer);
 }
 for(const m of pack.materials){
  shape(m,['id','title','folderId','htmlFileId','sourceFileId','sourceUrl','deletedAt','createdAt','lastReadAt']);id(m.id);materialIds.add(m.id);label(m.title,120);ensure(m.folderId===null||folderIds.has(m.folderId),'备份分类引用无效。');const html=files.get(m.htmlFileId);ensure(html?.mime==='text/html','备份缺少资料 HTML 原件。');ensure(html.size<=HTML_LIMIT,'备份资料 HTML 超过 20 MiB。',413);ensure(m.sourceFileId===null||files.has(m.sourceFileId),'备份原文引用无效。');ensure(typeof m.sourceUrl==='string'&&m.sourceUrl.length<=4096&&m.sourceUrl.trim()===m.sourceUrl,'备份来源链接无效。');if(m.sourceUrl){let u;try{u=new URL(m.sourceUrl)}catch{}ensure(u?.protocol==='https:'&&u.hostname,'备份来源链接须为 HTTPS。')}
  date(m.createdAt);date(m.lastReadAt,true);date(m.deletedAt,true);
 }
 for(const r of pack.reading){shape(r,['materialId','view','scrollTop','page','updatedAt']);ensure(typeof r.materialId==='string'&&typeof r.view==='string','备份阅读引用无效。');const key=r.materialId+':'+r.view;ensure(materialIds.has(r.materialId)&&['html','source'].includes(r.view)&&!readKeys.has(key),'备份阅读引用无效或重复。');readKeys.add(key);ensure(Number.isFinite(r.scrollTop)&&r.scrollTop>=0&&r.scrollTop<=10000000&&Number.isInteger(r.page)&&r.page>=1&&r.page<=100000,'备份阅读位置无效。');date(r.updatedAt)}
 return {pack,buffers};
}
export function encodeBackup(pack){
 validateBackup(pack);const json=Buffer.from(JSON.stringify(pack));ensure(json.length<=JSON_LIMIT,'备份 JSON 超过 150 MiB。',413);const compressed=gzipSync(json);ensure(compressed.length<=BACKUP_LIMIT,'压缩备份超过 100 MiB。',413);return compressed;
}
export function decodeBackup(buffer){
 ensure(Buffer.isBuffer(buffer)&&buffer.length>0,'请选择一个备份文件。');ensure(buffer.length<=BACKUP_LIMIT,'压缩备份超过 100 MiB。',413);let json;
 try{json=gunzipSync(buffer,{maxOutputLength:JSON_LIMIT})}catch(e){throw fail(e.code==='ERR_BUFFER_TOO_LARGE'?413:400,e.code==='ERR_BUFFER_TOO_LARGE'?'备份解压 JSON 超过 150 MiB。':'备份损坏或不是有效 gzip 文件。')}
 let pack;try{pack=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(json))}catch{throw fail(400,'备份不是有效的 UTF-8 JSON。')}
 return validateBackup(pack);
}
export async function readBackup(req){
 if(Number(req.headers['content-length'])>BACKUP_LIMIT){req.resume();throw fail(413,'压缩备份超过 100 MiB。')}
 const chunks=[];let size=0;try{for await(const chunk of req.iterator({destroyOnReturn:false})){size+=chunk.length;if(size>BACKUP_LIMIT){req.resume();throw fail(413,'压缩备份超过 100 MiB。')}chunks.push(chunk)}}catch(e){if(e.status)throw e;throw fail(400,'备份上传中断，请重新选择后重试。')}
 return Buffer.concat(chunks,size);
}
