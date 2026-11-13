(function(){
 const seeds=[['Draw something','short','creative'],['Paint','long','creative'],['Play chess with Rick','long','social'],['Play pinball','short','play'],['Play PS4','long','play'],['Sit outside','short','outdoors'],['Visit the lake','long','outdoors'],['Go swimming','long','outdoors'],['Visit the zoo','long','outdoors'],['Take a bath','long','rest'],['Relax in the massage chair','short','rest'],['Try something creative','short','creative']];
 const extraActivities=[{"id": "idea-short-1", "name": "Sing one favorite song full-out", "description": "Sing one favorite song full-out. Give that first soprano voice a little stage time.", "kind": "short", "category": "creative", "enabled": true}, {"id": "idea-short-2", "name": "Take a warm shower with soft music", "description": "Take a warm shower with soft music. Make it feel like a tiny hotel escape.", "kind": "short", "category": "rest", "enabled": true}, {"id": "idea-short-3", "name": "Play with a new eye makeup look", "description": "Play with a new eye makeup look. No full face or going anywhere required.", "kind": "short", "category": "rest", "enabled": true}, {"id": "idea-short-4", "name": "Sit outside with a favorite drink", "description": "Sit outside with a favorite drink. Give yourself ten minutes with nothing to accomplish.", "kind": "short", "category": "outdoors", "enabled": true}, {"id": "idea-short-5", "name": "Play a few rounds of Water Sort", "description": "Play a few rounds of Water Sort. Stop whenever you feel satisfied.", "kind": "short", "category": "play", "enabled": true}, {"id": "idea-short-6", "name": "Give yourself a hand massage", "description": "Give yourself a hand massage. Use lotion and slowly work through each finger.", "kind": "short", "category": "rest", "enabled": true}, {"id": "idea-short-7", "name": "Slow dance with Rick to one song", "description": "Slow dance with Rick to one song. The kitchen counts as a dance floor.", "kind": "short", "category": "social", "enabled": true}, {"id": "idea-short-8", "name": "Watch a short aquarium or underwater video", "description": "Watch a short aquarium or underwater video. Full screen makes it more immersive.", "kind": "short", "category": "rest", "enabled": true}, {"id": "idea-short-9", "name": "Read a Psalm slowly", "description": "Read a Psalm slowly. Choose a comforting one and linger over the words.", "kind": "short", "category": "rest", "enabled": true}, {"id": "idea-short-10", "name": "Try a different hairstyle", "description": "Try a different hairstyle. A new part, a pretty clip, or a quick updo.", "kind": "short", "category": "creative", "enabled": true}, {"id": "idea-short-11", "name": "Look through a handful of Delilah pictures", "description": "Look through a handful of Delilah pictures. Pick today’s cutest face.", "kind": "short", "category": "social", "enabled": true}, {"id": "idea-short-12", "name": "Do a mini karaoke session", "description": "Do a mini karaoke session. Two or three songs, imaginary audience optional.", "kind": "short", "category": "creative", "enabled": true}, {"id": "idea-short-13", "name": "Play with a color palette for an imaginary app", "description": "Play with a color palette for an imaginary app. Pink, violet, cyan—whatever makes your eyes happy.", "kind": "short", "category": "creative", "enabled": true}, {"id": "idea-short-14", "name": "Blow bubbles outside", "description": "Blow bubbles outside. Yes, grown women are absolutely allowed.", "kind": "short", "category": "outdoors", "enabled": true}, {"id": "idea-short-15", "name": "Listen to Rick play guitar", "description": "Listen to Rick play guitar. Request a little private concert.", "kind": "short", "category": "social", "enabled": true}, {"id": "idea-short-16", "name": "Put on a face mask and close your eyes", "description": "Put on a face mask and close your eyes. No multitasking necessary.", "kind": "short", "category": "rest", "enabled": true}, {"id": "idea-short-17", "name": "Play a short Memory Match game with pictures of places", "description": "Play a short Memory Match game with pictures of places.", "kind": "short", "category": "play", "enabled": true}, {"id": "idea-short-18", "name": "Watch a funny animal clip compilation", "description": "Watch a funny animal clip compilation. Something silly and reliably light.", "kind": "short", "category": "play", "enabled": true}, {"id": "idea-short-19", "name": "Browse dreamy swimming pools or hotel spas", "description": "Browse dreamy swimming pools or hotel spas. Enjoy the daydream without needing to book anything.", "kind": "short", "category": "rest", "enabled": true}, {"id": "idea-short-20", "name": "Sit with Jasmine or Buttons", "description": "Sit with Jasmine or Buttons. Pet them slowly and enjoy their company.", "kind": "short", "category": "social", "enabled": true}, {"id": "idea-short-21", "name": "Make a tiny digital mood board", "description": "Make a tiny digital mood board. Just five images that feel peaceful or beautiful.", "kind": "short", "category": "creative", "enabled": true}, {"id": "idea-short-22", "name": "Listen to one worship song without doing anything else", "description": "Listen to one worship song without doing anything else.", "kind": "short", "category": "rest", "enabled": true}, {"id": "idea-short-23", "name": "Doodle flowers, butterflies, or fancy badge shapes", "description": "Doodle flowers, butterflies, or fancy badge shapes. Paper or screen both work.", "kind": "short", "category": "creative", "enabled": true}, {"id": "idea-short-24", "name": "Give Rick a three-song listening challenge", "description": "Give Rick a three-song listening challenge. Each choose songs the other might enjoy.", "kind": "short", "category": "social", "enabled": true}, {"id": "idea-short-25", "name": "Stand outside and watch the clouds or stars", "description": "Stand outside and watch the clouds or stars.", "kind": "short", "category": "outdoors", "enabled": true}, {"id": "idea-short-26", "name": "Try a short bubble-wrap popping or ripple game", "description": "Try a short bubble-wrap popping or ripple game. Something pleasantly repetitive.", "kind": "short", "category": "play", "enabled": true}, {"id": "idea-short-27", "name": "Record yourself singing a chorus", "description": "Record yourself singing a chorus. Keep it just for you if you want.", "kind": "short", "category": "creative", "enabled": true}, {"id": "idea-short-28", "name": "Choose a pretty outfit from clothes you already own", "description": "Choose a pretty outfit from clothes you already own. Try an unexpected combination.", "kind": "short", "category": "creative", "enabled": true}, {"id": "idea-short-29", "name": "Read a few pages of something light", "description": "Read a few pages of something light. Stop before it turns into an assignment.", "kind": "short", "category": "rest", "enabled": true}, {"id": "idea-short-30", "name": "Have a ridiculous question break with Rick", "description": "Have a ridiculous question break with Rick. “If we owned a train, where would we go first?” 🚂", "kind": "short", "category": "social", "enabled": true}, {"id": "idea-long-1", "name": "Have a pool afternoon", "description": "Have a pool afternoon. Float, walk in the water, swim a little, and enjoy being there.", "kind": "long", "category": "outdoors", "enabled": true}, {"id": "idea-long-2", "name": "Create a hotel-style retreat at home", "description": "Create a hotel-style retreat at home. Fresh pajamas, a long shower, soft lighting, music, and a movie.", "kind": "long", "category": "rest", "enabled": true}, {"id": "idea-long-3", "name": "Have a full beauty afternoon", "description": "Have a full beauty afternoon. Hair, nails, skincare, and makeup at your own pace.", "kind": "long", "category": "rest", "enabled": true}, {"id": "idea-long-4", "name": "Make a private karaoke night", "description": "Make a private karaoke night. Build a set list with worship songs, old favorites, and a big finale.", "kind": "long", "category": "creative", "enabled": true}, {"id": "idea-long-5", "name": "Have a movie date with Rick", "description": "Have a movie date with Rick. Each pick a movie on alternating nights.", "kind": "long", "category": "social", "enabled": true}, {"id": "idea-long-6", "name": "Spend an afternoon with Delilah doing simple play", "description": "Spend an afternoon with Delilah doing simple play. Bubbles, blocks, books, and plenty of sitting together.", "kind": "long", "category": "social", "enabled": true}, {"id": "idea-long-7", "name": "Play a satisfying cleaning simulation game", "description": "Play a satisfying cleaning simulation game. Enjoy the visible progress and repetitive motions.", "kind": "long", "category": "play", "enabled": true}, {"id": "idea-long-8", "name": "Make a tiny “just for fun” coding project", "description": "Make a tiny “just for fun” coding project. A sparkling button, floating butterflies, or an animated aquarium—no portfolio requirements.", "kind": "long", "category": "creative", "enabled": true}, {"id": "idea-long-9", "name": "Create digital art with AI", "description": "Create digital art with AI. Try dreamy pools, romantic gardens, or Rick as a rock-star train conductor.", "kind": "long", "category": "creative", "enabled": true}, {"id": "idea-long-10", "name": "Have a board game or card game evening with Rick", "description": "Have a board game or card game evening with Rick.", "kind": "long", "category": "social", "enabled": true}, {"id": "idea-long-11", "name": "Visit a garden or nature center with places to sit", "description": "Visit a garden or nature center with places to sit. Take your time and enjoy the scenery.", "kind": "long", "category": "outdoors", "enabled": true}, {"id": "idea-long-12", "name": "Make a photo book about Delilah’s first year", "description": "Make a photo book about Delilah’s first year. Focus on enjoying the memories rather than finishing it.", "kind": "long", "category": "creative", "enabled": true}, {"id": "idea-long-13", "name": "Have a worship and journaling retreat", "description": "Have a worship and journaling retreat. Music, Scripture, prayer, and room to write whatever comes up.", "kind": "long", "category": "rest", "enabled": true}, {"id": "idea-long-14", "name": "Watch a musical or a recorded stage performance", "description": "Watch a musical or a recorded stage performance. Make it an at-home theater evening.", "kind": "long", "category": "rest", "enabled": true}, {"id": "idea-long-15", "name": "Spend an afternoon painting", "description": "Spend an afternoon painting. Flowers, water, or an abstract swirl of your favorite colors.", "kind": "long", "category": "creative", "enabled": true}, {"id": "idea-long-16", "name": "Take a scenic drive with Rick", "description": "Take a scenic drive with Rick. Bring music and choose a pretty place to stop.", "kind": "long", "category": "outdoors", "enabled": true}, {"id": "idea-long-17", "name": "Have a home concert night", "description": "Have a home concert night. Rick’s guitar, your singing, and absolutely no admission charge.", "kind": "long", "category": "social", "enabled": true}, {"id": "idea-long-18", "name": "Build a miniature garden or terrarium", "description": "Build a miniature garden or terrarium. Real plants or a whimsical decorative version.", "kind": "long", "category": "creative", "enabled": true}, {"id": "idea-long-19", "name": "Go to a matinee movie", "description": "Go to a matinee movie. Enjoy getting out without needing a whole evening.", "kind": "long", "category": "rest", "enabled": true}, {"id": "idea-long-20", "name": "Make a cozy reading nest", "description": "Make a cozy reading nest. Blanket, comfortable chair, drink, and a book chosen purely for pleasure.", "kind": "long", "category": "rest", "enabled": true}, {"id": "idea-long-21", "name": "Have a puzzle afternoon", "description": "Have a puzzle afternoon. Choose a beautiful landscape or colorful scene you’ll enjoy looking at.", "kind": "long", "category": "play", "enabled": true}, {"id": "idea-long-22", "name": "Have a gentle zoo or aquarium outing", "description": "Have a gentle zoo or aquarium outing. Take breaks and use mobility support whenever it makes the trip more enjoyable.", "kind": "long", "category": "outdoors", "enabled": true}, {"id": "idea-long-23", "name": "Create a fantasy getaway plan", "description": "Create a fantasy getaway plan. Pick the pool, room, meals, and activities with no obligation to spend anything.", "kind": "long", "category": "rest", "enabled": true}, {"id": "idea-long-24", "name": "Have a baking date with Rick", "description": "Have a baking date with Rick. Let him show off his bread skills while you enjoy the company.", "kind": "long", "category": "social", "enabled": true}, {"id": "idea-long-25", "name": "Make a simple piece of jewelry", "description": "Make a simple piece of jewelry. Something in your favorite colors that you can actually wear.", "kind": "long", "category": "creative", "enabled": true}, {"id": "idea-long-26", "name": "Have a family game afternoon", "description": "Have a family game afternoon. Easy games, lots of laughing, and no elaborate hosting.", "kind": "long", "category": "social", "enabled": true}, {"id": "idea-long-27", "name": "Learn a song you’ve always wanted to sing", "description": "Learn a song you’ve always wanted to sing. Work on it gently, with breaks just to listen and enjoy.", "kind": "long", "category": "creative", "enabled": true}, {"id": "idea-long-28", "name": "Visit a model train display or spend time on a train project with Rick", "description": "Visit a model train display or spend time on a train project with Rick. Let him share what he loves.", "kind": "long", "category": "social", "enabled": true}, {"id": "idea-long-29", "name": "Have a low-pressure photography outing", "description": "Have a low-pressure photography outing. Look for reflections, flowers, interesting buildings, or beautiful light.", "kind": "long", "category": "creative", "enabled": true}, {"id": "idea-long-30", "name": "Design your dream relaxation space", "description": "Design your dream relaxation space. Make a digital room with a pool view, cozy seating, soft lighting, and all your favorite colors.", "kind": "long", "category": "creative", "enabled": true}];
 const originalCategories={
  'idea-short-1':'music','idea-short-3':'beauty','idea-short-9':'faith','idea-short-10':'beauty',
  'idea-short-12':'music','idea-short-22':'faith','idea-short-27':'music','idea-short-28':'beauty',
  'idea-long-3':'beauty','idea-long-4':'music','idea-long-13':'faith','idea-long-27':'music'
 };
 const newIdeas=[
  ['pajama-reset','Get extra cozy',5,'rest','Put on your softest pajamas, tuck under a flannel blanket, and let one song play.'],
  ['rain-window','Watch rain from the good chair',10,'rest','Open the curtains, hold a warm mug, and watch where the drops meet.'],
  ['quiet-tea','Make a quiet cup of tea',10,'rest','Pick a favorite mug and sit somewhere you can see the sky.'],
  ['favorite-blanket','Build a blanket nest',15,'rest','Gather your softest blanket and two pillows, then settle in with an audiobook.'],
  ['fireplace','Put a fireplace on the TV',20,'rest','Dim the lights and find a long fireplace recording with soft crackling.'],
  ['cozy-rerun','Rewatch a comfort episode',30,'rest','Pick one episode you already know makes you laugh.'],
  ['book-escape','Start a book for pure fun',45,'rest','Choose for the cover, the setting, or how good the first page sounds.'],
  ['hotel-morning','Have a slow hotel-style morning',60,'rest','Take your time in pajamas, put on a jazz playlist, and read in bed.'],
  ['nail-palette','Test nail colors on paper',10,'beauty','Make little swatches and see which two shades look prettiest together.'],
  ['pageant-look','Design a pageant evening look',30,'beauty','Pair a gown silhouette with shoes, earrings, and a lip color.'],
  ['vanity-light','Try a soft-glam lighting test',15,'beauty','Compare your favorite makeup in window light and lamplight.'],
  ['signature-lip','Find a favorite lip combo',10,'beauty','Pair two shades you already own and judge them in daylight.'],
  ['hair-accessories','Try three ways to wear a pretty clip',15,'beauty','Take quick photos of the styles you like.'],
  ['glam-shoot','Do a little glamour photo shoot',45,'beauty','Use a lamp, a favorite outfit, and one dramatic pose just for fun.'],
  ['jewelry-styling','Style a favorite piece of jewelry',20,'beauty','Build two looks around a necklace or ring you love.'],
  ['sparkly-manicure','Make a glitter accent manicure',45,'beauty','Pick one accent nail and give yourself time to let each coat dry.'],
  ['psalm143','Read Psalm 143:8–10',5,'faith','Read slowly and turn whichever line stays with you into a short prayer.'],
  ['prayer-window','Say a prayer by the window',5,'faith','Take a quiet moment with God and speak in your own words.'],
  ['verse-lockscreen','Make a Scripture lock screen',20,'faith','Put a favorite verse over a photo of water or flowers.'],
  ['hymn-story','Look up the story behind a favorite hymn',20,'faith','Read about its writer, then listen to one recording.'],
  ['psalm-copy','Copy a Psalm by hand',15,'faith','Write a few lines on pretty paper at whatever pace feels right.'],
  ['peace-playlist','Collect peaceful instrumental hymns',30,'faith','Choose versions you would want to hear on a quiet morning.'],
  ['scripture-theme','Read several passages on hope',35,'faith','Choose a few verses from Psalms and the New Testament and linger on a favorite.'],
  ['verse-bookmark','Make a Scripture bookmark',25,'faith','Letter a verse on cardstock and decorate the edge with little stars.'],
  ['soprano-duet','Sing an imaginary duet',15,'music','Find a duet backing track and take whichever part looks the most fun.'],
  ['song-bridge','Sing your favorite song bridge',5,'music','Jump right to the part you always turn up.'],
  ['harmonies','Try two harmonies on one chorus',20,'music','Use Voice Memos to hear how each harmony sits against the melody.'],
  ['song-eras','Make a playlist from three decades',25,'music','Pick a few songs from each era and see which decade wins.'],
  ['favorite-soprano','Listen to a favorite soprano performance',20,'music','Find a live rendition and listen for the moments you would sing your own way.'],
  ['guitar-vocal','Try an acoustic version with Rick',45,'music','Pick a song you both know and play with a slower arrangement.'],
  ['cover-compare','Compare three covers of the same song',20,'music','Choose your favorite for the vocals, the arrangement, and the mood.'],
  ['set-list','Create a dream concert set list',35,'music','Pick an opener, a big ballad, a duet, and an encore.'],
  ['myspace-card','Make a tiny MySpace-style profile',45,'creative','Try a glitter border, favorite song title, and a ridiculously fancy color theme.'],
  ['css-water','Code a little water ripple',30,'creative','Start with two CSS circles and see what happens when you animate their size.'],
  ['pageant-crown','Sketch a fantasy crown',20,'creative','Give it a theme, like lake light, violet glass, or tiny butterflies.'],
  ['dashboard-sticker','Design a sticker for your dashboard',25,'creative','Try a sleepy moon, a pool float, or a cartoon version of the cat.'],
  ['watercolor-palette','Paint three watercolor swatches',15,'creative','Let pink and purple bleed into each other and see what colors appear.'],
  ['train-family','Invent a miniature train stop',30,'creative','Draw a station with a funny name and give it one oddly specific feature.'],
  ['photo-wall','Make a tiny photo collage',25,'creative','Pick a theme like fuzzy faces or favorite moments with Delilah.'],
  ['pool-game','Sketch a cozy poolside game',60,'creative','Invent the pool, one playful interaction, and a color palette.'],
  ['one-nonogram','Solve one small nonogram',10,'play','Choose a 5×5 puzzle and see what picture appears.'],
  ['dice-round','Roll for a full house',15,'play','Try a quick dice game and aim for your favorite combination.'],
  ['mini-golf','Play a few holes of virtual mini golf',20,'play','Pick the silliest course with the best scenery.'],
  ['pinball-target','Try for one pinball trick shot',10,'play','Pick one ramp and see if you can hit it twice.'],
  ['hidden-object','Find a hidden-object scene',25,'play','Go for a lush garden, seaside town, or Victorian room.'],
  ['puzzle-coop','Pick a couch co-op game',60,'play','Find something you and Rick can play together with simple controls.'],
  ['word-puzzle','Do a cozy word puzzle',15,'play','Choose a theme you love, like cute animals or a favorite musical.'],
  ['browser-arcade','Have a mini arcade night',45,'play','Alternate between three favorites and give each round a ridiculous name.'],
  ['lake-light','Go look at reflections on the lake',35,'outdoors','Choose a comfortable spot to sit and see how the light moves on the water.'],
  ['indoor-swim','Take an indoor pool break',60,'outdoors','Give yourself time to float and enjoy the warm water.'],
  ['cloud-photo','Take a photo of an outrageous cloud',10,'outdoors','See what it looks like before you show anyone else.'],
  ['garden-bench','Visit a garden just to sit',45,'outdoors','Find a good bench and pick one flower or tree to really look at.'],
  ['patio-stars','Watch the evening sky change color',20,'outdoors','Bring a blanket and see which star or planet shows up first.'],
  ['slow-drive','Take the scenic way home',25,'outdoors','Pick a tree-lined road or a route that passes water.'],
  ['aquarium-cam','Watch a live aquarium camera',15,'outdoors','Pick jellyfish, sea otters, or an underwater reef.'],
  ['waterside-photos','Make a waterside photo walk or drive',45,'outdoors','Look for ripples, reflections, and one surprising color.'],
  ['delilah-voice','Record a tiny story for Delilah',10,'social','Read a picture-book page and give the animals silly voices.'],
  ['rick-album','Trade favorite album tracks with Rick',20,'social','Each pick one deep cut and tell the story of how you found it.'],
  ['puppy-portraits','Take funny pet portraits',15,'social','Photograph Jasmine, Buttons, or the cat from their eye level.'],
  ['kim-memory','Share an old photo with a friend',10,'social','Add the one line that brings the memory back for you.'],
  ['rick-train-town','Dream up a train layout scene with Rick',35,'social','Name the town and decide what the tiniest shop sells.'],
  ['photo-date','Revisit an old date photo with Rick',15,'social','See if you remember the same little details.'],
  ['delilah-fort','Make a blanket fort with Delilah',30,'social','Bring a board book and let her choose the fort’s name or sound.'],
  ['music-drive','Take a two-DJ drive with Rick',45,'social','Trade song picks for the whole drive, with bonus points for surprises.']
 ].map(([id,name,minutes,category,description])=>({
  id:'joy-'+id,name,minutes,category,description,kind:minutes<=20?'short':'long',enabled:true
 }));

 const words=['Tense','Tired','Busy','Restless','Calm','Happy','Relaxed','Encouraged','Refreshed'];const faces=['😞','🙁','😐','🙂','😄'];let historyLimit=30,dialog=null,quietClose=false;
 function model(){if(!state.timeForYou)state.timeForYou={settings:{enabled:true,interval:60,from:'09:00',to:'21:00'},activities:seeds.map(([name,kind,category],i)=>({id:'t'+i,name,kind,category,enabled:true})),history:[],completed:[],awards:{},pending:null,nextAt:null};const m=state.timeForYou;m.activities??=[];m.settings??={enabled:false,interval:60,from:'09:00',to:'21:00'};m.history??=[];m.completed??=[];m.awards??={};if(!m.defaultRemindersV2){const chosen=m.history.some(h=>['settings_changed','reminders_off'].includes(h.type));if(!chosen){m.settings.enabled=true;m.settings.interval=60}m.defaultRemindersV2=true}if(m.activityIdeasVersion!==2){for(const a of [...extraActivities,...newIdeas])if(!m.activities.some(old=>old.id===a.id||old.name.toLowerCase()===a.name.toLowerCase()))m.activities.push({...a});m.activityIdeasVersion=2}return m}
 function mins(t){const [h,m]=t.split(':').map(Number);return h*60+m}
 function allowed(date,from,to){const n=date.getHours()*60+date.getMinutes(),a=mins(from),b=mins(to);return a===b||a<b&&n>=a&&n<b||a>b&&(n>=a||n<b)}
 function nextAllowed(date,from,to){const d=new Date(date);if(allowed(d,from,to))return d;const [h,m]=from.split(':').map(Number);d.setHours(h,m,0,0);if(d<date)d.setDate(d.getDate()+1);return d}
 function tomorrow(date,from){const d=new Date(date);d.setDate(d.getDate()+1);const [h,m]=from.split(':').map(Number);d.setHours(h,m,0,0);return d}
 window.TimeForYouMath={allowed,nextAllowed,tomorrow};
 function log(type,data={}){model().history.push({id:crypto.randomUUID(),at:new Date().toISOString(),type,...data})}
 function schedule(n){const m=model(),s=m.settings;m.nextAt=nextAllowed(new Date(Date.now()+n*60000),s.from,s.to).toISOString()}
 function persist(){earn();save()}
 function btn(text,fn,cls='secondary'){const b=document.createElement('button');b.type='button';b.textContent=text;b.className=cls;b.onclick=fn;return b}
 function el(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e}
 function card(title){const s=el('section',undefined,'card tfy-card');s.append(el('h2',title));return s}
 function field(label,input){const l=el('label',label);l.append(input);return l}
 function input(type,value){const i=el('input');i.type=type;if(value!==undefined)i.value=value;return i}
 function close(){if(dialog?.open){quietClose=true;dialog.close()}dialog=null}
 function makeDialog(title){close();quietClose=false;dialog=el('dialog',undefined,'app-action-dialog tfy-dialog');const d=dialog;const heading=el('h2',title);heading.id='joy-dialog-heading';d.setAttribute('aria-labelledby',heading.id);d.append(heading);const content=el('div');d.append(content);d.addEventListener('cancel',()=>{if(!quietClose){log('dismissed');schedule(model().settings.interval);persist()}});d.addEventListener('close',()=>d.remove());document.body.append(d);d.showModal();return content}
 function feelingForm(root,title,done,previous){root.append(el('h3',title));const f=el('form');const group=el('fieldset');group.append(el('legend','How are you feeling?'));const row=el('div',undefined,'tfy-faces');faces.forEach((face,i)=>{const r=input('radio',i+1);r.name='face';r.required=true;r.setAttribute('aria-label',['Very low','Low','Neutral','Good','Very good'][i]);row.append(field(face+' '+['Very low','Low','Neutral','Good','Very good'][i],r))});group.append(row);f.append(group);const tags=el('div',undefined,'tfy-words');words.forEach(w=>{const check=input('checkbox',w);check.name='word';tags.append(field(w,check))});f.append(el('p','Choose any words that fit (optional).'),tags);const note=el('textarea');note.rows=3;note.maxLength=1000;f.append(field('Anything else? (optional)',note));const actions=el('div',undefined,'tfy-actions');const save=el('button',previous?'Record my activity':'Save how I feel');save.type='submit';save.className='primary';actions.append(save,btn('Cancel',()=>{log('feeling_cancelled');persist();close()}));f.append(actions);f.onsubmit=e=>{e.preventDefault();done({face:Number(f.querySelector('[name=face]:checked').value),words:[...f.querySelectorAll('[name=word]:checked')].map(x=>x.value),note:note.value.trim(),at:new Date().toISOString()})};root.append(f)}
 function completePending(){const m=model(),p=m.pending,owner=state;if(!p)return;const root=makeDialog('How do you feel after '+p.name+'?');const record=feeling=>{if(state!==owner||model().pending!==p){close();render();return}m.completed.push({...p,id:crypto.randomUUID(),after:feeling,completedAt:new Date().toISOString()});log('completed',{activity:p.name,kind:p.kind});m.pending=null;schedule(m.settings.interval);persist();close();render()};root.append(btn('Record without a check-in',()=>record(null),'primary'));feelingForm(root,'Optional check-in',record,true)}
 function choose(activity){
  const owner=state;
  if(model().pending){completePending();return}
  if(!activity.enabled){render();return}
  const root=makeDialog(activity.name);
  const record=before=>{
   if(state!==owner||model().pending){close();render();return}
   model().pending={activityId:activity.id,name:activity.name,kind:activity.kind,category:activity.category,before,startedAt:new Date().toISOString()};
   log('chosen',{activity:activity.name,kind:activity.kind});persist();close();go('Time for You');
  };
  if(activity.description)root.append(el('p',activity.description));
  const actions=el('div',undefined,'tfy-actions');
  actions.append(btn('Do this',()=>record(null),'primary'),btn('Add a before check-in',()=>{
   root.replaceChildren();
   feelingForm(root,'How do you feel before you start?',record);
  }),btn('Close',close));
  root.append(actions);
 }
 function rules(){const c=model().completed,n=c.length,short=c.filter(x=>x.kind==='short').length,long=c.filter(x=>x.kind==='long').length,cat=k=>c.filter(x=>(badgeCategory[x.category]||x.category)===k).length,unique=new Set(c.map(x=>x.activityId)).size,days=new Set(c.map(x=>localDate(new Date(x.completedAt)))).size;return [
 ['First Little Pause','🌸','Confirm your first activity.',n>=1],['Three Moments','💗','Confirm 3 activities.',n>=3],['Five for You','⭐','Confirm 5 activities.',n>=5],['Ten Bright Breaks','☀️','Confirm 10 activities.',n>=10],['Twenty Kind Moments','💐','Confirm 20 activities.',n>=20],['Fifty Little Joys','🦋','Confirm 50 activities.',n>=50],['A Hundred Smiles','💝','Confirm 100 activities.',n>=100],['A Small Breather','🍃','Confirm one short break.',short>=1],['Pocket of Peace','🌼','Confirm 5 short breaks.',short>=5],['Time to Explore','🧭','Confirm one longer activity.',long>=1],['Lovely Adventures','🌈','Confirm 5 longer activities.',long>=5],['Creative Spark','🎨','Confirm a creative activity.',cat('creative')>=1],['Colorful Moments','🌺','Confirm 5 creative activities.',cat('creative')>=5],['Together Time','♟️','Confirm a companion activity.',cat('social')>=1],['Fresh Air','🌳','Confirm an outdoor activity.',cat('outdoors')>=1],['Gentle Comfort','🪷','Confirm a restful activity.',cat('rest')>=1],['Just for Fun','🎮','Confirm a play activity.',cat('play')>=1],['Curious Heart','✨','Confirm 3 different activities.',unique>=3],['Joyful Variety','🍬','Confirm 6 different activities.',unique>=6],['Seven Days of You','🌷','Confirm activities on 7 different dates. No streak needed.',days>=7]]}
 function earn(){let change=false;const m=model();rules().forEach((r,i)=>{if(r[3]&&!m.awards[i]){m.awards[i]=new Date().toISOString();change=true}});return change}
 function badges(){if(page!=='Badges')return;const m=model(),rs=rules(),key=JSON.stringify(m.awards),old=document.getElementById('timeForYouBadges');if(old?.dataset.status===key)return;const s=card('Time for You badges · '+Object.keys(m.awards).length+'/20');s.classList.add('achievement-collection');s.id='timeForYouBadges';s.dataset.status=key;s.append(el('p','Earned from activities you confirm. Snoozes, moods and missed reminders never count against you.'));const g=el('div',undefined,'achievement-grid');rs.forEach(([name,icon,desc],i)=>{const a=el('article',undefined,'achievement-tile '+(m.awards[i]?'earned':'locked')),medal=el('div',icon,'achievement-medal');medal.style.setProperty('--medal',['#e9ad38','#e686b1','#8cb8eb','#b59be2','#7bbda0','#e8a477'][i%6]);a.append(medal,el('h3',name),el('p',desc),el('small',m.awards[i]?'Earned':'🔒 Locked'));g.append(a)});s.append(g);if(old)old.replaceWith(s);else document.getElementById('content').append(s)}
 const categories={
  rest:['Get cozy','☾'],beauty:['Beauty & style','✧'],faith:['Faith','♡'],
  music:['Music & singing','♫'],creative:['Make something','✦'],play:['Play a game','♟'],
  outdoors:['Water & outdoors','≈'],social:['Time together','♥']
 };
 const categoryFor=a=>originalCategories[a.id]||a.category;
 const categoryName=a=>categories[categoryFor(a)]?.[0]||'Other';
 const badgeCategory={beauty:'rest',faith:'rest',music:'creative'};
 const duration=a=>a.minutes?a.minutes+' min':a.kind==='short'?'Quick break':'Longer break';
 function select(options){const control=el('select');for(const [value,label] of options)control.add(new Option(label,value));return control}
 function addActivity(refresh){
  const owner=state;
  const root=makeDialog('Add your own idea');
  const form=el('form',undefined,'tfy-form-grid');
  const name=input('text');name.required=true;name.maxLength=120;
  const kind=select([['short','Quick break'],['long','Longer break']]);
  const cat=select(Object.entries(categories).map(([key,[label]])=>[key,label]));
  const submit=el('button','Save idea','primary');submit.type='submit';
  form.append(field('Activity name',name),field('Time',kind),field('Category',cat),submit,btn('Cancel',close));
  root.append(form);name.focus();
  form.onsubmit=e=>{
   e.preventDefault();
   const title=name.value.trim();
   if(!title||state!==owner)return;
   model().activities.unshift({id:crypto.randomUUID(),name:title,kind:kind.value,category:cat.value,enabled:true});
   log('activity_added',{activity:title});persist();close();refresh();
  };
 }
 function library(root){
  const header=el('div',undefined,'joy-heading');
  const title=el('h3','Browse ideas');title.tabIndex=-1;title.id='joy-library-heading';
  const filters=el('div',undefined,'joy-filters');
  const search=input('search');search.placeholder='Try “pool,” “Rick,” or “karaoke”';
  const time=select([['','Any length'],['short','Quick break'],['long','Longer break']]);
  const category=select([['','All categories'],...Object.entries(categories).map(([key,[label]])=>[key,label])]);
  const view=select([['','Available ideas'],['favorites','Favorites'],['paused','Paused ideas']]);
  filters.append(field('Search',search),field('Time',time),field('Category',category),field('Collection',view));
  const status=el('p',undefined,'joy-meta');status.setAttribute('role','status');
  const grid=el('div',undefined,'joy-grid');
  const pager=el('div',undefined,'joy-actions');
  const pageSize=9;
  let limit=pageSize,lastSuggestion='';
  const add=btn('+ Add an idea',()=>addActivity(()=>{
   search.value='';time.value='';category.value='';view.value='';update();
  }),'joy-button');
  header.append(title,add);
  root.append(header,filters,status,grid,pager);

  function choices(){
   const query=search.value.trim().toLowerCase();
   return model().activities.filter(a=>
    (view.value==='paused'?!a.enabled:a.enabled)
    &&(view.value!=='favorites'||a.favorite)
    &&(!time.value||a.kind===time.value)
    &&(!category.value||categoryFor(a)===category.value)
    &&(!query||[a.name,a.description,categoryName(a)].join(' ').toLowerCase().includes(query)));
  }
  function tile(a){
   const card=el('article',undefined,'joy-tile');card.dataset.category=categoryFor(a);
   const meta=el('div',undefined,'joy-tile-top');
   const fav=btn(a.favorite?'♥':'♡',()=>{
    a.favorite=!a.favorite;persist();
    if(!a.favorite&&view.value==='favorites'){draw();title.focus()}else paintFavorite();
   },'joy-icon');
   function paintFavorite(){
    fav.textContent=a.favorite?'♥':'♡';
    fav.setAttribute('aria-label','Favorite '+a.name);
    fav.setAttribute('aria-pressed',String(Boolean(a.favorite)));
   }
   paintFavorite();
   meta.append(el('small',categoryName(a)+' · '+duration(a)),fav);
   card.append(meta,el('h4',a.name));
   if(a.description)card.append(el('p',a.description));
   const actions=el('div',undefined,'joy-actions');
   if(a.enabled)actions.append(btn('Choose',()=>model().pending?completePending():choose(a),'joy-button'));
   actions.append(btn(a.enabled?'Pause':'Restore',()=>{
    a.enabled=!a.enabled;log('activity_setting',{activity:a.name,enabled:a.enabled});persist();draw();title.focus();
   },'joy-text'));
   card.append(actions);
   return card;
  }
  function draw(){
   const results=choices();
   status.textContent=results.length+' '+(results.length===1?'idea':'ideas');
   grid.replaceChildren(...results.slice(0,limit).map(tile));
   if(!results.length)grid.append(el('p',view.value==='favorites'?'No favorites match. Tap a heart on an idea to save it.':'No ideas match. Try a different search or filter.'));
   pager.replaceChildren();
   if(results.length>limit)pager.append(btn('Show more ideas',()=>{
    const previousLimit=limit;limit+=pageSize;draw();
    grid.children[previousLimit]?.querySelector('button')?.focus();
   },'joy-button'));
  }
  function update(){limit=pageSize;draw()}
  search.addEventListener('input',update);
  for(const control of [time,category,view])control.addEventListener('change',update);
  update();
  return {
   remember(activity){lastSuggestion=activity?.id||''},
   browse(collection){
    search.value='';time.value='';category.value='';view.value=collection;update();title.focus();
   },
   suggest(){
    const results=choices().filter(a=>a.enabled);
    const fresh=results.filter(a=>a.id!==lastSuggestion);
    const pool=fresh.length?fresh:results;
    if(!pool.length)return null;
    const activity=pool[Math.floor(Math.random()*pool.length)];
    lastSuggestion=activity.id;
    return activity;
   }
  };
 }
 function mood(f){return f?faces[f.face-1]+' '+(f.words.join(', ')||['Very low','Low','Neutral','Good','Very good'][f.face-1])+(f.note?' — '+f.note:''):'Not recorded'}
 function history(root){const m=model(),box=card('My activity history');box.append(el('p',m.completed.length+' activities confirmed. All reminder actions are recorded below.'));for(const c of [...m.completed].reverse().slice(0,historyLimit)){const a=el('article',undefined,'tfy-history');a.append(el('h3',c.name),el('small',new Date(c.completedAt).toLocaleString()),el('p','Before: '+mood(c.before)),el('p','After: '+mood(c.after)));box.append(a)}const details=el('details');details.append(el('summary','Reminder and suggestion history'));for(const h of [...m.history].reverse().slice(0,historyLimit))details.append(el('p',new Date(h.at).toLocaleString()+' · '+h.type.replaceAll('_',' ')+(h.activity?' · '+h.activity:'')+(h.until?' · Until '+new Date(h.until).toLocaleString():'')));box.append(details);if(m.history.length>historyLimit||m.completed.length>historyLimit)box.append(btn('Show more history',()=>{historyLimit+=30;const parent=box.parentNode;box.remove();history(parent);parent.querySelector('summary').focus()}));root.append(box)}
 function paint(){
  const content=document.getElementById('content');
  const root=el('div',undefined,'little-joys');
  const hero=el('section',undefined,'joy-hero');
  const copy=el('div',undefined,'joy-intro');
  copy.append(el('h2','Little Joys'),el('p','Pick something that sounds good right now.'));
  const actions=el('div',undefined,'joy-actions');
  const feature=el('div',undefined,'joy-feature');
  feature.setAttribute('aria-live','polite');
  const browse=el('section',undefined,'joy-library');
  browse.setAttribute('aria-labelledby','joy-library-heading');
  const collection=library(browse);
  const pending=model().pending;
  if(pending){
   feature.append(el('small','Your chosen activity'),el('h3',pending.name));
   actions.append(btn('I did this',completePending,'joy-primary'),btn('Let this one go',()=>{
    log('activity_cancelled',{activity:pending.name});model().pending=null;
    schedule(model().settings.interval);persist();render();
   },'joy-button'));
  }else{
   function showIdea(a){
    feature.replaceChildren(el('small',a?categoryName(a)+' · '+duration(a):'Surprise me'));
    if(!a){feature.append(el('h3','Try a different filter'),el('p','Surprise me uses the available ideas that match your search.'));return}
    feature.append(el('h3',a.name));
    if(a.description)feature.append(el('p',a.description));
    feature.append(btn('Choose this idea',()=>choose(a),'joy-button'));
   }
   const featured=model().activities.find(a=>a.id==='joy-pajama-reset'&&a.enabled)||model().activities.find(a=>a.enabled);
   showIdea(featured);collection.remember(featured);
   actions.append(btn('✦ Surprise me',()=>showIdea(collection.suggest()),'joy-primary'));
  }
  actions.append(btn('♡ Favorites',()=>collection.browse('favorites'),'joy-button'),btn('Browse ideas',()=>collection.browse(''),'joy-button'));
  copy.append(actions);
  hero.append(copy,feature);
  root.append(hero,browse);
  const archive=el('details',undefined,'joy-archive');
  archive.append(el('summary','Activity history · '+model().completed.length+' recorded'));
  history(archive);
  root.append(archive);
  content.replaceChildren(root);
 }
 addEventListener('dashboard:account-changing',close);
 function nav(){const n=document.querySelector('aside nav');if(n&&!n.querySelector('[data-time-for-you]')){const b=btn('☀  Time for You',()=>go('Time for You'));b.dataset.timeForYou='';n.append(b)}if(page==='Time for You')n?.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.hasAttribute('data-time-for-you')))}
 const prior=render;render=function(){const mine=page==='Time for You';if(mine)page='Quick notes';try{prior()}finally{if(mine)page='Time for You'}nav();if(mine){document.body.dataset.glowPage='Time for You';document.getElementById('appPageTitle').textContent='Little Joys';document.getElementById('title').textContent='Little Joys';document.getElementById('description').textContent='';paint()}if(earn())save();badges()};
 const oldSave=save;let refreshQueued=false;save=function(){const result=oldSave();if(!refreshQueued){refreshQueued=true;queueMicrotask(()=>{refreshQueued=false;badges()})}return result};
 // Automatic reminder timers intentionally removed. Manual activities remain available.
 render();
})();
