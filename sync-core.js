(function(root){
 const keys=['events','projects','reminders','bookmarks','notes','transactions','priorities'];
 function blank(){return Object.fromEntries([...keys.map(k=>[k,[]]),['scratch','']])}
 function validate(bundle){if(!bundle||typeof bundle!=='object'||!bundle.state||keys.some(k=>!Array.isArray(bundle.state[k]))||typeof bundle.state.scratch!=='string'||!bundle.extras||typeof bundle.extras!=='object')throw Error('Invalid dashboard data.');return bundle}
 function encode(bundle){validate(bundle);const json=JSON.stringify(bundle);if(new TextEncoder().encode(json).length>900000)throw Error('Dashboard is too large to sync. Export a backup and reduce older entries first.');return json}
 function decode(record){if(!record||!Number.isInteger(record.revision)||record.revision<1||typeof record.json!=='string')throw Error('Cloud data is not a valid dashboard.');return {bundle:validate(JSON.parse(record.json)),revision:record.revision}}
 function nextRecord(current,expected,json,writer){const actual=current?current.revision:0;if(actual!==expected)throw Error('SYNC_CONFLICT');return {json,revision:actual+1,writer,schema:1}}
 root.DashboardSyncCore={blank,validate,encode,decode,nextRecord};
})(globalThis);
