// Runs inside the opaque sandbox; navigation cannot request business operations.
(() => {
 const bounded=n=>Number.isFinite(n)&&n>=0&&n<=10000000;
 let timer;const headings=new Map();
 const report=()=>{parent.postMessage({channel:'pagenest-reading',type:'position',scrollTop:Math.min(10000000,Math.max(0,scrollY))},'*');parent.postMessage({channel:'pagenest-reading',type:'size',width:Math.min(20000,Math.max(innerWidth,document.documentElement.scrollWidth)),height:Math.min(10000000,document.documentElement.scrollHeight)},'*');};
 addEventListener('scroll',()=>{clearTimeout(timer);timer=setTimeout(report,150)},{passive:true});
 addEventListener('message',event=>{
  const m=event.data;if(event.source!==parent||!m||m.channel!=='pagenest-reading')return;
  if(m.type==='restore'&&bounded(m.scrollTop)){scrollTo(0,m.scrollTop);setTimeout(report,80)}
  else if(m.type==='heading'&&typeof m.id==='string'&&/^pn-heading-[0-9]{1,3}$/.test(m.id)){
   const heading=headings.get(m.id);if(!heading)return;
   heading.scrollIntoView({block:'start',behavior:'instant'});report();setTimeout(report,80);
  }
 });
 addEventListener('pagehide',report);
 addEventListener('load',()=>{
  for(const node of document.querySelectorAll('h1[data-pagenest-heading],h2[data-pagenest-heading],h3[data-pagenest-heading],h4[data-pagenest-heading],h5[data-pagenest-heading],h6[data-pagenest-heading]')){
   const id=node.getAttribute('data-pagenest-heading');if(/^pn-heading-[0-9]{1,3}$/.test(id)&&headings.size<200&&!headings.has(id))headings.set(id,node);
  }
  report();new ResizeObserver(()=>{clearTimeout(timer);timer=setTimeout(report,100)}).observe(document.documentElement);
 });
})();
