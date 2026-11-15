(function () {
  const greeting = document.getElementById('dashboardGreeting');
  const dialog = document.getElementById('dashboardProfile');
  const form = dialog.querySelector('form');
  const name = form.elements.displayName;
  const bridge = window.DashboardSyncBridge;

  function displayName() {
    const value = state.profile?.displayName || bridge.accountDisplayName;
    return typeof value === 'string' ? value.trim().slice(0, 80) : '';
  }

  const sidebar=document.querySelector('body > aside');
  const avatar=document.createElement('button');
  avatar.type='button';
  avatar.className='dashboard-profile-avatar';
  avatar.setAttribute('aria-label','Edit your profile');
  const picture=document.createElement('img');
  picture.alt='';
  const initial=document.createElement('span');
  const caption=document.createElement('span');
  caption.className='dashboard-profile-caption';
  avatar.append(picture,initial,caption);
  sidebar?.prepend(avatar);

  const photoField=document.createElement('label');
  photoField.textContent='Profile photo';
  const file=document.createElement('input');
  file.type='file';
  file.accept='image/jpeg,image/png,image/webp,image/avif,image/gif';
  photoField.append(file);
  const removePhoto=document.createElement('button');
  removePhoto.type='button';
  removePhoto.className='secondary';
  removePhoto.textContent='Remove photo';
  const photoStatus=document.createElement('p');
  photoStatus.setAttribute('role','status');
  form.querySelector('.actions').before(photoField,removePhoto,photoStatus);
  const photoPattern=/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/;
  let draftPhoto='', uploadGeneration=0, reading=false, cropImage=null;
  const crop=document.createElement('fieldset');
  crop.className='profile-crop';
  const preview=document.createElement('canvas');preview.width=preview.height=160;
  preview.setAttribute('aria-label','Profile photo preview');
  const cropInputs={};
  for(const [key,text,min,max,value] of [['zoom','Zoom',1,3,1],['x','Horizontal position',0,100,50],['y','Vertical position',0,100,50]]){
    const label=document.createElement('label');label.textContent=text;
    const control=document.createElement('input');control.type='range';control.min=min;control.max=max;control.step=key==='zoom'?'.01':'1';control.value=value;
    cropInputs[key]=control;control.oninput=paintCrop;label.append(control);crop.append(label);
  }
  crop.prepend(preview);crop.hidden=true;
  photoField.after(crop);
  function resetCrop(){cropInputs.zoom.value=1;cropInputs.x.value=50;cropInputs.y.value=50}
  function paintCrop(){
    if(!cropImage)return;
    const {naturalWidth:w,naturalHeight:h}=cropImage;
    const size=Math.min(w,h)/Number(cropInputs.zoom.value);
    const context=preview.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,160,160);
    context.drawImage(cropImage,(w-size)*cropInputs.x.value/100,(h-size)*cropInputs.y.value/100,size,size,0,0,160,160);
    draftPhoto=preview.toDataURL('image/jpeg',.8);
  }
  async function loadCrop(source){
    const image=new Image();image.src=source;await image.decode();return image;
  }

  function avatarPhoto() {
    const photo=state.profile?.photo;
    return typeof photo==='string'&&photo.length<=45000&&photoPattern.test(photo)?photo:'';
  }
  function updateAvatar(){
    const photo=avatarPhoto();
    if(photo)picture.src=photo;
    else picture.removeAttribute('src');
    picture.hidden=!photo;
    initial.hidden=Boolean(photo);
    initial.textContent=Array.from(displayName())[0]?.toUpperCase()||'•';
    caption.textContent=displayName()||'Your profile';
  }
  function openProfile(){
    uploadGeneration++;
    reading=false;
    draftPhoto=avatarPhoto();
    cropImage=null;crop.hidden=true;resetCrop();
    if(draftPhoto){
      const generation=uploadGeneration;
      loadCrop(draftPhoto).then(image=>{
        if(generation!==uploadGeneration)return;
        cropImage=image;crop.hidden=false;
        preview.getContext('2d').drawImage(image,0,0,160,160);
      }).catch(()=>{});
    }
    file.value='';
    removePhoto.disabled=!draftPhoto;
    photoStatus.textContent='';
    name.value=displayName();
    name.setCustomValidity('');
    if(!dialog.open)dialog.showModal();
  }
  avatar.onclick=openProfile;
  window.DashboardProfile={open:openProfile};

  file.onchange=async()=>{
    const photo=file.files[0];
    if(!photo)return;
    const generation=++uploadGeneration;
    reading=true;
    photoStatus.textContent='Preparing photo…';
    try{
      if(photo.size>20*1024*1024)throw new Error('Choose a photo under 20 MB.');
      const url=URL.createObjectURL(photo);
      try{
        const image=await loadCrop(url);
        if(generation!==uploadGeneration)return;
        cropImage=image;resetCrop();crop.hidden=false;paintCrop();
      }finally{URL.revokeObjectURL(url)}
      removePhoto.disabled=false;
      photoStatus.textContent='Photo ready. Select Save profile to apply it.';
    }catch(error){
      if(generation===uploadGeneration)photoStatus.textContent='Choose a photo your browser can open.';
    }finally{
      if(generation===uploadGeneration)reading=false;
    }
  };
  removePhoto.onclick=()=>{
    uploadGeneration++;
    reading=false;
    draftPhoto='';cropImage=null;crop.hidden=true;
    file.value='';
    removePhoto.disabled=true;
    photoStatus.textContent='Photo will be removed when you save.';
  };
  dialog.addEventListener('close',()=>{if(!dialog.open){uploadGeneration++;reading=false}});

  function placeGreeting() {
    const scripture = document.getElementById('homeBibleHero');
    if (scripture) scripture.before(greeting);
    else greeting.remove();
  }

  const renderDashboard = render;
  render = function () {
    renderDashboard();
    placeGreeting();
  };

  function updateGreeting() {
    const hour = new Date().getHours();
    const salutation = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const userName = displayName();
    greeting.textContent = userName ? salutation + ', ' + userName : salutation;
    updateAvatar();
  }

  document.getElementById('editDashboardProfile').onclick = openProfile;
  dialog.querySelector('[data-profile-cancel]').onclick = () => dialog.close();
  name.oninput = () => name.setCustomValidity('');
  form.onsubmit = event => {
    event.preventDefault();
    if(reading){photoStatus.textContent='Wait for the photo to finish preparing.';return}
    const value = name.value.trim();
    if (!value) {
      name.setCustomValidity('Enter the name you want to see on your dashboard.');
      name.reportValidity();
      return;
    }
    state.profile = { ...state.profile, displayName: value };
    if(draftPhoto)state.profile.photo=draftPhoto;
    else delete state.profile.photo;
    save();
    updateGreeting();
    dialog.close();
  };
  window.addEventListener('dashboard:account-changing', () => {
    if (dialog.open) dialog.close();
  });
  window.addEventListener('dashboard:data-applied', updateGreeting);
  window.addEventListener('dashboard:profile-changed', updateGreeting);
  placeGreeting();
  updateGreeting();
  setInterval(updateGreeting, 1000 * 15);
})();
