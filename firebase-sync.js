/* Google sign-in and private per-user Firestore sync. No admin credentials are used. */
(async function(){
 const bridge=window.DashboardSyncBridge,core=window.DashboardSyncCore;
 const el=id=>document.getElementById(id),status=message=>{el('fbSyncStatus').textContent=message},gateMessage=message=>{el('fbGateStatus').textContent=message};
 const config={apiKey:'AIzaSyChVnn7DLMzSdvtIuZ4TeMr7NGeMOqBdlc',authDomain:'my-dashboard-95981.firebaseapp.com',projectId:'my-dashboard-95981',storageBucket:'my-dashboard-95981.firebasestorage.app',messagingSenderId:'681559522594',appId:'1:681559522594:web:79f53afff5360c910b397b'};
 let firebase,user=null,ref=null,ready=false,busy=false,dirty=false,conflict=false,revision=0,seq=0,epoch=0,timer=0,unsubscribe=null,deferred=null,auth=null,db=null,retryAt=0;
 const writer=crypto.randomUUID();
 function allowDashboard(value){document.body.classList.toggle('fb-account-locked',!value);el('fbAccountGate').hidden=value;document.querySelector('main').inert=!value;document.querySelector('aside').inert=!value}
 function switchUI(signedIn){el('fbSignIn').hidden=signedIn;el('fbSignOut').hidden=!signedIn;el('fbImportDevice').hidden=!signedIn;el('fbLoadLatest').hidden=!signedIn;el('fbRetry').hidden=!signedIn;el('fbIdentity').textContent=signedIn?('Signed in: '+(user.email||user.displayName||'Google account')):'Local-only mode'}
 function accountMeta(){return bridge.readMeta()||{}}
 function remember(){if(user)bridge.writeMeta({revision,pending:dirty})}
 function editing(){return Boolean(document.querySelector('dialog[open]'))||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||bridge.gameActive()}
 function queue(){clearTimeout(timer);if(user&&ready&&!conflict)timer=setTimeout(push,Math.max(1200,retryAt-Date.now()))}
 bridge.onChange=()=>{if(!user||!ready)return;dirty=true;seq++;remember();status('Changes saved on this device · syncing…');queue()};
 function applyCloud(record){const decoded=core.decode(record);bridge.apply(decoded.bundle);revision=decoded.revision;dirty=false;conflict=false;deferred=null;remember()}
 function errorText(error){const code=String(error.code||'');if(code.includes('permission-denied'))return 'Database permission denied. Check the published /users/{userId}/ rules.';if(code.includes('unauthorized-domain'))return 'Add cpriss1979.github.io to Firebase Authentication → Authorized domains.';if(code.includes('operation-not-allowed'))return 'Enable Google in Firebase Authentication → Sign-in method.';if(code.includes('popup-blocked'))return 'The sign-in window was blocked. Open this dashboard in Chrome or Safari and try again.';if(code.includes('popup-closed'))return 'Sign-in window closed. You can try again.';if(code.includes('network')||code.includes('unavailable'))return 'Connection unavailable. Your changes remain saved on this device.';return error.message||'Sync failed. Your local copy is retained.'}
 async function push(){
  if(!user||!ref||!ready||busy||conflict||!dirty||Date.now()<retryAt)return;
  const ownEpoch=epoch,ownRef=ref,ownSeq=seq,expected=revision;
  let json;try{json=core.encode(bridge.snapshot())}catch(e){status(e.message);return}
  busy=true;status('Saving to your Google account…');
  try{
   const result=await firebase.runTransaction(db,async tx=>{const snap=await tx.get(ownRef),current=snap.exists()?snap.data():null;const record=core.nextRecord(current,expected,json,writer);tx.set(ownRef,{...record,updatedAt:firebase.serverTimestamp()});return record.revision});
   if(ownEpoch!==epoch)return;revision=result;retryAt=0;dirty=seq!==ownSeq;remember();status(dirty?'More changes waiting to sync…':'Saved to your Google account · synced');
  }catch(error){if(ownEpoch!==epoch)return;if(error.message==='SYNC_CONFLICT'){conflict=true;status('Another device changed this dashboard. Export your local backup, then use Load latest. Your edits are kept locally.')}else{retryAt=Date.now()+30000;status(errorText(error))}remember()}
  finally{if(ownEpoch===epoch){busy=false;if(dirty&&!conflict)queue()}}
 }
 function watch(ownEpoch){
  unsubscribe?.();unsubscribe=firebase.onSnapshot(ref,{includeMetadataChanges:true},snap=>{
   if(ownEpoch!==epoch||!ready||!snap.exists()||snap.metadata.fromCache||snap.metadata.hasPendingWrites)return;const record=snap.data();if(!Number.isInteger(record.revision)||record.revision<=revision)return;
   if(busy){deferred=record;return}
   if(dirty){conflict=true;status('New cloud changes conflict with edits on this device. Export backup, then Load latest.');return}
   if(editing()){deferred=record;status('New updates available. Finish editing, then use Load latest.');return}
   try{applyCloud(record);status('Updated from your other device')}catch(e){status(errorText(e))}
  },e=>{if(ownEpoch===epoch)status(errorText(e))});
 }
 async function loadAccount(current){
  const ownEpoch=++epoch;unsubscribe?.();unsubscribe=null;clearTimeout(timer);ready=false;busy=false;dirty=false;conflict=false;deferred=null;retryAt=0;user=current;el('fbGateRetry').hidden=true;el('fbGateSignOut').hidden=!current;allowDashboard(false);
  if(!current){ref=null;bridge.setScope('');bridge.apply(bridge.readCached());switchUI(false);el('fbSignIn').disabled=false;el('fbGateSignIn').disabled=false;gateMessage('Sign in with Google to keep your dashboard private and sync between devices, or continue with local-only storage.');status('Sign in to sync, or continue locally');return}
  bridge.setScope(current.uid);bridge.apply(bridge.readCached());switchUI(true);el('fbIdentity').textContent='Signed in: '+(current.email||current.displayName||'Google account');ref=firebase.doc(db,'users',current.uid,'dashboard','state');const meta=accountMeta();revision=Number(meta.revision)||0;dirty=meta.pending===true;
  gateMessage('Loading your private dashboard…');status('Connecting to your Google account…');
  try{const snap=await firebase.getDocFromServer(ref);if(ownEpoch!==epoch)return;
   if(snap.exists()){
    const decoded=core.decode(snap.data());
    if(dirty){if(decoded.revision!==revision){conflict=true;status('This device has unsynced edits and newer cloud data. Export backup before loading latest.')}else status('Resuming changes saved on this device…')}
    else{applyCloud(snap.data());status('Cloud connected · changes sync automatically')}
   }else if(revision!==0&&dirty){conflict=true;status('The cloud copy is missing. Export your backup before choosing Import this device.')}else{revision=0;status('Cloud account is empty. Add an entry or use Import this device to bring over your existing dashboard.')}
   ready=true;remember();allowDashboard(true);watch(ownEpoch);if(dirty&&!conflict)queue();
  }catch(error){if(ownEpoch!==epoch)return;status(errorText(error));gateMessage(errorText(error)+' Retry connection below, or sign out to use your local-only copy.');el('fbGateRetry').hidden=false;el('fbGateSignOut').hidden=false}
 }
 async function signIn(){
  if(!auth){gateMessage('Google sign-in is still loading. Check your internet connection.');return}
  if(location.protocol==='file:'){gateMessage('Upload the files to GitHub, then open your https://cpriss1979.github.io/my_dashboard.io/ address to sign in.');return}
  try{el('fbSignIn').disabled=true;el('fbGateSignIn').disabled=true;const provider=new firebase.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});await firebase.signInWithPopup(auth,provider)}catch(error){gateMessage(errorText(error));status(errorText(error))}finally{el('fbSignIn').disabled=false;el('fbGateSignIn').disabled=false}
 }
 async function signOut(){if(busy){status('Wait for the current save to finish before signing out.');return}if(dirty&&!confirm('Unsynced changes are kept on this device for this Google account. Sign out anyway?'))return;await firebase.signOut(auth)}
 async function loadLatest(){if(!user)return;if(busy){status('Wait for the current save to finish.');return}if(dirty&&!confirm('Replace this device’s unsynced edits with the latest cloud copy? Export backup first if you want to keep them.'))return;try{const currentEpoch=epoch,currentRef=ref;const snap=await firebase.getDocFromServer(currentRef);if(currentEpoch!==epoch)return;if(!snap.exists()){status('No cloud copy yet. Add an entry or import this device.');return}bridge.saveRecoveryCopy();applyCloud(snap.data());ready=true;allowDashboard(true);status('Latest cloud dashboard loaded')}catch(e){status(errorText(e))}}
 async function importDevice(){
  if(!user||!ready||busy)return;const guest=bridge.readGuest();if(!confirm('Import the dashboard saved locally before Google sign-in into '+(user.email||'this account')+'? This replaces this account’s current cloud dashboard. Export a backup first if needed.'))return;
  try{core.validate(guest);const currentEpoch=epoch,currentRef=ref;const latest=await firebase.getDocFromServer(currentRef);if(currentEpoch!==epoch)return;revision=latest.exists()?core.decode(latest.data()).revision:0;bridge.saveRecoveryCopy();bridge.apply(guest);dirty=true;seq++;conflict=false;remember();await push()}catch(e){status(errorText(e))}
 }
 el('fbSignIn').onclick=signIn;el('fbGateSignIn').onclick=signIn;el('fbSignOut').onclick=()=>signOut().catch(e=>status(errorText(e)));el('fbGateSignOut').onclick=()=>signOut().catch(e=>gateMessage(errorText(e)));el('fbLoadLatest').onclick=loadLatest;el('fbImportDevice').onclick=importDevice;el('fbRetry').onclick=()=>loadAccount(auth.currentUser);el('fbGateRetry').onclick=()=>loadAccount(auth.currentUser);
 el('fbLocalOnly').onclick=()=>{if(user){gateMessage('Sign out first to use local-only storage. Your account’s cache stays separate.');return}bridge.setScope('');bridge.apply(bridge.readGuest());switchUI(false);allowDashboard(true);status('Local-only mode · data stays in this browser')};
 el('fbExportLocal').onclick=()=>bridge.exportGuestBackup();
 addEventListener('online',()=>{if(user&&!ready)loadAccount(user);else if(dirty)push()});
 addEventListener('beforeunload',e=>{if(user&&dirty){e.preventDefault();e.returnValue=''}});
 setInterval(()=>{if(user&&ready){if(dirty&&!busy&&!conflict)push();else if(deferred&&!busy&&!editing()){if(deferred.revision>revision){try{applyCloud(deferred);status('Updated from your other device')}catch(e){status(errorText(e))}}else deferred=null}}},15000);
 try{
  const version='13.0.0',base='https://www.gstatic.com/firebasejs/'+version+'/';
  const [app,authSDK,storeSDK]=await Promise.all([import(base+'firebase-app.js'),import(base+'firebase-auth.js'),import(base+'firebase-firestore.js')]);firebase={...app,...authSDK,...storeSDK};const instance=firebase.initializeApp(config);auth=firebase.getAuth(instance);db=firebase.getFirestore(instance);await firebase.setPersistence(auth,firebase.browserLocalPersistence);el('fbSignIn').disabled=false;el('fbGateSignIn').disabled=false;firebase.onAuthStateChanged(auth,current=>loadAccount(current));
 }catch(error){gateMessage('Sign-in could not start: '+errorText(error)+' You can still use local-only storage.');status('Google connection unavailable · local-only option remains available')}
})();
