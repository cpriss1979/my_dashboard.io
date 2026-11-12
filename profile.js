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

  function updateGreeting() {
    const hour = new Date().getHours();
    const salutation = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const userName = displayName();
    greeting.textContent = userName ? salutation + ', ' + userName : salutation;
  }

  document.getElementById('editDashboardProfile').onclick = () => {
    name.value = displayName();
    name.setCustomValidity('');
    dialog.showModal();
  };
  dialog.querySelector('[data-profile-cancel]').onclick = () => dialog.close();
  name.oninput = () => name.setCustomValidity('');
  form.onsubmit = event => {
    event.preventDefault();
    const value = name.value.trim();
    if (!value) {
      name.setCustomValidity('Enter the name you want to see on your dashboard.');
      name.reportValidity();
      return;
    }
    state.profile = { ...state.profile, displayName: value };
    save();
    updateGreeting();
    dialog.close();
  };
  window.addEventListener('dashboard:account-changing', () => {
    if (dialog.open) dialog.close();
  });
  window.addEventListener('dashboard:data-applied', updateGreeting);
  window.addEventListener('dashboard:profile-changed', updateGreeting);
  updateGreeting();
  setInterval(updateGreeting, 1000 * 15);
})();
