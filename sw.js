/* オフラインでも開けるようにするための仕組み。画面まわりのファイルだけを保存し、データ(Supabase)は保存しない */
const V='manabi-v2';
const SHELL=['./','index.html','config.js','manifest.webmanifest','logo.webp','fonts/higure-400.woff2','fonts/higure-700.woff2','fonts/higure-900.woff2','icons/icon-192.png','icons/icon-512.png'];
const CDN=['cdnjs.cloudflare.com','cdn.jsdelivr.net','fonts.googleapis.com','fonts.gstatic.com'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>Promise.all(SHELL.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
  const same=u.origin===location.origin,cdn=CDN.includes(u.hostname);
  if(!same&&!cdn)return;                       // Supabase などは通さず、ふつうに通信する
  e.respondWith((async()=>{
    const c=await caches.open(V);const hit=await c.match(r,{ignoreSearch:true});
    const fresh=same&&(r.mode==='navigate'||/\.(html|js)$|\/$/.test(u.pathname));   // 画面とプログラムは、通信できるときは最新を先に取る
    if(fresh){try{const res=await Promise.race([fetch(r),new Promise((_,rj)=>setTimeout(rj,4000))]);if(res&&res.ok){c.put(r,res.clone());return res}}catch(err){}if(hit)return hit}
    const net=fetch(r).then(res=>{if(res&&(res.ok||res.type==='opaque'))c.put(r,res.clone());return res}).catch(()=>null);
    if(hit){e.waitUntil(net);return hit}                // 保存済みを先に返し、裏で更新する
    const res=await net;if(res)return res;
    if(r.mode==='navigate'){const i=await c.match('index.html');if(i)return i}
    return new Response('',{status:504})})())});
