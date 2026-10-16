import { dashboardHtml } from '../lib/dashboard-html';
export const dynamic = 'force-dynamic';
export async function GET(request: Request){
 const id=request.headers.get('oai-authenticated-user-id');
 const headers={'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'strict-origin-when-cross-origin'};
 if(!id)return new Response(`<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your personal dashboard</title><style>body{margin:0;background:#080b1e;color:#f1f1fc;font:17px system-ui;display:grid;place-items:center;min-height:100vh}main{max-width:520px;margin:25px;padding:40px;border:1px solid #40345c;border-radius:18px;background:#15132b}h1{font-size:34px}p{line-height:1.8;color:#c0b8d3}a{display:inline-block;background:#69429a;color:white;text-decoration:none;padding:14px 22px;border-radius:9px}</style><main><h1>A space for your day.</h1><p>Organize your calendar, projects, notes, priorities, and finances. Your saved dashboard is private to your account and syncs between your devices.</p><a href="/signin-with-chatgpt?return_to=%2F" target="_top">Sign in with ChatGPT</a><p>Each person has their own data. The public link does not share anyone’s personal entries.</p></main></html>`,{headers});
 const userScope=JSON.stringify('dashboard-user:'+id+':').replace(/</g,'\\u003c');
 const storage=`const dashboardStorage=(()=>{const prefix=${userScope};return {getItem(k){return window.localStorage.getItem(prefix+k)},setItem(k,v){window.localStorage.setItem(prefix+k,v);window.onDashboardStorageChange?.(k)},setRaw(k,v){window.localStorage.setItem(prefix+k,v)},removeItem(k){window.localStorage.removeItem(prefix+k)}}})();`;
 return new Response(dashboardHtml.replace('<script>','<script>'+storage),{headers});
}
