// Runs inside the opaque sandbox; this channel reports reading facts only.
(() => {
 const bounded=n=>Number.isFinite(n)&&n>=0&&n<=10000000;
 let timer;
 const report=()=>{parent.postMessage({channel:'pagenest-reading',type:'position',scrollTop:Math.min(10000000,Math.max(0,scrollY))},'*');parent.postMessage({channel:'pagenest-reading',type:'size',width:Math.min(20000,Math.max(innerWidth,document.documentElement.scrollWidth)),height:Math.min(10000000,document.documentElement.scrollHeight)},'*');};
 addEventListener('scroll',()=>{clearTimeout(timer);timer=setTimeout(report,150)},{passive:true});
 addEventListener('message',event=>{const m=event.data;if(event.source!==parent||!m||m.channel!=='pagenest-reading'||m.type!=='restore'||!bounded(m.scrollTop))return;scrollTo(0,m.scrollTop);setTimeout(report,80)});
 addEventListener('pagehide',report);
 addEventListener('load',()=>{report();new ResizeObserver(()=>{clearTimeout(timer);timer=setTimeout(report,100)}).observe(document.documentElement)});
})();
