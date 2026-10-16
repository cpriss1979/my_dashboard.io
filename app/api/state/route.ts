import { env } from 'cloudflare:workers';
export const dynamic = 'force-dynamic';
const response = (data: unknown, status=200) => Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
function user(request: Request){return request.headers.get('oai-authenticated-user-id')}
export async function GET(request: Request){
 const id=user(request);if(!id)return response({error:'Sign in required'},401);
 const row=await env.DB!.prepare('SELECT data, revision, updated_at FROM dashboard_documents WHERE user_id = ?').bind(id).first<{data:string,revision:number,updated_at:string}>();
 return response(row?{document:JSON.parse(row.data),revision:row.revision,updatedAt:row.updated_at}:{document:null,revision:0});
}
export async function PUT(request: Request){
 const id=user(request);if(!id)return response({error:'Sign in required'},401);
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return response({error:'Origin mismatch'},403);
 const raw=await request.text();if(raw.length>2000000)return response({error:'Backup too large'},413);
 let input;try{input=JSON.parse(raw)}catch{return response({error:'Invalid JSON'},400)}
 const doc=input.document;if(!Number.isInteger(input.revision)||input.revision<0||!doc||typeof doc!=='object'||!doc.state||typeof doc.state!=='object')return response({error:'Invalid dashboard document'},400);
 for(const k of ['events','projects','reminders','bookmarks','notes','transactions','priorities'])if(!Array.isArray(doc.state[k]))return response({error:'Invalid '+k},400);
 if(typeof doc.state.scratch!=='string')return response({error:'Invalid notes'},400);
 const revision=input.revision+1,updatedAt=new Date().toISOString();
 const row=await env.DB!.prepare('INSERT INTO dashboard_documents (user_id,data,revision,updated_at) VALUES (?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data,revision=excluded.revision,updated_at=excluded.updated_at WHERE dashboard_documents.revision=? RETURNING revision').bind(id,JSON.stringify(doc),revision,updatedAt,input.revision).first();
 if(!row)return response({error:'Another device saved newer data. Reload cloud data before saving.'},409);
 return response({revision,updatedAt});
}
