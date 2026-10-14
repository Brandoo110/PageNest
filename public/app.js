const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function highlightSearchText(value){
 const text=String(value??''),term=query.trim();if(!term)return esc(text);
 const pattern=new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi');
 let html='',end=0;
 for(const match of text.matchAll(pattern)){html+=esc(text.slice(end,match.index))+'<mark class="search-highlight">'+esc(match[0])+'</mark>';end=match.index+match[0].length}
 return html+esc(text.slice(end));
}
const blank='未分类';
let libraryData={folders:[],materials:[],files:[]},folder='all',query='',listY=0,screen='library',current=null,view='html',positions={},draft=null,fit=false,naturalWidth=0,frameReady=false,frameReported=false,frameTimeout;
let toastTimer,undoAction,readingTimer,flushPromise;
const dirtyReading=new Map();
let searchTimer,searchRequest=0,searchState={results:[],loading:false,error:''};
async function api(path,method='GET',body,keepalive=false,signal){let response;try{response=await fetch(path,{method,headers:body instanceof FormData?{}:body?{'Content-Type':'application/json'}:{},body:body instanceof FormData?body:body?JSON.stringify(body):undefined,...(keepalive?{keepalive:true}:{}),...(signal?{signal}:{})})}catch{throw Object.assign(new Error('连接中断，保存结果暂未确认。请保留输入，重试会核对同一次请求。'),{code:'network'})}const data=await response.json();if(!response.ok)throw Object.assign(new Error(data.error||'操作未成功。'),data);return data}
async function refresh(){libraryData=await api('/api/library')}
const folderName=id=>libraryData.folders.find(f=>f.id===id)?.name||blank;
const fileMeta=id=>libraryData.files.find(f=>f.id===id);
const getItem=id=>libraryData.materials.find(x=>x.id===id);
const folderLabel=()=>({all:'全部资料',recent:'最近阅读',uncategorized:blank,trash:'回收站'}[folder]||folderName(folder));
const isCustom=()=>libraryData.folders.some(f=>f.id===folder);
function toast(message,undo=null){clearTimeout(toastTimer);undoAction=undo;$('#toast').innerHTML=esc(message)+(undo?'<button data-action="undo">撤销</button>':'');$('#toast').hidden=false;toastTimer=setTimeout(()=>{$('#toast').hidden=true;undoAction=null},4500)}
function openDialog(html,drawer=false){if(folderAction?.busy)return;closeFolderPopover();if(notesEditor){if(notesEditor.busy){notesFeedback(notesEditor,'正在保存，请等待结果后关闭。');return}if(notesEditor.draft!==notesEditor.saved){showNotesPrompt(()=>{closeDialog(true);openDialog(html,drawer)});return}notesEditor=null}const d=$('#dialog');if(d.open)d.close();d.classList.toggle('drawer',drawer);$('#dialog-body').innerHTML=html;d.showModal()}
function closeDialog(force=false){if(folderAction?.busy)return false;closeFolderPopover();if(notesEditor&&!force){if(notesEditor.busy){notesFeedback(notesEditor,'正在保存，请等待结果后关闭。');return false}if(notesEditor.draft!==notesEditor.saved){showNotesPrompt(()=>closeDialog(true));return false}}notesEditor=null;if($('#dialog').open)$('#dialog').close();$('#dialog-body').replaceChildren();return true}
$('#dialog').addEventListener('close',()=>{if(!$('#dialog').open){closeFolderPopover();$('#dialog-body').replaceChildren()}});
function dialogError(message){let el=$('#dialog-error');if(!el){el=document.createElement('p');el.id='dialog-error';el.className='error';el.setAttribute('role','alert');$('#dialog-body').append(el)}el.textContent=message}
async function action(button,work,error=dialogError){button.disabled=true;try{await work()}catch(e){error(e.message)}finally{button.disabled=false}}
function selectedItems(target=folder){return libraryData.materials.filter(x=>target==='trash'?x.deletedAt:!x.deletedAt&&(target==='all'||(target==='recent'?x.lastReadAt:target==='uncategorized'?!x.folderId:x.folderId===target)))}
function icon(name){const paths={library:'<rect x="3" y="3" width="7" height="18" rx="1"/><path d="M14 3l5-1 3 18-5 1zM5 7h3M5 17h3"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',inbox:'<path d="M4 4h16l2 12v4H2v-4zM2 15h6l2 3h4l2-3h6"/>',folder:'<path d="M3 6a2 2 0 012-2h5l2 3h7a2 2 0 012 2v10H3z"/>',trash:'<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7"/>',menu:'<path d="M4 6h16M4 12h16M4 18h16"/>'};return `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`}
let folderNavSequence=0;
function nav(){
 const scope='folder-nav-'+(++folderNavSequence),entries=[['all','全部资料'],['recent','最近阅读'],['uncategorized',blank],...libraryData.folders.map(f=>[f.id,f.name])];
 return entries.map(([id,name],i)=>{
  const custom=i>=3,menuId=scope+'-'+i;
  const select=`<button class="navitem ${folder===id?'active':''}" data-folder="${esc(id)}"><span class="nav-label">${icon(i===0?'library':i===1?'clock':i===2?'inbox':'folder')}<span class="folder-nav-name" title="${esc(name)}">${esc(name)}</span></span><span class="count">${selectedItems(id).length}</span></button>`;
  return `${i===3?'<div class="section-label">我的文件夹</div>':''}${custom?`<div class="folder-nav-row ${folder===id?'active':''}">${select}<button class="quiet folder-nav-menu" data-folder-menu="${esc(id)}" popovertarget="${menuId}" aria-controls="${menuId}" aria-expanded="false" aria-label="管理文件夹：${esc(name)}" aria-haspopup="menu">⋯</button><div id="${menuId}" class="folder-popover" popover="auto" role="menu" aria-label="管理文件夹：${esc(name)}"><button role="menuitem" data-folder-operation="rename">重命名</button><button role="menuitem" class="danger" data-folder-operation="delete">删除文件夹</button></div></div>`:select}`;
 }).join('');
}
function trashNav(){return `<button class="navitem ${folder==='trash'?'active':''}" data-folder="trash"><span class="nav-label">${icon('trash')}回收站</span><span class="count">${selectedItems('trash').length}</span></button>`}
function options(id){return `<option value="">未分类</option>`+libraryData.folders.map(f=>`<option value="${f.id}" ${id===f.id?'selected':''}>${esc(f.name)}</option>`).join('')}
function library(){invalidateSearch();clearTimeout(frameTimeout);screen='library';current=null;document.title='PageNest · '+folderLabel();history.replaceState({folder,query,listY},'','#library');$('#screen').innerHTML=`<div class="shell"><aside class="sidebar"><div class="brand"><i class="brand-mark" aria-hidden="true"></i>PageNest</div>${nav()}<button class="quiet" data-action="new-folder">＋ 新建文件夹</button><div class="sidebar-bottom">${trashNav()}<button class="navitem backup-entry" data-action="backup">备份与恢复</button><div class="demo-controls"><p class="small muted" style="padding:8px 14px">本机保存 · 无账号与同步</p></div></div></aside><main class="content" id="main-content" tabindex="-1"><div class="content-top"><div class="grow"><div class="title-row"><h1>${esc(folderLabel())}</h1><button class="mobile-only quiet icon-button" data-action="categories" aria-label="打开分类">${icon('menu')}</button></div><p class="subtitle">${selectedItems().length} 份资料${folder==='trash'?' · 可随时恢复':' · 留在这里，随时接着读'}</p></div>${folder!=='trash'?'<button class="primary" data-action="import">＋ 导入 HTML</button>':''}</div><div class="search-wrap"><i class="search-icon" aria-hidden="true"></i><input id="search" type="search" maxlength="120" placeholder="搜索标题和正文" aria-label="搜索标题和正文" value="${esc(query)}"></div>${statusFilters()}${isCustom()?'<div class="folder-toolbar row"><button class="quiet" data-action="rename-folder">重命名</button><button class="quiet" data-action="delete-folder">删除文件夹</button></div>':''}<div class="list-heading"><span id="list-label">${query.trim()?'全部资料的搜索结果':'资料'}</span><span>本机资料</span></div><div id="list"></div><div class="library-footer"><span>HTML 与原文，收在同一处。</span><span class="desktop-hint">仅保存在此电脑</span></div></main></div>`;renderList();$('#search').oninput=e=>{query=e.target.value;listY=0;history.replaceState({folder,query,listY},'','#library');scheduleSearch();$('#list-label').textContent=query.trim()?'全部资料的搜索结果':'资料'};if(query.trim())scheduleSearch(0);window.scrollTo(0,listY)}
function invalidateSearch(){closeFolderPopover();clearTimeout(searchTimer);searchRequest++;searchState={results:[],loading:false,error:''}}
function scheduleSearch(delay=180){
 invalidateSearch();if(!query.trim()){renderList();return}
 searchState.loading=true;renderList();const request=searchRequest,term=query.trim(),trash=folder==='trash';
 searchTimer=setTimeout(()=>loadSearch(request,term,trash),delay);
}
async function loadSearch(request,term,trash){
 const active=()=>request===searchRequest&&screen==='library'&&query.trim()===term&&(folder==='trash')===trash;
 try{const data=await api('/api/search?q='+encodeURIComponent(term)+'&trash='+(trash?'1':'0'));if(!active())return;searchState={results:data.results,loading:false,error:''}}
 catch(e){if(!active())return;searchState={results:[],loading:false,error:e.message}}
 renderList();
}
function renderList(){if(query.trim()&&searchState.loading){$('#list').innerHTML='<div class="search-feedback" role="status">正在搜索标题和正文…<div class="loading-line" aria-hidden="true"></div></div>';return}if(query.trim()&&searchState.error){$('#list').innerHTML=`<div class="search-feedback"><p class="error" role="alert">搜索未完成：${esc(searchState.error)}</p><button data-action="retry-search">重新搜索</button></div>`;return}let shown=query.trim()?searchState.results.map(hit=>getItem(hit.id)).filter(x=>x&&(folder==='trash'?x.deletedAt:!x.deletedAt)):selectedItems();if(statusFilter!=='all')shown=shown.filter(x=>x.readingStatus===statusFilter);if(folder==='recent'&&!query.trim())shown.sort((a,b)=>b.lastReadAt.localeCompare(a.lastReadAt));$('#list').innerHTML=shown.length?shown.map(x=>{const source=fileMeta(x.sourceFileId),snippet=searchState.results.find(hit=>hit.id===x.id)?.snippet;return `<article class="item"><div class="filemark" aria-hidden="true">HTML</div><div class="item-main"><button class="item-title" data-open="${x.id}" ${x.deletedAt?'disabled':''}>${highlightSearchText(x.title)}</button><div class="item-meta">${esc(folderName(x.folderId))} · ${source?'原文 '+({'text/plain':'TXT','application/pdf':'PDF','text/html':'HTML'}[source.mime]):x.sourceUrl?'仅来源链接':'未附原文'}<span class="pill reading-status status-${esc(x.readingStatus)}">${readingLabels[x.readingStatus]}</span></div>${query.trim()?`<p class="search-snippet">${snippet?highlightSearchText(snippet):esc('标题匹配')}</p>`:''}</div><time class="item-date" datetime="${esc(x.createdAt)}">${new Date(x.createdAt).toLocaleDateString('zh-CN',{month:'short',day:'numeric'})}</time>${x.deletedAt?`<button class="quiet" data-restore="${x.id}" aria-label="恢复 ${esc(x.title)}">恢复</button>`:`<button class="quiet icon-button" data-menu="${x.id}" aria-label="更多 ${esc(x.title)}">···</button>`}</article>`}).join(''):statusFilter!=='all'?'<div class="empty"><h2>没有符合状态的资料</h2><p>试试其他阅读状态，或查看全部。</p><button data-action="clear-status-filter">查看全部状态</button></div>':`<div class="empty"><i class="empty-mark" aria-hidden="true"></i><h2>${query.trim()?'没有找到这份资料':folder==='trash'?'回收站是空的':!selectedItems('all').length?'把第一份 HTML 放进来':'这里还没有资料'}</h2><p>${query.trim()?'换一个关键词，或清空搜索。':folder==='trash'?'移入回收站的资料会出现在这里。':'把整理好的页面收在这里，原文可以稍后补。'}</p>${query.trim()?'<button data-action="clear-search">清空搜索</button>':folder!=='trash'?'<button class="primary" data-action="import">导入 HTML</button>':''}</div>`}
function createFolder(forDraft=false){openDialog('<h2 id="dialog-title">新建文件夹</h2><p class="small muted">一个简单的位置，留给相关资料。</p><div class="field"><label for="folder-name">文件夹名称</label><input id="folder-name" maxlength="30" placeholder="例如：阅读笔记"></div><div id="dialog-error" class="error" role="alert"></div><div class="row actions"><button id="folder-save" class="primary">创建</button><button data-action="close-dialog">取消</button></div>');$('#folder-save').onclick=e=>action(e.target,async()=>{const result=await api('/api/folders','POST',{name:$('#folder-name').value});await refresh();closeDialog();if(forDraft){draft.folderId=result.id;draft.dirty=true;renderImport()}else{folder=result.id;query='';listY=0;library()}toast('文件夹已创建')});$('#folder-name').onkeydown=e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();$('#folder-save').click()}};$('#folder-name').focus()}
let folderAction=null;
function folderTarget(id){const target=libraryData.folders.find(f=>f.id===id);if(!target){toast('这个文件夹已不存在，请刷新后重新查看。');return null}return Object.freeze({id:target.id,name:target.name})}
function withFolderDialog(open){
 if(folderAction?.busy)return;
 if(notesEditor){if(notesEditor.busy){notesFeedback(notesEditor,'正在保存，请等待结果后继续。');return}if(notesEditor.draft!==notesEditor.saved){showNotesPrompt(()=>{closeDialog(true);open()});return}}
 open();
}
let folderPopover=null;
function closeFolderPopover(restoreFocus=false){
 const ctx=folderPopover;if(!ctx)return;folderPopover=null;
 ctx.button.setAttribute('aria-expanded','false');
 if(ctx.popover.isConnected&&ctx.popover.matches(':popover-open'))ctx.popover.hidePopover();
 if(restoreFocus&&ctx.button.isConnected)ctx.button.focus({preventScroll:true});
}
function positionFolderPopover(ctx){
 const anchor=ctx.button.getBoundingClientRect(),box=ctx.popover.getBoundingClientRect(),margin=8,gap=5;
 const left=Math.max(margin,Math.min(anchor.right-box.width,window.innerWidth-box.width-margin));
 const below=anchor.bottom+gap,top=below+box.height<=window.innerHeight-margin?below:anchor.top-box.height-gap;
 ctx.popover.style.left=left+'px';ctx.popover.style.top=Math.max(margin,Math.min(top,window.innerHeight-box.height-margin))+'px';
}
function folderMenu(button,edge=null){
 if(folderAction?.busy)return;
 if(folderPopover?.button===button){if(edge)folderPopover.popover.querySelector(edge==='last'?'[role="menuitem"]:last-child':'[role="menuitem"]').focus({preventScroll:true});else closeFolderPopover(true);return}
 closeFolderPopover();const target=folderTarget(button.dataset.folderMenu),popover=document.getElementById(button.getAttribute('popovertarget'));
 if(!target||!popover)return;
 const ctx=folderPopover={target,button,popover};
 popover.onbeforetoggle=event=>{button.setAttribute('aria-expanded',String(event.newState==='open'));if(event.newState==='closed'&&folderPopover===ctx)folderPopover=null};
 popover.onkeydown=event=>{
  if(event.key==='Tab'){closeFolderPopover(true);return}
  const items=Array.from(popover.querySelectorAll('[role="menuitem"]'));let index=items.indexOf(document.activeElement);
  if(event.key==='ArrowDown')index=(index+1)%items.length;
  else if(event.key==='ArrowUp')index=(index+items.length-1)%items.length;
  else if(event.key==='Home')index=0;else if(event.key==='End')index=items.length-1;else return;
  event.preventDefault();items[index].focus();
 };
 popover.style.left='8px';popover.style.top='8px';popover.showPopover({source:button});positionFolderPopover(ctx);
 popover.querySelector(edge==='last'?'[role="menuitem"]:last-child':'[role="menuitem"]').focus({preventScroll:true});
}
function chooseFolderOperation(button){
 const ctx=folderPopover;if(!ctx||!ctx.popover.contains(button))return;
 const {target}=ctx;closeFolderPopover();
 if(button.dataset.folderOperation==='rename')renameFolder(target);else if(button.dataset.folderOperation==='delete')deleteFolder(target);
}
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&folderPopover){event.preventDefault();event.stopPropagation();closeFolderPopover(true);return}
 const button=event.target.closest('[data-folder-menu]');
 if(button&&(event.key==='ArrowDown'||event.key==='ArrowUp')){event.preventDefault();folderMenu(button,event.key==='ArrowUp'?'last':'first')}
},true);
document.addEventListener('scroll',()=>closeFolderPopover(),{capture:true,passive:true});
window.addEventListener('resize',()=>closeFolderPopover());
window.addEventListener('pagehide',()=>closeFolderPopover());
window.addEventListener('popstate',()=>closeFolderPopover());
function renameFolder(target=folder){const snapshot=typeof target==='string'?folderTarget(target):target;if(snapshot)editFolder(snapshot,false)}
function deleteFolder(target=folder){const snapshot=typeof target==='string'?folderTarget(target):target;if(snapshot)editFolder(snapshot,true)}
function editFolder(target,deleting){
 if(!libraryData.folders.some(f=>f.id===target.id)){toast('这个文件夹已不存在，请刷新后重新查看。');return}
 withFolderDialog(()=>{
  const count=libraryData.materials.filter(m=>m.folderId===target.id&&!m.deletedAt).length;
  openDialog(`<section id="folder-action"><h2 id="dialog-title">${deleting?'删除文件夹？':'重命名文件夹'}</h2>${deleting?`<p class="folder-action-name">“${esc(target.name)}”中的 ${count} 份资料将移到未分类，原内容不会删除。</p><p class="small muted">回收站条目仍留在回收站，只移除文件夹归属。</p>`:`<div class="field"><label for="folder-name">文件夹名称</label><input id="folder-name" value="${esc(target.name)}" maxlength="30"></div>`}<div id="dialog-error" class="error" role="alert"></div><div class="row actions"><button id="folder-action-confirm" class="${deleting?'danger':'primary'}">${deleting?'删除文件夹':'保存'}</button><button id="folder-action-cancel" data-action="close-dialog">取消</button></div></section>`);
  const ctx=folderAction={target,deleting,root:$('#folder-action'),busy:false,written:false,writtenName:''},input=$('#folder-name'),confirm=$('#folder-action-confirm'),cancel=$('#folder-action-cancel');
  const active=()=>folderAction===ctx&&$('#dialog').open&&$('#folder-action')===ctx.root;
  confirm.onclick=async()=>{
   if(!active()||ctx.busy)return;const name=input?.value;ctx.busy=true;cancel.disabled=true;if(input)input.disabled=true;$('#dialog-error').textContent='';
   try{await action(confirm,async()=>{
    if(!ctx.written||!deleting&&name!==ctx.writtenName){
     await refresh();if(!active())return;
     if(!libraryData.folders.some(f=>f.id===target.id))throw Error('这个文件夹已不存在，请关闭后重新查看。');
     await api('/api/folders/'+target.id,deleting?'DELETE':'PATCH',deleting?undefined:{name});if(!active())return;ctx.written=true;ctx.writtenName=name;
    }
    await refresh();if(!active())return;
    if(current){const material=getItem(current.id);if(material)current=material}
    if(deleting&&folder===target.id)folder='uncategorized';
    ctx.busy=false;folderAction=null;closeDialog();
    if(screen==='library'){listY=window.scrollY;library();const focus=document.querySelector(`[data-folder-menu="${target.id}"]`)||document.querySelector(`[data-folder="${folder}"]`);focus?.focus({preventScroll:true})}
    toast(deleting?'文件夹已删除，资料已保留':'文件夹名称已更新');
   },message=>{if(active())dialogError(ctx.written?'操作已保存，但资料库刷新未确认；请重试刷新。'+message:message)})}
   finally{ctx.busy=false;if(active()){cancel.disabled=false;if(input)input.disabled=false}}
  };
  if(input){input.onkeydown=event=>{if(event.key==='Enter'&&!event.isComposing){event.preventDefault();confirm.click()}};input.focus();input.select()}
 });
}
$('#dialog').addEventListener('cancel',event=>{if(folderPopover){event.preventDefault();closeFolderPopover(true)}else if(folderAction?.busy)event.preventDefault()});

function moveItem(id){const x=getItem(id);openDialog(`<h2 id="dialog-title">移动到文件夹</h2><p class="small muted">${esc(x.title)}</p><div class="menu">${[{id:'',name:blank},...libraryData.folders].map(f=>`<button data-target-folder="${f.id}" data-target-id="${id}">${esc(f.name)}${f.id===(x.folderId||'')?' ✓':''}</button>`).join('')}</div><div class="actions"><button data-action="close-dialog">取消</button></div>`)}
function acceptMaterial(material){
 const index=libraryData.materials.findIndex(x=>x.id===material.id);if(index>=0)libraryData.materials[index]=material;
 if(current?.id===material.id){current=material;const title=$('.reader-title');if(title)title.textContent=material.title}
}
const readingLabels={unread:'未读',reading:'在读',read:'已读'};
let statusFilter='all',notesEditor=null;
function statusFilters(){return `<div class="status-filter" role="group" aria-label="阅读状态筛选">${Object.entries({all:'全部',...readingLabels}).map(([value,label])=>`<button data-status-filter="${value}" aria-pressed="${statusFilter===value}">${label}</button>`).join('')}</div>`}
function filterStatus(value){if(!Object.hasOwn({all:'全部',...readingLabels},value))return;statusFilter=value;document.querySelectorAll('[data-status-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.statusFilter===value)));renderList()}
async function setReadingStatus(id,value,button){
 if(!Object.hasOwn(readingLabels,value))return;
 await action(button,async()=>{const material=await api('/api/materials/'+id,'PATCH',{readingStatus:value});acceptMaterial(material);closeDialog();if(screen==='library')renderList();toast('已标记为'+readingLabels[value])});
}
const notesActive=ctx=>notesEditor===ctx&&$('#dialog').open&&$('#notes-text')===ctx.input;
function notesFeedback(ctx,message,error=false){if(!notesActive(ctx))return;const el=$('#notes-feedback');el.textContent=message;el.classList.toggle('is-error',error)}
function showNotesPrompt(next){
 const ctx=notesEditor;if(!ctx)return;if(ctx.busy){notesFeedback(ctx,'正在保存，请等待结果后关闭。');return}
 ctx.afterClose=next;$('#notes-confirm').hidden=false;$('#notes-continue').focus();
}
async function editNotes(id){
 if(notesEditor){showNotesPrompt(()=>{closeDialog(true);editNotes(id)});return}
 const origin=$('#dialog-body').firstElementChild;
 const material=await api('/api/materials/'+id);if(!$('#dialog').open||$('#dialog-body').firstElementChild!==origin)return;
 acceptMaterial(material);
 openDialog(`<section class="notes-editor"><h2 id="dialog-title">个人备注</h2><p class="small muted notes-title">${esc(material.title)}</p><label class="field-label" for="notes-text">为什么保存这份资料？读后有什么收获？</label><textarea id="notes-text" maxlength="8000" aria-describedby="notes-count notes-download-note">${esc(material.notes)}</textarea><div class="row between small muted"><span id="notes-count">${material.notes.length} / 8000</span><span>仅保存在本机</span></div><p id="notes-feedback" class="notes-feedback" role="status" aria-live="polite">${material.notes?'已加载保存的备注。':'还没有填写备注。'}</p><div id="notes-confirm" class="notes-confirm" hidden><p>还有未保存的备注。</p><div class="row"><button id="notes-continue">继续编辑</button><button id="notes-discard" class="danger">放弃修改</button></div></div><p id="notes-download-note" class="small muted">导出只包含已保存的备注，尚未保存的内容不会下载。</p><div class="notes-toolbar"><button id="notes-export" class="quiet">导出 Markdown</button><div class="row actions"><button id="notes-close" data-action="close-dialog">关闭</button><button id="notes-save" class="primary" disabled>保存</button></div></div></section>`);
 const ctx=notesEditor={id,saved:material.notes,draft:material.notes,busy:false,input:$('#notes-text'),afterClose:null};
 ctx.input.oninput=()=>{if(!notesActive(ctx))return;ctx.draft=ctx.input.value;$('#notes-count').textContent=ctx.draft.length+' / 8000';$('#notes-save').disabled=ctx.draft===ctx.saved;notesFeedback(ctx,ctx.draft===ctx.saved?'与已保存的备注一致。':'有未保存的修改。')};
 $('#notes-continue').onclick=()=>{if(!notesActive(ctx))return;ctx.afterClose=null;$('#notes-confirm').hidden=true;ctx.input.focus()};
 $('#notes-discard').onclick=()=>{if(!notesActive(ctx)||ctx.busy)return;const next=ctx.afterClose;closeDialog(true);if(next)next()};
 $('#notes-save').onclick=()=>saveNotes(ctx);
 $('#notes-export').onclick=()=>downloadMarkdown(ctx);
 ctx.input.focus();
}
async function saveNotes(ctx){
 if(!notesActive(ctx)||ctx.busy||ctx.draft===ctx.saved)return;
 ctx.busy=true;ctx.input.disabled=true;$('#notes-save').disabled=true;$('#notes-export').disabled=true;notesFeedback(ctx,'正在保存…');
 try{
  const material=await api('/api/materials/'+ctx.id,'PATCH',{notes:ctx.draft},false,AbortSignal.timeout(120000));if(!notesActive(ctx))return;
  acceptMaterial(material);ctx.saved=material.notes;ctx.draft=material.notes;ctx.input.value=material.notes;ctx.afterClose=null;$('#notes-confirm').hidden=true;
  if(screen==='library')renderList();notesFeedback(ctx,'备注已保存。');
 }catch(error){if(notesActive(ctx))notesFeedback(ctx,'未保存成功，草稿已保留。'+error.message,true)}
 finally{if(notesActive(ctx)){ctx.busy=false;ctx.input.disabled=false;$('#notes-save').disabled=ctx.draft===ctx.saved;$('#notes-export').disabled=false}}
}
async function downloadMarkdown(ctx){
 if(!notesActive(ctx)||ctx.busy)return;const button=$('#notes-export');button.disabled=true;
 try{
  const response=await fetch('/api/materials/'+ctx.id+'/markdown',{signal:AbortSignal.timeout(120000)});if(!response.ok)throw Error('导出未完成，请重试。');const blob=await response.blob();if(!notesActive(ctx))return;
  const url=URL.createObjectURL(blob),link=document.createElement('a'),encoded=response.headers.get('content-disposition')?.match(/filename\*=UTF-8''([^;]+)/)?.[1];
  link.href=url;link.download=encoded?decodeURIComponent(encoded):'PageNest-notes.md';link.hidden=true;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  notesFeedback(ctx,ctx.draft!==ctx.saved?'已导出已保存的备注；当前草稿尚未保存。':'已导出 Markdown。');
 }catch(error){if(notesActive(ctx))notesFeedback(ctx,error.message,true)}
 finally{if(notesActive(ctx))button.disabled=false}
}
$('#dialog').addEventListener('cancel',event=>{if(notesEditor){event.preventDefault();closeDialog()}});

function itemMenu(id){const x=getItem(id);openDialog(`<h2 id="dialog-title">资料操作</h2><p class="small muted">${esc(x.title)}</p><div class="status-actions" role="group" aria-label="阅读状态">${Object.entries(readingLabels).map(([value,label])=>`<button data-reading-status="${value}" data-id="${id}" aria-pressed="${x.readingStatus===value}" aria-label="标记为${label}">${label}</button>`).join('')}</div><div class="menu"><button data-notes="${id}">个人备注</button><a class="button-link" href="/api/materials/${id}/markdown" download>导出 Markdown（已保存备注）</a><button data-move="${id}">移动到文件夹</button><button data-edit="${id}">编辑标题与分类</button><button data-source="${id}">补充或编辑原文</button><a class="button-link" href="/api/files/${x.htmlFileId}/download" download>下载 HTML</a>${x.sourceFileId?`<a class="button-link" href="/api/files/${x.sourceFileId}/download" download>下载原文文件</a>`:''}<button class="danger" data-trash="${id}">移到回收站</button></div><div class="actions"><button data-action="close-dialog">关闭</button></div>`)}
function editItem(id){const x=getItem(id);openDialog(`<h2 id="dialog-title">编辑资料</h2><div class="field"><label for="edit-title">标题</label><input id="edit-title" value="${esc(x.title)}" maxlength="120"></div><div class="field"><label for="edit-folder">文件夹</label><select id="edit-folder">${options(x.folderId)}</select></div><div id="dialog-error" class="error" role="alert"></div><div class="row actions"><button id="edit-save" class="primary">保存</button><button data-action="close-dialog">取消</button></div>`);$('#edit-save').onclick=e=>action(e.target,async()=>{const updated=await api('/api/materials/'+id,'PATCH',{title:$('#edit-title').value,folderId:$('#edit-folder').value||null});await refresh();closeDialog();if(screen==='reader'){current=updated;reader()}else library();toast('资料已更新')})}
let batchDraft=null;
const batchActive=ctx=>batchDraft===ctx&&screen==='batch-import';
const batchTitle=file=>file.name.replace(/\.html?$/i,'').trim().slice(0,120)||'未命名 HTML';
function batchSelectionError(message){const el=$('#import-error')||$('#batch-error');if(el)el.textContent=message;else toast(message)}
function startBatch(files){
 if(files.length>20){batchSelectionError('每批最多 20 份，请减少文件后重试。');return}
 if(files.reduce((n,f)=>n+f.size,0)>100*1024*1024){batchSelectionError('每批总大小最多 100 MiB，请分成较小批次。');return}
 if(batchDraft?.busy||draft?.saving)return;
 const selectedFolder=draft?.folderId??batchDraft?.folderId??(isCustom()?folder:'');
 const begin=()=>{draft=null;batchDraft={rows:files.map(file=>({file,title:batchTitle(file),requestId:crypto.randomUUID(),state:'pending',error:'',warnings:[],accepted:false,inspected:false,retryable:true,materialId:null})),folderId:selectedFolder,busy:false,cancel:false,started:false,libraryReady:false,message:''};renderBatch();window.scrollTo(0,0);runBatchChecks(batchDraft)};
 if(draft?.dirty&&draft.html){const prior=draft;openDialog('<h2 id="dialog-title">转为批量导入？</h2><p>当前单份的标题和原文不会自动配对到多份文件。批量保存后可逐份补充原文。</p><div class="actions row"><button id="batch-switch" class="primary">转为批量</button><button data-action="close-dialog">保留单份</button></div>');$('#batch-switch').onclick=()=>{if(draft===prior&&!prior.saving){closeDialog();begin()}}}else begin();
}
function renderBatch(){
 const ctx=batchDraft;if(!ctx)return;invalidateSearch();screen='batch-import';document.title='PageNest · 批量导入';
 const count=state=>ctx.rows.filter(r=>r.state===state).length,ready=count('ready');
 const labels={pending:'待检查',checking:'检查中',ready:'待保存',warning:'需确认资源',saving:'保存中',saved:'已保存',skipped:'重复已跳过',error:'失败',cancelled:'未开始，已停止'};
 $('#screen').innerHTML=`<main class="form-page batch-page" id="main-content" tabindex="-1"><button class="quiet" data-action="batch-back" ${ctx.busy?'disabled':''}>← 返回资料库</button><h1>批量导入 HTML</h1><p class="muted">逐份保存，不覆盖已有资料。原文可在保存后单独补充。</p><div class="field"><label for="batch-folder">统一保存到</label><select id="batch-folder" ${ctx.busy||ctx.started?'disabled':''}>${options(ctx.folderId)}</select><p class="small muted">保存开始后本批分类固定；已保存资料不受停止影响。</p></div><div class="batch-summary" role="status">已保存 ${count('saved')} · 跳过 ${count('skipped')} · 失败 ${count('error')} · 待确认 ${count('warning')}</div><div class="batch-list">${ctx.rows.map((r,i)=>`<article class="batch-row" data-row="${i}"><div class="batch-row-head"><strong>${esc(r.title)}</strong><span class="batch-state state-${r.state}">${labels[r.state]}</span></div><p class="small muted batch-name">${esc(r.file.name)} · ${Math.ceil(r.file.size/1024)} KB</p>${r.error?`<p class="error">${esc(r.error)}</p>`:''}${r.warnings.length?`<p class="small muted">${r.warnings.map(esc).join('；')}</p>`:''}<div class="row batch-row-actions">${r.state==='warning'?`<button data-action="batch-preview" data-index="${i}" ${ctx.busy?'disabled':''}>预览并确认这份</button>`:''}${['error','cancelled','pending'].includes(r.state)&&r.retryable?`<button data-action="batch-retry" data-index="${i}" ${ctx.busy?'disabled':''}>${ctx.started?'重试导入':'重新检查'}</button>`:''}${r.state==='saved'&&ctx.libraryReady?`<button class="quiet" data-open="${r.materialId}" ${ctx.busy?'disabled':''}>打开资料</button>`:''}</div></article>`).join('')}</div><p class="small muted batch-message" role="status">${esc(ctx.message)}</p><p class="error" id="batch-error" role="alert"></p><input id="html-file" type="file" accept=".html,.htm" multiple hidden><div class="row form-footer"><button class="primary" data-action="batch-save" ${ctx.busy||!ready?'disabled':''}>保存可导入的 ${ready} 份</button>${ctx.busy?'<button data-action="batch-stop">停止剩余项</button>':'<button data-action="choose-html">另选文件</button>'}</div><p class="small muted">最多 20 份，每份 20 MiB、总计 100 MiB。也可将文件拖到这里。</p></main>`;
 $('#batch-folder').onchange=e=>ctx.folderId=e.target.value;$('#html-file').onchange=e=>chooseHTMLFiles(e.target.files);
}
async function inspectBatchRow(ctx,row){
 if(!/\.html?$/i.test(row.file.name)||!row.file.size||row.file.size>20*1024*1024){row.state='error';row.retryable=false;row.error='请选择非空、最多 20 MiB 的 .html / .htm 文件。';return}
 const token=Symbol();row.inspection=token;row.state='checking';row.error='';renderBatch();
 try{const result=await inspectFile(row.file,false,AbortSignal.timeout(120000));if(!batchActive(ctx)||row.inspection!==token)return;if(JSON.stringify(row.warnings)!==JSON.stringify(result.warnings))row.accepted=false;row.title=(result.title||batchTitle(row.file)).slice(0,120);row.warnings=result.warnings;row.previewUrl=result.previewUrl;row.inspected=true;row.state=row.warnings.length&&!row.accepted?'warning':'ready'}
 catch(e){if(!batchActive(ctx)||row.inspection!==token)return;row.state='error';row.error=e.message;row.inspected=false}
}
async function finishBatchWork(ctx){
 if(!batchActive(ctx))return;
 if(ctx.cancel){for(const row of ctx.rows)if(['pending','ready'].includes(row.state))row.state='cancelled';ctx.message='已停止尚未开始的处理；已保存资料保留，可重试剩余项。'}
 try{const data=await api('/api/library','GET',undefined,false,AbortSignal.timeout(120000));if(!batchActive(ctx))return;libraryData=data;ctx.libraryReady=true}catch(e){if(batchActive(ctx)){ctx.libraryReady=false;ctx.message+=' 资料库刷新未确认，请返回后重新加载。'}}
 if(batchActive(ctx)){ctx.busy=false;renderBatch()}
}
async function runBatchChecks(ctx){
 ctx.busy=true;ctx.cancel=false;ctx.message='正在逐份检查…';renderBatch();
 try{for(const row of ctx.rows){if(ctx.cancel||!batchActive(ctx))break;await inspectBatchRow(ctx,row)}if(!ctx.cancel)ctx.message='检查完成。外部资源需按文件预览确认，其余可保存。'}finally{await finishBatchWork(ctx)}
}
async function saveBatchRow(ctx,row){
 row.state='saving';row.error='';row.payload??={title:row.title,folderId:ctx.folderId};renderBatch();
 const form=new FormData();form.set('html',row.file,row.file.name);form.set('requestId',row.requestId);form.set('title',row.payload.title);form.set('folderId',row.payload.folderId);form.set('sourceUrl','');form.set('acceptExternal',String(row.accepted));
 try{const result=await api('/api/import','POST',form,false,AbortSignal.timeout(120000));if(!batchActive(ctx))return;row.state='saved';row.materialId=result.material.id;row.title=result.material.title}
 catch(e){if(!batchActive(ctx))return;if(e.code==='duplicate'){row.state='skipped';row.materialId=e.materialId;row.error='原资料保持不变。'}else if(e.code==='external_resources'){row.state='warning';row.warnings=e.warnings||[];row.accepted=false;row.error=e.message}else{row.state='error';row.error=e.message}}
}
async function saveBatch(){
 const ctx=batchDraft;if(!batchActive(ctx)||ctx.busy)return;ctx.busy=true;ctx.started=true;ctx.cancel=false;ctx.message='正在逐份保存…';const rows=ctx.rows.filter(r=>r.state==='ready');renderBatch();
 try{for(const row of rows){if(ctx.cancel||!batchActive(ctx))break;await saveBatchRow(ctx,row)}if(!ctx.cancel)ctx.message='本轮保存结束。已保存与重复条目不再重导。'}finally{await finishBatchWork(ctx)}
}
async function retryBatch(index){
 const ctx=batchDraft,row=ctx?.rows[index];if(!batchActive(ctx)||ctx.busy||!row?.retryable||!['pending','error','cancelled'].includes(row.state))return;ctx.busy=true;ctx.cancel=false;ctx.message='正在重试这份文件…';renderBatch();
 try{if(!row.inspected)await inspectBatchRow(ctx,row);else row.state=row.warnings.length&&!row.accepted?'warning':'ready';if(ctx.started&&row.state==='ready'&&!ctx.cancel)await saveBatchRow(ctx,row);if(!ctx.cancel)ctx.message='重试已完成；未确认资源不会自动保存。'}finally{await finishBatchWork(ctx)}
}
async function previewBatch(index){
 const ctx=batchDraft,row=ctx?.rows[index];if(!batchActive(ctx)||ctx.busy||row?.state!=='warning')return;ctx.busy=true;renderBatch();
 try{await inspectBatchRow(ctx,row);if(!batchActive(ctx)||ctx.cancel||row.state!=='warning')return;openDialog(`<h2 id="dialog-title">确认这份资源</h2><p class="small muted">${esc(row.file.name)} · 外部资源与联网禁用，请确认正文可读。</p><iframe id="batch-preview-frame" class="preview-frame" title="受限预览" sandbox="allow-scripts" src="${esc(row.previewUrl)}"></iframe><div class="row actions"><button id="batch-preview-accept" class="primary" disabled>已查看，允许导入这份</button><button data-action="close-dialog">暂不导入</button></div>`);const frame=$('#batch-preview-frame'),button=$('#batch-preview-accept');frame.onload=()=>{if(batchActive(ctx)&&$('#batch-preview-frame')===frame)button.disabled=false};button.onclick=()=>{if(batchActive(ctx)&&$('#batch-preview-frame')===frame){row.accepted=true;row.state='ready';row.error='';closeDialog();renderBatch()}}}
 finally{if(batchActive(ctx)){if(ctx.cancel)ctx.message='已停止预览，该文件仍需确认，尚未保存。';ctx.busy=false;renderBatch()}}
}
function stopBatch(){const ctx=batchDraft;if(!ctx?.busy)return;ctx.cancel=true;ctx.message='正在等当前请求的结果，随后停止剩余项；当前请求最多等待两分钟。';renderBatch()}
function backFromBatch(){const ctx=batchDraft;if(ctx?.busy)return;if(ctx?.rows.some(r=>!['saved','skipped'].includes(r.state))){openDialog('<h2 id="dialog-title">结束这批导入？</h2><p>已保存资料保留，未完成文件将结束本页处理。</p><div class="row actions"><button id="batch-leave">结束并返回</button><button class="primary" data-action="close-dialog">继续处理</button></div>');$('#batch-leave').onclick=()=>{closeDialog();batchDraft=null;library()}}else{batchDraft=null;library()}}

async function chooseHTMLFiles(files){
 files=Array.from(files);if(!files.length||batchDraft?.busy||draft?.saving)return;
 if(files.length>1){startBatch(files);return}
 if(screen==='batch-import'||!draft){batchDraft=null;startImport()}
 await selectHTML(files);
}
function importError(message){const el=$('#import-error');if(el)el.textContent=message}
function startImport(){listY=window.scrollY;draft={html:null,source:null,title:'',folderId:isCustom()?folder:'',sourceUrl:'',sourceOpen:false,requestId:crypto.randomUUID(),dirty:false,warnings:[],accepted:false,previewUrl:'',loading:false,saving:false};renderImport();window.scrollTo(0,0)}
function warningHTML(d){return d.warnings.length?`<div class="warning"><strong>此文件引用其他资源，部分内容可能无法显示</strong><ul>${d.warnings.map(w=>`<li>${esc(w)}</li>`).join('')}</ul>${d.previewUrl?'<button data-action="limited-preview">查看受限预览</button>':''}<label><input id="accept-external" type="checkbox" ${d.accepted?'checked':''}> 我已查看受限预览，仍继续导入</label></div>`:''}
function renderImport(){invalidateSearch();screen='import';document.title='PageNest · 导入';$('#screen').innerHTML=`<main class="form-page" id="main-content" tabindex="-1"><button class="quiet" data-action="cancel-import" ${draft.saving?'disabled':''}>← 返回资料库</button><h1>导入 HTML</h1><p class="muted">HTML 只需导入一次；原文文件和来源链接可以以后补。</p>${draft.html?`<div class="file-ready row between"><div class="grow"><strong>${esc(draft.html.name)}</strong><p class="small muted">${Math.ceil(draft.html.size/1024)} KB · ${draft.loading?'正在检查…':'已选择，尚未保存'}</p></div><button class="quiet" data-action="choose-html" ${draft.saving?'disabled':''}>更换文件</button></div>`:'<div class="drop" id="dropzone"><span class="filemark" style="margin:0 auto 18px" aria-hidden="true">HTML</span><strong>从一份整理好的页面开始</strong><p>拖放或选择 HTML；多份将进入批量导入，单份最多 20 MiB。</p><button class="primary" data-action="choose-html">选择 HTML 文件</button></div>'}<input id="html-file" type="file" accept=".html,.htm" multiple hidden><div class="field"><label for="import-title">标题</label><input id="import-title" maxlength="120" value="${esc(draft.title)}" placeholder="选择文件后自动填写" ${draft.html?'':'disabled'}></div><div class="field"><label for="import-folder">保存到</label><div class="field-inline"><select id="import-folder">${options(draft.folderId)}</select><button data-action="draft-folder" ${draft.saving?'disabled':''}>＋ 新建</button></div></div><details id="source-options" class="source-options" ${draft.sourceOpen||draft.source||draft.sourceUrl?'open':''}><summary>附上来源资料<span class="optional">可选</span></summary><div class="field"><span class="field-label">原文文件</span><input id="source-file" type="file" accept=".pdf,.txt,.html,.htm" hidden ${draft.saving?'disabled':''}><div class="source-pick"><button data-action="choose-source" ${draft.saving?'disabled':''}>${draft.source?'更换原文文件':'选择原文文件'}</button>${draft.source?`<span class="grow small">已选择：${esc(draft.source.name)}</span><button class="quiet" data-action="remove-draft-source">移除</button>`:''}</div><p class="small muted">一份 PDF / TXT / HTML，最多 50 MB；无需再次上传上面的 HTML。</p></div><div class="field"><label for="source-url">原文链接<span class="optional">可选</span></label><input id="source-url" type="url" inputmode="url" placeholder="https://…" value="${esc(draft.sourceUrl)}"><p class="small muted">只接受 HTTPS；保存链接不代表保存网页正文。</p></div></details>${warningHTML(draft)}<div class="error" id="import-error" role="alert"></div><div class="row form-footer"><button id="save-import" class="primary" ${!draft.html||draft.loading||draft.saving?'disabled':''}>${draft.saving?'正在保存…':'保存并阅读'}</button><button data-action="cancel-import" ${draft.saving?'disabled':''}>取消</button></div></main>`;for(const [sel,key] of [['#import-title','title'],['#import-folder','folderId'],['#source-url','sourceUrl']])$(sel).oninput=e=>{draft[key]=e.target.value;draft.dirty=true;if(key==='sourceUrl'&&draft.sourceUrl)draft.sourceOpen=true};$('#source-options').ontoggle=e=>{draft.sourceOpen=e.target.open};$('#html-file').onchange=e=>chooseHTMLFiles(e.target.files);$('#source-file').onchange=e=>selectSource(e.target.files);if($('#accept-external'))$('#accept-external').onchange=e=>draft.accepted=e.target.checked;$('#save-import').onclick=saveImport;}
async function inspectFile(file,sourceMode=false,signal){const form=new FormData();form.set(sourceMode?'source':'html',file,file.name);return api('/api/inspect','POST',form,false,signal)}
async function selectHTML(files){
 if(files.length!==1){importError('第一版一次导入一个文件。');return}
 const file=files[0];if(!/\.html?$/i.test(file.name)||file.size>20*1024*1024){importError('请选择不超过 20 MB 的 .html / .htm 文件。');return}
 const context=draft,request=Symbol();context.htmlInspection=request;context.html=file;context.title=context.title||file.name.replace(/\.html?$/i,'');context.dirty=true;context.loading=true;context.accepted=false;renderImport();
 try{
  const result=await inspectFile(file);
  if(draft!==context||context.html!==file||context.htmlInspection!==request)return;
  context.title=result.title||file.name.replace(/\.html?$/i,'');context.warnings=result.warnings;context.previewUrl=result.previewUrl;context.loading=false;renderImport();
 }catch(e){
  if(draft!==context||context.html!==file||context.htmlInspection!==request)return;
  context.html=null;context.loading=false;renderImport();importError(e.message);
 }
}
async function selectSource(files){
 if(files.length!==1)return;
 const file=files[0];if(!/\.(pdf|txt|html?|htm)$/i.test(file.name)||file.size>50*1024*1024){importError('原文须为不超过 50 MB 的 PDF / TXT / HTML。');return}
 const context=draft,request=Symbol();context.sourceInspection=request;context.source=file;context.sourceOpen=true;context.dirty=true;
 try{
  if(/\.html?$/i.test(file.name)){
   const result=await inspectFile(file,true);
   if(draft!==context||context.source!==file||context.sourceInspection!==request)return;
   context.warnings=[...new Set([...context.warnings,...result.warnings.map(w=>'原文：'+w)])];
   if(result.warnings.length){context.previewUrl=result.previewUrl;context.accepted=false}
  }
  if(draft!==context||context.source!==file||context.sourceInspection!==request)return;
  renderImport();
 }catch(e){
  if(draft!==context||context.source!==file||context.sourceInspection!==request)return;
  context.source=null;renderImport();importError(e.message);
 }
}

async function saveImport(){if(!draft.html)return;if(!draft.title.trim()){importError('请填写标题。');return}if(draft.warnings.length&&!draft.accepted){importError('请先查看受限预览，确认继续导入。');return}const context=draft;context.saving=true;renderImport();const form=new FormData();for(const key of ['title','folderId','sourceUrl','requestId'])form.set(key,context[key]);form.set('html',context.html,context.html.name);if(context.source)form.set('source',context.source,context.source.name);form.set('acceptExternal',String(context.accepted));try{const result=await api('/api/import','POST',form);await refresh();draft=null;await openReader(result.material.id);toast(result.replayed?'已确认上次保存结果':'资料已保存')}catch(e){if(draft!==context)return;context.saving=false;if(e.code==='external_resources'){context.warnings=e.warnings||[];context.accepted=false;const sourceHTML=context.source&&/\.html?$/i.test(context.source.name);const inspected=await inspectFile(sourceHTML?context.source:context.html,!!sourceHTML).catch(()=>null);if(inspected)context.previewUrl=inspected.previewUrl}renderImport();importError(e.message);if(e.code==='duplicate'){openDialog('<h2 id="dialog-title">这份资料已存在</h2><p>不会覆盖已有 HTML。可以打开原来的条目。</p><div class="row actions"><button id="open-existing" class="primary">打开已有资料</button><button data-action="close-dialog">返回导入</button></div>');$('#open-existing').onclick=event=>action(event.target,async()=>{const x=await api('/api/materials/'+e.materialId);if(x.deletedAt){dialogError('这份资料在回收站，请先恢复。');return}await refresh();draft=null;closeDialog();await openReader(e.materialId)})}}}
function cancelImport(){if(draft?.saving)return;if(draft?.dirty)openDialog('<h2 id="dialog-title">放弃这次导入？</h2><p>尚未保存的填写内容将被丢弃。</p><div class="row actions"><button data-action="discard-import" class="danger">放弃导入</button><button class="primary" data-action="close-dialog">继续填写</button></div>');else{draft=null;library()}}
function queueReading(id,which,state){dirtyReading.set(id+':'+which,{id,which,scrollTop:state.scrollTop||0,page:state.page||1});clearTimeout(readingTimer);readingTimer=setTimeout(()=>flushReading().catch(()=>toast('阅读位置未保存，请确认本机服务正在运行。')),550)}
async function flushReading(){
 clearTimeout(readingTimer);
 if(flushPromise){await flushPromise;if(dirtyReading.size)return flushReading();return}
 const batch=[...dirtyReading];
 // Keep every latest unconfirmed entry available to pagehide, including in-flight PUTs.
 flushPromise=(async()=>{
  for(const [key,data] of batch){
   await api(`/api/materials/${data.id}/reading/${data.which}`,'PUT',{scrollTop:data.scrollTop,page:data.page},true);
   if(dirtyReading.get(key)===data)dirtyReading.delete(key);
  }
 })();
 try{await flushPromise}finally{flushPromise=null}
 if(dirtyReading.size)return flushReading();
}

async function openReader(id){invalidateSearch();await flushReading();listY=screen==='library'?window.scrollY:listY;const data=await api('/api/materials/'+id+'/open','POST',{});current=data.material;acceptMaterial(data.material);positions={html:{scrollTop:0,page:1,...data.reading.html},source:{scrollTop:0,page:1,...data.reading.source}};view='html';fit=false;outlineState=null;reader();window.scrollTo(0,0);if(positions.html.scrollTop)toast('已回到上次阅读处')}
function frameHTML(id){return `<iframe id="reader-frame" class="document-frame" title="${view==='html'?'HTML 内容':'原文内容'}" sandbox="allow-scripts" src="/api/files/${id}/display"></iframe>`}
function readingBody(){const source=fileMeta(current.sourceFileId);if(view==='html')return `<div id="wide-notice" class="notice row between" hidden><span id="wide-label">此页面较宽，仅正文可横向查看。</span><button data-action="fit">适合屏幕</button></div><div id="read-scroll" class="read-scroll">${frameHTML(current.htmlFileId)}</div><div id="frame-fallback" class="frame-fallback" hidden>页面可能未正常显示。<button data-action="reload-frame">重试</button> <a href="/api/files/${current.htmlFileId}/download" download>下载 HTML</a> <button data-view="source">查看原文</button></div>`;
 const link=current.sourceUrl?`<div class="link-card"><strong>${esc(new URL(current.sourceUrl).hostname)}</strong><p>${esc(current.sourceUrl)}</p>${!source?'<p class="muted">尚未保存原文副本</p>':''}<a class="button-link" href="${esc(current.sourceUrl)}" target="_blank" rel="noopener noreferrer">打开原网站 ↗</a></div>`:'';
 if(!source)return `<div id="read-scroll" class="read-scroll">${link?'<div class="source-sheet">'+link+'<button data-action="add-source">补充原文</button></div>':'<div class="empty"><i class="empty-mark" aria-hidden="true"></i><h2>还没有添加原文</h2><p>可以补一份文件，或留下来源链接。</p><button class="primary" data-action="add-source">补充原文</button></div>'}</div>`;
 const pdf=source.mime==='application/pdf';return `<div class="source-bar"><div class="row between"><strong>${esc(source.name)}</strong><div class="row"><button class="quiet" data-action="add-source">编辑原文</button><a href="/api/files/${source.id}/download" download>下载原文件</a></div></div>${current.sourceUrl?`<a href="${esc(current.sourceUrl)}" target="_blank" rel="noopener noreferrer">打开原网站 ↗</a>`:''}${pdf?`<div class="row"><label for="pdf-page">跳到页码</label><input id="pdf-page" class="pdf-page" type="number" min="1" max="100000" value="${positions.source.page||1}"><button data-action="pdf-jump">跳转</button><a id="pdf-open" href="/api/files/${source.id}/raw#page=${positions.source.page||1}" target="_blank" rel="noopener">新窗口打开</a></div><p class="small muted">浏览器原生 PDF 预览；仅记住手动跳转页码，无法自动恢复页内位置。无法显示时请新窗口打开或下载。</p>`:''}</div><div id="read-scroll" class="read-scroll">${pdf?`<iframe id="pdf-frame" class="document-frame pdf" title="PDF 原文" src="/api/files/${source.id}/raw#page=${positions.source.page||1}"></iframe>`:frameHTML(source.id)}</div><div id="frame-fallback" class="frame-fallback" hidden>原文预览未就绪。<button data-action="reload-frame">重试</button> <a href="/api/files/${source.id}/download" download>下载原文件</a></div>`}
function reader(){invalidateSearch();screen='reader';document.title='PageNest · '+current.title;history.replaceState({folder,query,listY},'','#read/'+current.id);$('#screen').innerHTML=`<main class="reader" id="main-content" tabindex="-1"><div class="reader-top"><button class="quiet" data-action="back" aria-label="返回资料库">←<span class="reader-back-label"> 返回</span></button><button id="outline-toggle" class="quiet reader-outline-toggle" data-action="outline-toggle" aria-label="打开章节目录" aria-controls="reader-outline" aria-expanded="false">目录</button><div class="reader-title">${esc(current.title)}</div><div class="reader-actions"><div class="reader-tabs" data-active="${view==='html'?'HTML':'原文'}" role="group" aria-label="阅读内容"><span class="tabs-indicator" aria-hidden="true"></span><button data-view="html" class="${view==='html'?'selected':''}" aria-pressed="${view==='html'}">HTML</button><button data-view="source" class="${view==='source'?'selected':''}" aria-pressed="${view==='source'}">原文</button></div><button class="quiet reader-start" data-action="from-start" ${canReadCurrentView()?'':'disabled'} aria-label="从头阅读"><span class="reader-start-label">从头阅读</span><svg class="reader-start-icon" aria-hidden="true" viewBox="0 0 18 18"><path d="M4 3h10M9 15V6m-4 4 4-4 4 4"/></svg></button><button class="quiet reader-more" data-action="more">更多</button></div></div><div class="reader-content"><aside id="reader-outline" class="reader-outline" hidden><div class="outline-header"><h2>目录</h2><button class="quiet" data-action="outline-toggle" aria-label="收起章节目录">×</button></div><nav id="outline-items" aria-label="HTML 章节目录"></nav></aside><div class="reader-body">${readingBody()}</div></div></main>`;mountReading();mountOutline()}
function mountReading(){clearTimeout(frameTimeout);naturalWidth=0;frameReady=false;frameReported=false;const frame=$('#reader-frame'),scroller=$('#read-scroll');if(frame){frame.onload=()=>{frameReported=false;clearTimeout(frameTimeout);frameTimeout=setTimeout(()=>{if(frame===$('#reader-frame')&&!frameReported&&$('#frame-fallback'))$('#frame-fallback').hidden=false},4000);const target=frame;target.contentWindow.postMessage({channel:'pagenest-reading',type:'restore',scrollTop:positions[view].scrollTop},'*');setTimeout(()=>{if(target===$('#reader-frame')){frameReady=true;renderOutline()}},250)};frameTimeout=setTimeout(()=>{const fallback=$('#frame-fallback');if(fallback&&!frameReported)fallback.hidden=false},4000)}else if(scroller){scroller.scrollTop=positions[view].scrollTop;scroller.onscroll=()=>{positions[view].scrollTop=scroller.scrollTop;queueReading(current.id,view,positions[view])}}}
function applyFit(){const frame=$('#reader-frame'),area=$('#read-scroll');if(!frame||!area||!naturalWidth)return;const wide=naturalWidth>area.clientWidth+4;frame.style.width=wide?naturalWidth+'px':'100%';const zoom=fit&&wide?Math.min(1,area.clientWidth/naturalWidth):1;frame.style.zoom=zoom;frame.style.height=area.clientHeight/zoom+'px';if($('#wide-notice')){$('#wide-notice').hidden=!wide;$('#wide-label').textContent=fit?'适合屏幕 · 内容缩小展示':'固定宽度内容 · 仅正文可横向滚动';$('#wide-notice button').textContent=fit?'原始大小':'适合屏幕'}}
function canReadCurrentView(){return !!current&&(view==='html'||!!fileMeta(current.sourceFileId))}
async function fromStart(){
 if(!canReadCurrentView())return;
 const state=positions[view];state.scrollTop=0;
 const source=view==='source'?fileMeta(current.sourceFileId):null;
 if(source?.mime==='application/pdf'){
  state.page=1;const input=$('#pdf-page'),frame=$('#pdf-frame'),link=$('#pdf-open');
  if(input)input.value='1';if(frame)frame.src='/api/files/'+source.id+'/raw#page=1';if(link)link.href='/api/files/'+source.id+'/raw#page=1';
  const area=$('#read-scroll');if(area)area.scrollTop=0;
 }else $('#reader-frame')?.contentWindow.postMessage({channel:'pagenest-reading',type:'restore',scrollTop:0},'*');
 queueReading(current.id,view,state);await flushReading();
}
async function switchView(next){if(next===view)return;await flushReading();if($('#outline-dialog'))closeDialog();view=next;$('.reader-start').disabled=!canReadCurrentView();const tabs=$('.reader-tabs');tabs.dataset.active=view==='html'?'HTML':'原文';tabs.querySelectorAll('[data-view]').forEach(button=>{const selected=button.dataset.view===view;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected))});$('.reader-body').innerHTML=readingBody();mountReading();renderOutline()}
window.addEventListener('message',event=>{const frame=$('#reader-frame'),m=event.data;if(!frame||screen!=='reader'||event.source!==frame.contentWindow||event.origin!=='null'||!m||typeof m!=='object'||m.channel!=='pagenest-reading')return;if(m.type==='position'&&frameReady&&Number.isFinite(m.scrollTop)&&m.scrollTop>=0&&m.scrollTop<=10000000){positions[view].scrollTop=m.scrollTop;queueReading(current.id,view,positions[view])}else if(m.type==='size'&&Number.isFinite(m.width)&&m.width>=1&&m.width<=20000&&Number.isFinite(m.height)&&m.height>=1&&m.height<=10000000){frameReported=true;if($('#frame-fallback'))$('#frame-fallback').hidden=true;if(!naturalWidth)naturalWidth=m.width;else naturalWidth=Math.max(naturalWidth,m.width);applyFit()}});
let outlineState=null;
const outlineActive=ctx=>outlineState===ctx&&screen==='reader'&&current?.id===ctx.id;
function outlineContent(ctx){
 if(ctx.loading)return '<p class="outline-feedback" role="status">正在读取目录…</p>';
 if(ctx.error)return '<p class="outline-feedback" role="alert">目录暂时无法读取。</p><button class="quiet" data-action="outline-retry">重试</button>';
 if(!ctx.items.length)return '<p class="outline-feedback">这份 HTML 没有章节标题。</p>';
 return `<ol class="outline-list">${ctx.items.map(item=>`<li><button data-heading="${item.id}" style="--heading-level:${item.level}" ${frameReady?'':'disabled'} ${ctx.active===item.id?'aria-current="location"':''}>${esc(item.label)}</button></li>`).join('')}</ol>`;
}
function renderOutline(){
 const ctx=outlineState;if(!ctx||!outlineActive(ctx))return;
 const panel=$('#reader-outline'),toggle=$('#outline-toggle'),visible=view==='html'&&ctx.expanded&&matchMedia('(min-width:701px)').matches;
 if(panel){
  const resized=panel.hidden!==!visible;panel.hidden=!visible;
  if(resized){const frame=$('#reader-frame');if(frame){naturalWidth=0;frame.style.width='100%';frame.style.zoom=1;frame.style.height='100%';if($('#wide-notice'))$('#wide-notice').hidden=true}}
 }
 if(toggle){toggle.hidden=view!=='html';toggle.setAttribute('aria-expanded',String(visible||!!$('#outline-dialog')));toggle.setAttribute('aria-label',visible?'收起章节目录':'打开章节目录')}
 const html=outlineContent(ctx);if($('#outline-items'))$('#outline-items').innerHTML=html;
 if($('#outline-drawer-items')&&view==='html')$('#outline-drawer-items').innerHTML=html;
 applyFit();
}
async function loadOutline(ctx){
 if(!outlineActive(ctx)||ctx.loading)return;ctx.loading=true;ctx.error='';renderOutline();
 try{
  const result=await api('/api/materials/'+ctx.id+'/outline','GET',undefined,false,AbortSignal.timeout(120000));
  if(!outlineActive(ctx))return;
  const ids=new Set();if(!Array.isArray(result.outline)||result.outline.length>200)throw Error('目录格式无效。');
  for(const item of result.outline){if(!item||typeof item.id!=='string'||!/^pn-heading-[0-9]{1,3}$/.test(item.id)||ids.has(item.id)||typeof item.label!=='string'||!item.label.trim()||Array.from(item.label).length>200||!Number.isInteger(item.level)||item.level<1||item.level>6)throw Error('目录格式无效。');ids.add(item.id)}
  ctx.items=result.outline;ctx.loaded=true;
 }catch(error){if(outlineActive(ctx))ctx.error=error.message}
 finally{if(outlineActive(ctx)){ctx.loading=false;renderOutline()}}
}
function mountOutline(){
 if(!outlineState||outlineState.id!==current.id)outlineState={id:current.id,items:[],loaded:false,loading:false,error:'',expanded:matchMedia('(min-width:701px)').matches,active:''};
 renderOutline();if(!outlineState.loaded&&!outlineState.loading&&!outlineState.error)loadOutline(outlineState);
}
function toggleOutline(){
 const ctx=outlineState;if(!ctx||view!=='html'||!outlineActive(ctx))return;
 if(matchMedia('(max-width:700px)').matches){
  openDialog(`<section id="outline-dialog"><div class="outline-header"><h2 id="dialog-title">目录</h2><button class="quiet" data-action="close-dialog" aria-label="关闭章节目录">×</button></div><nav id="outline-drawer-items" aria-label="HTML 章节目录">${outlineContent(ctx)}</nav></section>`,true);
  $('#outline-toggle').setAttribute('aria-expanded','true');
 }else{ctx.expanded=!ctx.expanded;renderOutline();if(!ctx.expanded)$('#outline-toggle').focus()}
}
function jumpHeading(id){
 const ctx=outlineState,frame=$('#reader-frame');
 if(!ctx||!outlineActive(ctx)||view!=='html'||!frameReady||!frame||typeof id!=='string'||!/^pn-heading-[0-9]{1,3}$/.test(id)||!ctx.items.some(item=>item.id===id))return;
 frame.contentWindow.postMessage({channel:'pagenest-reading',type:'heading',id},'*');ctx.active=id;
 if($('#outline-dialog'))closeDialog();renderOutline();
}
$('#dialog').addEventListener('close',()=>{if($('#outline-toggle'))renderOutline()});

let sourceDraft;
function addSource(id=current?.id){const x=getItem(id)||current;sourceDraft={id,file:null,requestId:crypto.randomUUID(),warnings:[],accepted:false,previewUrl:''};openDialog(`<h2 id="dialog-title">补充原文</h2><p class="small muted">为同一条资料关联一份原文和来源链接。</p><div class="field"><label for="edit-source-file">原文文件<span class="optional">可选</span></label><input class="file-input" id="edit-source-file" type="file" accept=".pdf,.txt,.html,.htm">${x.sourceFileId?`<p class="small muted">当前：${esc(fileMeta(x.sourceFileId)?.name)}；选新文件后替换关联。</p><label class="row"><input type="checkbox" id="remove-source">移除当前原文关联</label>`:''}</div><div class="field"><label for="edit-url">HTTPS 来源链接<span class="optional">可选</span></label><input id="edit-url" type="url" value="${esc(x.sourceUrl)}" placeholder="https://…"></div><div id="source-warning"></div><div id="dialog-error" class="error" role="alert"></div><div class="row actions"><button id="source-save" class="primary">保存</button><button data-action="close-dialog">取消</button></div>`);$('#edit-source-file').onchange=async e=>{
 const input=e.target,file=input.files[0];if(!file)return;
 if(!/\.(pdf|txt|html?)$/i.test(file.name)||file.size>50*1024*1024){dialogError('原文须为不超过 50 MB 的 PDF / TXT / HTML。');return}
 const context=sourceDraft,request=Symbol();context.inspection=request;context.file=file;
 if(/\.html?$/i.test(file.name)){
  try{
   const result=await inspectFile(file,true);
   if(sourceDraft!==context||context.file!==file||context.inspection!==request||$('#edit-source-file')!==input)return;
   context.warnings=result.warnings;context.previewUrl=result.previewUrl;$('#source-warning').innerHTML=warningHTML(context);
   if($('#accept-external'))$('#accept-external').onchange=e=>context.accepted=e.target.checked;
  }catch(error){
   if(sourceDraft!==context||context.file!==file||context.inspection!==request||$('#edit-source-file')!==input)return;
   context.file=null;input.value='';dialogError(error.message);
  }
 }
};$('#source-save').onclick=e=>action(e.target,async()=>{if(sourceDraft.warnings.length&&!sourceDraft.accepted)throw Error('请查看受限预览，确认继续导入。');await flushReading();const form=new FormData();form.set('requestId',sourceDraft.requestId);form.set('sourceUrl',$('#edit-url').value);form.set('removeSource',String($('#remove-source')?.checked||false));form.set('acceptExternal',String(sourceDraft.accepted));if(sourceDraft.file)form.set('source',sourceDraft.file,sourceDraft.file.name);const updated=await api('/api/materials/'+id+'/source','POST',form);await refresh();closeDialog();if(screen==='reader'){current=updated;positions.source={scrollTop:0,page:1,...(await api('/api/materials/'+id+'/reading')).source};reader()}else library();toast('原文关联已更新')})}
async function backupResponse(path,options){
 let response;try{response=await fetch(path,options)}catch{throw Error('连接中断，操作结果尚未确认。可核对当前库后重试同一备份。')}
 if(!response.ok){const data=await response.json().catch(()=>({}));throw Error(data.error||'备份操作未完成，请重试。')}
 return response;
}
function backupDialog(){
 openDialog('<h2 id="dialog-title">备份与恢复</h2><section class="backup-section"><h3>导出整库</h3><p class="small muted">把全部原件、分类与阅读位置保存为一份 .pagenest 文件。</p><button id="backup-export">下载备份</button></section><section class="backup-section"><h3>从备份恢复</h3><label class="field-label" for="backup-file">选择 .pagenest 文件</label><input class="file-input" id="backup-file" type="file" accept=".pagenest"><p class="small muted">合并到当前资料库：相同 HTML 跳过，已有资料不覆盖。压缩备份最多 100 MiB。</p><button id="backup-restore" class="primary" disabled>确认合并恢复</button><p class="small muted">恢复期间关闭窗口不会撤销已确认的合并。</p></section><p id="backup-status" class="backup-status" role="status" aria-live="polite"></p><p id="dialog-error" class="error" role="alert"></p><div class="actions"><button data-action="close-dialog">关闭</button></div>');
 const exportButton=$('#backup-export'),restoreButton=$('#backup-restore'),input=$('#backup-file'),status=$('#backup-status'),error=$('#dialog-error');
 let file=null,busy=false;
 const active=()=>$('#dialog').open&&$('#backup-export')===exportButton&&$('#backup-file')===input;
 const setBusy=value=>{busy=value;exportButton.disabled=value;input.disabled=value;restoreButton.disabled=value||!file};
 input.onchange=()=>{if(!active()||busy)return;file=null;error.textContent='';status.textContent='';const chosen=input.files[0];if(chosen){if(!/\.pagenest$/i.test(chosen.name)||!chosen.size||chosen.size>100*1024*1024)error.textContent='请选择不超过 100 MiB 的 .pagenest 备份。';else file=chosen}setBusy(false)};
 exportButton.onclick=async()=>{
  if(busy||!active())return;setBusy(true);error.textContent='';status.textContent='正在生成备份…';
  try{const response=await backupResponse('/api/backup/export');const blob=await response.blob();if(!active())return;const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=response.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1]||'PageNest.pagenest';link.hidden=true;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent='备份已生成，下载已开始。'}
  catch(e){if(active()){status.textContent='';error.textContent=e.message}}
  finally{if(active())setBusy(false)}
 };
 restoreButton.onclick=async()=>{
  if(busy||!file||!active())return;setBusy(true);error.textContent='';status.textContent='正在校验并合并恢复…';
  try{const response=await backupResponse('/api/backup/restore',{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:file});const result=await response.json();if(!active())return;const data=await api('/api/library');if(!active())return;libraryData=data;library();status.textContent=`恢复完成：新增 ${result.added} 份资料，跳过 ${result.skipped} 份已有资料。`}
  catch(e){if(active()){status.textContent='';error.textContent=e.message}}
  finally{if(active())setBusy(false)}
 };
}
function categories(){openDialog(`<div class="row between"><div class="brand"><i class="brand-mark" aria-hidden="true"></i>PageNest</div><button class="quiet" data-action="close-dialog" aria-label="关闭分类">×</button></div><h2 id="dialog-title" class="hidden">分类</h2>${nav()}<button class="quiet" data-action="new-folder">＋ 新建文件夹</button><div style="margin-top:28px">${trashNav()}<button class="navitem backup-entry" data-action="backup">备份与恢复</button></div>`,true)}
function trashItem(id){const x=getItem(id);openDialog(`<h2 id="dialog-title">移到回收站？</h2><p>“${esc(x.title)}”可以在回收站恢复。</p><div class="row actions"><button id="trash-confirm" class="danger">移到回收站</button><button data-action="close-dialog">取消</button></div>`);$('#trash-confirm').onclick=e=>action(e.target,async()=>{await flushReading();await api('/api/materials/'+id,'PATCH',{deleted:true});await refresh();closeDialog();library();toast('已移入回收站',()=>restoreItem(id))})}
async function restoreItem(id){await api('/api/materials/'+id,'PATCH',{deleted:false});await refresh();library();toast('资料已恢复')}
async function limitedPreview(){const d=screen==='import'?draft:sourceDraft;if(!d?.previewUrl)return;if(screen!=='import'){if(!$('#source-preview')){const iframe=document.createElement('iframe');iframe.id='source-preview';iframe.className='preview-frame';iframe.title='原文受限预览';iframe.setAttribute('sandbox','allow-scripts');iframe.src=d.previewUrl;$('#source-warning').append(iframe)}return}openDialog(`<h2 id="dialog-title">受限预览</h2><p class="small muted">其他资源与联网已禁用；确认内容可读后再继续。</p><iframe class="preview-frame" title="受限预览" sandbox="allow-scripts" src="${esc(d.previewUrl)}"></iframe><button data-action="close-dialog">返回填写</button>`)}
async function handleClick(b){const d=b.dataset;if(d.folderMenu){folderMenu(b);return}if(d.folderOperation){chooseFolderOperation(b);return}if(d.statusFilter){filterStatus(d.statusFilter);return}if(d.readingStatus){await setReadingStatus(d.id,d.readingStatus,b);return}if(d.notes){await editNotes(d.notes);return}if(d.heading){jumpHeading(d.heading);return}if(d.folder){await flushReading();folder=d.folder;query='';listY=0;closeDialog();library();return}if(d.open){await openReader(d.open);return}if(d.menu){itemMenu(d.menu);return}if(d.move){moveItem(d.move);return}if(d.edit){editItem(d.edit);return}if(d.source){addSource(d.source);return}if(d.trash){trashItem(d.trash);return}if(d.restore){await restoreItem(d.restore);return}if(Object.hasOwn(d,'targetFolder')){const x=getItem(d.targetId),old=x.folderId;const updated=await api('/api/materials/'+x.id,'PATCH',{folderId:d.targetFolder||null});await refresh();closeDialog();if(screen==='reader'){current=updated;reader()}else library();toast('已移到 '+folderName(updated.folderId),async()=>{await api('/api/materials/'+x.id,'PATCH',{folderId:libraryData.folders.some(f=>f.id===old)?old:null});await refresh();if(screen==='reader'){current=getItem(x.id);reader()}else library();toast('已撤销移动')});return}if(d.view){await switchView(d.view);return}
 switch(d.action){case'clear-status-filter':filterStatus('all');break;case'outline-toggle':toggleOutline();break;case'outline-retry':await loadOutline(outlineState);break;case'new-folder':createFolder();break;case'draft-folder':createFolder(true);break;case'close-dialog':closeDialog();break;case'import':startImport();break;case'choose-html':$('#html-file').click();break;case'choose-source':$('#source-file').click();break;case'cancel-import':cancelImport();break;case'discard-import':draft=null;closeDialog();library();break;case'remove-draft-source':draft.source=null;draft.dirty=true;renderImport();break;case'clear-search':query='';library();break;case'retry-search':scheduleSearch(0);break;case'back':await flushReading();await refresh();library();break;case'fit':fit=!fit;applyFit();break;case'add-source':addSource();break;case'categories':categories();break;case'backup':backupDialog();break;case'batch-save':await saveBatch();break;case'batch-retry':await retryBatch(Number(d.index));break;case'batch-preview':await previewBatch(Number(d.index));break;case'batch-stop':stopBatch();break;case'batch-back':backFromBatch();break;case'rename-folder':renameFolder();break;case'delete-folder':deleteFolder();break;case'more':itemMenu(current.id);break;case'limited-preview':await limitedPreview();break;case'reload-frame':mountReading();const frame=$('#reader-frame');if(frame)frame.src=frame.src;break;case'from-start':await fromStart();break;case'pdf-jump':{const page=Number($('#pdf-page').value);if(!Number.isInteger(page)||page<1||page>100000)throw Error('请填写有效页码。');positions.source.page=page;queueReading(current.id,'source',positions.source);$('#pdf-frame').src='/api/files/'+current.sourceFileId+'/raw#page='+page;await flushReading();break}case'undo':{const undo=undoAction;undoAction=null;$('#toast').hidden=true;if(undo)await undo();break}}
}
document.addEventListener('click',e=>{if(e.target.closest('.skip-link')){e.preventDefault();$('#main-content')?.focus();return}const b=e.target.closest('button');if(!b||b.disabled)return;if(b.dataset.folderMenu)e.preventDefault();else if(folderPopover&&!folderPopover.popover.contains(b))closeFolderPopover();handleClick(b).catch(error=>{if($('#dialog').open)dialogError(error.message);else toast(error.message)})});
const fileDrop=e=>Array.from(e.dataTransfer?.types||[]).includes('Files')&&!e.target.closest('input[type=file]');
document.addEventListener('dragover',e=>{if(fileDrop(e))e.preventDefault()});
document.addEventListener('drop',e=>{if(!fileDrop(e))return;e.preventDefault();if($('#dialog').open||batchDraft?.busy||draft?.saving)return;const files=Array.from(e.dataTransfer.files);if(screen==='library')startImport();if(['library','import','batch-import'].includes(screen))chooseHTMLFiles(files)});
window.addEventListener('resize',()=>{if($('#outline-dialog')&&matchMedia('(min-width:701px)').matches)closeDialog();renderOutline();if($('#reader-frame')){naturalWidth=0;$('#reader-frame').style.width='100%';$('#reader-frame').style.zoom=1;$('#reader-frame').style.height='100%'}});
window.addEventListener('pagehide',()=>{for(const {id,which,scrollTop,page} of dirtyReading.values())fetch(`/api/materials/${id}/reading/${which}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({scrollTop,page}),keepalive:true}).catch(()=>{})});
(async()=>{try{const id=location.hash.match(/^#read\/([0-9a-f-]{36})$/)?.[1];await refresh();const previous=history.state;if(previous){folder=['all','recent','uncategorized','trash'].includes(previous.folder)||libraryData.folders.some(f=>f.id===previous.folder)?previous.folder:'all';query=typeof previous.query==='string'?previous.query.slice(0,120):'';listY=Number.isFinite(previous.listY)?Math.max(0,previous.listY):0}if(id&&getItem(id)&&!getItem(id).deletedAt)await openReader(id);else library()}catch(error){$('#screen').innerHTML='<div class="empty"><h2>资料库暂时无法打开</h2><p>'+esc(error.message)+'</p><button data-action="reload-app">重新加载</button></div>';document.querySelector('[data-action="reload-app"]').onclick=()=>location.reload()}})();

// Desktop-only renderer behavior; no preload, Node API or privileged message channel.
if(navigator.userAgent.includes('PageNestDesktop/1')){
 let pendingWrites=0;const browserFetch=window.fetch.bind(window);
 window.fetch=(...args)=>{
  const method=String(args[1]?.method||args[0]?.method||'GET').toUpperCase(),writing=!['GET','HEAD'].includes(method);
  if(writing)pendingWrites++;
  try{return browserFetch(...args).finally(()=>{if(writing)pendingWrites--})}catch(error){if(writing)pendingWrites--;throw error}
 };
 window.addEventListener('beforeunload',event=>{
  if(pendingWrites||folderAction?.busy||notesEditor&&(notesEditor.busy||notesEditor.draft!==notesEditor.saved)||draft?.dirty||draft?.saving||batchDraft?.busy||dirtyReading.size){event.preventDefault();event.returnValue=''}
 });
 document.addEventListener('click',event=>{
  const link=event.target.closest('a[href]');if(!event.isTrusted||!link)return;
  const url=new URL(link.href,location.href);
  if(url.protocol==='https:'){event.preventDefault();location.assign(url.href)}
  else if(url.origin===location.origin&&link.target==='_blank'&&/^\/api\/files\/[0-9a-f-]{36}\/raw$/.test(url.pathname)){event.preventDefault();const download=document.createElement('a');download.href=url.origin+url.pathname.replace(/\/raw$/,'/download');download.download='';download.click()}
 });
}
