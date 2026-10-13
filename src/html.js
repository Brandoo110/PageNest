import {parseDocument,DomUtils} from 'htmlparser2';
import render from 'dom-serializer';
import {readFileSync} from 'node:fs';
export const HTML_CSP="sandbox allow-scripts; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; frame-src 'none'; child-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
export const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const textBlocks=new Set(['address','article','aside','blockquote','br','dd','div','dl','dt','figcaption','figure','footer','h1','h2','h3','h4','h5','h6','header','hr','li','main','nav','ol','p','pre','section','table','td','th','tr','ul']);
const staticallyHidden=node=>{
 const attrs=node.attribs||{};
 return ['head','title','script','style','template','noscript'].includes(node.name)||Object.hasOwn(attrs,'hidden')||attrs['aria-hidden']?.toLowerCase()==='true'||/(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*(?:hidden|collapse))\s*(?:!important\s*)?(?:;|$)/i.test((attrs.style||'').replace(/\/\*[\s\S]*?\*\//g,''));
};
// Search and outline share known static visibility, without executing CSS or scripts.
function staticText(nodes){
 const chunks=[];
 function visit(children){for(const node of children){
  const tag=node.name;
  if(staticallyHidden(node))continue;
  if(node.type==='text')chunks.push(node.data);
  if(textBlocks.has(tag))chunks.push(' ');
  if(node.children)visit(node.children);
  if(textBlocks.has(tag))chunks.push(' ');
 }}
 visit(nodes);return chunks.join('').replace(/\s+/gu,' ').trim();
}
const bridge=readFileSync(new URL('./bridge.js',import.meta.url),'utf8');
function decode(buffer){const header=buffer.subarray(0,4096).toString('latin1');const charset=header.match(/charset\s*=\s*["']?([a-zA-Z0-9_-]+)/i)?.[1]||'utf-8';try{return new TextDecoder(charset).decode(buffer)}catch{throw Object.assign(new Error('不支持这个 HTML 字符编码，请另存为 UTF-8。'),{status:400})}}
export function inspectHTML(buffer){
 const doc=parseDocument(decode(buffer));const warnings=new Set();let title='',text='',visual=false;
 const external=value=>value&&!value.trim().startsWith('#')&&!value.trim().startsWith('data:');
 function visit(nodes,blocked=false){for(const node of nodes){if(node.type==='text'&&!blocked)text+=node.data;const tag=node.name;
  if(tag==='title'&&!title)title=DomUtils.textContent(node).trim();
  const hidden=blocked||['head','title','script','style','template','noscript'].includes(tag);
  if(!hidden&&['img','svg','canvas','table','video','audio'].includes(tag))visual=true;
  if(node.attribs){for(const key of ['src','srcset','poster','data','background'])if(external(node.attribs[key]))warnings.add(`${tag} 的 ${key} 依赖其他资源`);if(tag==='link'&&external(node.attribs.href))warnings.add('页面引用外部样式或资源');if(tag==='base')warnings.add('页面设置了资源基地址');if(tag==='meta'&&/refresh/i.test(node.attribs['http-equiv']||''))warnings.add('页面包含自动跳转');}
  const css=tag==='style'?DomUtils.textContent(node):node.attribs?.style||'';
  if(/@import\s|url\(\s*["']?(?!data:|#)/i.test(css))warnings.add('样式引用了其他资源');
  if(node.children)visit(node.children,hidden);
 }}visit(doc.children);
 const bodyText=staticText(doc.children);
 const outline=[];
 function markHeadings(nodes,hidden=false){for(const node of nodes){
  if(node.attribs)delete node.attribs['data-pagenest-heading'];
  const blocked=hidden||staticallyHidden(node);
  if(!blocked&&/^h[1-6]$/.test(node.name)&&outline.length<200){
   const label=Array.from(staticText([node])).slice(0,200).join('');
   if(label){const id='pn-heading-'+outline.length;node.attribs['data-pagenest-heading']=id;outline.push({id,label,level:Number(node.name[1])})}
  }
  if(node.children)markHeadings(node.children,blocked);
 }}markHeadings(doc.children);
 if(!text.trim()&&!visual)throw Object.assign(new Error('没有识别到可阅读内容，请选择有正文的 HTML。'),{status:400});
 function clean(parent){parent.children=parent.children?.filter(n=>n.name!=='base'&&!(n.name==='meta'&&(/refresh/i.test(n.attribs?.['http-equiv']||'')||n.attribs?.charset||/content-type/i.test(n.attribs?.['http-equiv']||''))))||[];for(const child of parent.children)if(child.children)clean(child)}clean(doc);
 const bridgeNodes=parseDocument(`<meta charset="utf-8"><script>${bridge}</script>`).children;
 const head=DomUtils.findOne(n=>n.name==='head',doc.children,true);
 if(head)head.children.unshift(...bridgeNodes);else doc.children.unshift(...parseDocument(`<head><meta charset="utf-8"><script>${bridge}</script></head>`).children);
 return {title:title.slice(0,120),text:bodyText,warnings:[...warnings],outline,display:render(doc,{encodeEntities:'utf8'})};
}
export function textDisplay(buffer){return `<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:30px 24px;color:#242a27;background:white}pre{max-width:720px;margin:0 auto;white-space:pre-wrap;overflow-wrap:anywhere;font:16px/2 Georgia,"Songti SC",serif}</style><pre>${escapeHTML(buffer.toString('utf8'))}</pre><script>${bridge}</script>`}
