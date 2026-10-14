const {app,BrowserWindow,Menu,dialog,shell,nativeImage}=require('electron');
const {mkdirSync,writeFileSync,renameSync,readFileSync,unlinkSync}=require('node:fs');
const path=require('node:path');
const {desktopPaths,navigation,networkAllowed,downloadAllowed,safeFilename}=require('./policy.cjs');
app.setName('PageNest');
let paths,configurationError;
try{
 paths=desktopPaths(path.join(app.getPath('appData'),'PageNest'),process.env.PAGENEST_DESKTOP_DATA_DIR);
 mkdirSync(paths.profileDir,{recursive:true,mode:0o700});app.setPath('userData',paths.profileDir);app.setPath('sessionData',paths.profileDir);
 const port=process.env.PAGENEST_DESKTOP_TEST_PORT;
 if(port){if(!process.env.PAGENEST_DESKTOP_DATA_DIR||!/^\d+$/.test(port)||Number(port)<1024||Number(port)>65535)throw Error('调试端口仅可用于显式隔离测试资料目录。');app.commandLine.appendSwitch('remote-debugging-address','127.0.0.1');app.commandLine.appendSwitch('remote-debugging-port',port)}
}catch(error){configurationError=error}
const primary=!configurationError&&app.requestSingleInstanceLock();
if(!primary&&!configurationError){app.quit()}else{
 let window,service,stopping=false,origin,externalPrompt=false;
 const downloads=new Set();const runtimeFile=paths&&path.join(paths.profileDir,'runtime.json');
 const removeRuntime=()=>{try{if(JSON.parse(readFileSync(runtimeFile,'utf8')).pid===process.pid)unlinkSync(runtimeFile)}catch{}};
 async function finishExit(code=0){
  if(stopping)return;stopping=true;
  // Let pagehide's bounded keepalive position requests reach the loopback server.
  await new Promise(r=>setTimeout(r,200));
  for(const item of downloads)try{item.cancel()}catch{}
  try{if(service)await service.close({timeoutMs:3000})}catch(error){console.error('PageNest close:',error.message)}
  removeRuntime();app.exit(code);
 }
 app.on('second-instance',()=>{if(window){if(window.isMinimized())window.restore();window.show();window.focus()}});
 app.on('before-quit',event=>{event.preventDefault();if(window&&!window.isDestroyed())window.close();else void finishExit()});
 app.on('window-all-closed',()=>void finishExit());
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{if(window&&!window.isDestroyed())window.destroy();void finishExit()});
 app.whenReady().then(async()=>{
  if(configurationError)throw configurationError;
  const {createApp}=await import('../src/server.js');service=createApp({dataDir:paths.dataDir});
  await new Promise((resolve,reject)=>{service.server.once('error',reject);service.server.listen(0,'127.0.0.1',resolve)});
  origin='http://127.0.0.1:'+service.server.address().port;
  const health=await fetch(origin+'/api/health',{signal:AbortSignal.timeout(5000)});if(!health.ok||(await health.json()).ok!==true)throw Error('本机资料服务未准备完成。');
  window=new BrowserWindow({width:1180,height:800,minWidth:320,minHeight:500,title:'PageNest',backgroundColor:'#f7f7f3',show:false,icon:path.join(__dirname,'icon.png'),webPreferences:{nodeIntegration:false,nodeIntegrationInWorker:false,nodeIntegrationInSubFrames:false,contextIsolation:true,sandbox:true,webSecurity:true,webviewTag:false,navigateOnDragDrop:false,allowRunningInsecureContent:false}});
  const contents=window.webContents,session=contents.session;
  contents.setUserAgent(contents.getUserAgent()+' PageNestDesktop/1');
  session.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));session.setPermissionCheckHandler(()=>false);session.setDevicePermissionHandler(()=>false);session.setDisplayMediaRequestHandler((_request,callback)=>callback({}));
  session.webRequest.onBeforeRequest((details,callback)=>callback({cancel:!networkAllowed(details.url,origin,details.resourceType)}));
  contents.setWindowOpenHandler(()=>({action:'deny'}));contents.on('will-attach-webview',event=>event.preventDefault());
  contents.on('will-frame-navigate',event=>{
   const decision=navigation({url:event.url,origin,isMainFrame:event.isMainFrame,fromMainFrame:event.initiator===contents.mainFrame});
   if(decision==='allow')return;event.preventDefault();
   if(decision==='external'&&!externalPrompt){contents.stop();externalPrompt=true;const url=event.url;
    dialog.showMessageBox(window,{type:'question',message:'在默认浏览器中打开来源？',detail:url,buttons:['取消','打开浏览器'],defaultId:0,cancelId:0}).then(({response})=>{if(response===1)return shell.openExternal(url)}).catch(error=>dialog.showErrorBox('来源未打开',error.message)).finally(()=>{externalPrompt=false});
   }
  });
  contents.on('will-redirect',event=>{if(navigation({url:event.url,origin,isMainFrame:event.isMainFrame,fromMainFrame:event.initiator===contents.mainFrame})!=='allow')event.preventDefault()});
  contents.on('will-prevent-unload',event=>{
   const choice=dialog.showMessageBoxSync(window,{type:'question',message:'保留当前窗口还是退出？',detail:'页面请求保留窗口。未保存的备注或尚未确认的操作可能丢失；已保存的资料不会回滚。',buttons:['保留窗口','退出'],defaultId:0,cancelId:0});
   if(choice===1)event.preventDefault();
  });
  session.on('will-download',(event,item,source)=>{
   if(source!==contents||!downloadAllowed(item.getURL(),origin)){event.preventDefault();return}
   downloads.add(item);item.setSaveDialogOptions({title:'保存 PageNest 文件',defaultPath:path.join(app.getPath('downloads'),safeFilename(item.getFilename()))});
   item.once('done',(_event,state)=>{downloads.delete(item);if(state==='interrupted'&&!stopping)dialog.showErrorBox('下载未完成','文件未完整保存，请重试。')});
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
   {label:'PageNest',submenu:[{role:'about'},{type:'separator'},{role:'quit'}]},
   {label:'编辑',submenu:[{role:'undo'},{role:'redo'},{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'}]},
   {label:'窗口',submenu:[{role:'minimize'},{role:'zoom'},{type:'separator'},{role:'front'},{role:'close'}]}
  ]));
  app.setAboutPanelOptions({applicationName:'PageNest',applicationVersion:app.getVersion(),copyright:'本机 HTML 阅读库'});app.dock?.setIcon(nativeImage.createFromPath(path.join(__dirname,'icon.png')));
  window.on('closed',()=>{window=null;void finishExit()});
  await window.loadURL(origin+'/#library');window.show();
  const temp=runtimeFile+'.tmp';writeFileSync(temp,JSON.stringify({pid:process.pid,origin,dataDir:paths.dataDir,versions:process.versions,arch:process.arch,appPath:app.getAppPath()})+'\n',{mode:0o600});renameSync(temp,runtimeFile);
 }).catch(error=>{dialog.showErrorBox('PageNest 启动失败',error.message);void finishExit(1)});
}
