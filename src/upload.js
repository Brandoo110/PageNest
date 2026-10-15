import busboy from 'busboy';
export const HTML_LIMIT=20*1024*1024,SOURCE_LIMIT=50*1024*1024;
export const fail=(status,message,extra={})=>Object.assign(new Error(message),{status,...extra});
export async function multipart(req){return new Promise((resolve,reject)=>{
 let parser;try{parser=busboy({headers:req.headers,defParamCharset:'utf8',limits:{files:1,fields:10,parts:11,fileSize:HTML_LIMIT,fieldSize:8192}})}catch{reject(fail(400,'请选择文件后重新提交。'));req.resume();return}
 const fields=Object.create(null),files=Object.create(null);let error=null,total=0,finished=false;
 const finish=()=>{if(finished)return;finished=true;if(error)reject(error);else resolve({fields,files})};
 req.on('data',chunk=>{total+=chunk.length;if(total>HTML_LIMIT+1024*1024&&!finished){error=fail(413,'上传总大小超过限制。');req.unpipe(parser);parser.destroy();req.resume();finish()}});
 parser.on('field',(name,value,info)=>{if(info.valueTruncated||Object.hasOwn(fields,name))error=fail(400,'表单字段无效或重复。');fields[name]=value});
 parser.on('file',(name,stream,info)=>{const chunks=[];let size=0;const limit=HTML_LIMIT;
  if(name!=='html'||Object.hasOwn(files,name))error=fail(400,'一次只接受一个 HTML 文件。');
  const file={name:String(info.filename||'').replace(/[\r\n\0]/g,'').slice(0,180),buffer:null};files[name]=file;
  stream.on('data',chunk=>{size+=chunk.length;if(size>limit)error=fail(413,'HTML 文件超过 20 MiB。');if(!error)chunks.push(chunk)});
  stream.on('limit',()=>{error=fail(413,'HTML 文件超过 20 MiB。')});stream.on('end',()=>{file.buffer=Buffer.concat(chunks)});stream.on('error',e=>{error=e});
 });
 for(const event of ['filesLimit','fieldsLimit','partsLimit'])parser.on(event,()=>{error=fail(400,'文件或字段数量超过限制。')});
 parser.on('error',()=>{error=fail(400,'文件上传未完成，请保留表单后重试。');finish()});parser.on('close',finish);req.on('aborted',()=>{error=fail(400,'上传已中断。');parser.destroy();finish()});req.pipe(parser);
 })}
export function validateFile(file,html=false){if(!file?.buffer?.length)throw fail(400,html?'请选择一个 HTML 文件。':'原文文件为空。');const ext=file.name.toLowerCase().split('.').at(-1);if(!(html?['html','htm']:['html','htm','txt','pdf']).includes(ext))throw fail(400,html?'仅支持 .html / .htm 文件。':'原文仅支持 PDF、TXT、HTML。');if(ext==='pdf'&&file.buffer.subarray(0,5).toString()!=='%PDF-')throw fail(400,'这个文件不是可识别的 PDF。');return ['html','htm'].includes(ext)?'text/html':ext==='pdf'?'application/pdf':'text/plain'}
