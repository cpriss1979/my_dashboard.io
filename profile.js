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
  let draftPhoto='', uploadGeneration=0, reading=false;

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
    file.value='';
    removePhoto.disabled=!draftPhoto;
    photoStatus.textContent='';
    name.value=displayName();
    name.setCustomValidity('');
    if(!dialog.open)dialog.showModal();
  }
  avatar.onclick=openProfile;

  async function resizePhoto(source){
    const url=URL.createObjectURL(source);
    try{
      const image=new Image();
      await new Promise((resolve,reject)=>{
        image.onload=resolve;image.onerror=()=>reject(new Error('Choose a photo your browser can open.'));
        image.src=url;
      });
      const size=Math.min(image.naturalWidth,image.naturalHeight);
      if(!size)throw new Error('This photo could not be opened.');
      const canvas=document.createElement('canvas');
      canvas.width=canvas.height=160;
      const context=canvas.getContext('2d');
      context.fillStyle='#fff';context.fillRect(0,0,160,160);
      context.drawImage(image,(image.naturalWidth-size)/2,(image.naturalHeight-size)/2,size,size,0,0,160,160);
      const data=canvas.toDataURL('image/jpeg',.8);
      if(!photoPattern.test(data)||data.length>45000)throw new Error('Choose a smaller photo.');
      return data;
    }finally{URL.revokeObjectURL(url)}
  }
  file.onchange=async()=>{
    const photo=file.files[0];
    if(!photo)return;
    const generation=++uploadGeneration;
    reading=true;
    photoStatus.textContent='Preparing photo…';
    try{
      if(photo.size>20*1024*1024)throw new Error('Choose a photo under 20 MB.');
      const prepared=await resizePhoto(photo);
      if(generation!==uploadGeneration)return;
      draftPhoto=prepared;
      removePhoto.disabled=false;
      photoStatus.textContent='Photo ready. Select Save profile to apply it.';
    }catch(error){
      if(generation===uploadGeneration)photoStatus.textContent=error.message;
    }finally{
      if(generation===uploadGeneration)reading=false;
    }
  };
  removePhoto.onclick=()=>{
    uploadGeneration++;
    reading=false;
    draftPhoto='';
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
