(function () {
  function preview(data, today) {
    const core = window.CashFlowCore;
    const model = window.FinanceTools.financeSetup(data.cashFlow || core.init());
    const report = core.forecast(model, today, 0);
    const sum = accounts => accounts.every(account => Number.isSafeInteger(account.current))
      ? accounts.reduce((total, account) => total + account.current, 0) : null;
    const tasks = (data.priorities || []).filter(task => !task.done && typeof task.title === 'string')
      .map(task => ({title: task.title.slice(0, 120), due: /^\d{4}-\d{2}-\d{2}$/.test(task.date || '') ? task.date : ''}))
      .sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999')).slice(0, 3);
    return {savedCents: sum(report.savings), clearedCheckingCents: sum(report.accounts), tasks};
  }

  window.DashboardWidgetConnection = {
    attach({firebase, db, auth, projectId}) {
      const collection = uid => firebase.collection(db, 'widgetPreviews', uid, 'connections');
      const payload = data => ({...preview(data, localDate(new Date())), updatedAt: firebase.serverTimestamp()});
      const controls = document.getElementById('appSettingsContent');
      if (!controls) return null;

      const panel = document.createElement('details');
      const heading = document.createElement('summary');
      heading.textContent = 'Widget connections';
      const message = document.createElement('p');
      message.setAttribute('role', 'status');
      const key = document.createElement('textarea');
      key.readOnly = true;
      key.rows = 3;
      key.hidden = true;
      key.setAttribute('aria-label', 'Widget pairing code');
      const list = document.createElement('div');
      const pair = document.createElement('button');
      pair.type = 'button';
      pair.textContent = 'Create pairing code';
      const copy = document.createElement('button');
      copy.type = 'button';
      copy.textContent = 'Copy pairing code';
      copy.hidden = true;
      panel.append(heading, pair, message, key, copy, list);
      controls.append(panel);
      let published = Promise.resolve();
      let readyUid = '';

      function reset() {
        panel.open = false;
        panel.hidden = true;
        readyUid = '';
        key.value = '';
        key.hidden = copy.hidden = true;
        list.replaceChildren();
        message.textContent = '';
      }
      reset();
      addEventListener('dashboard:account-changing', reset);

      async function refresh(uid) {
        const records = await firebase.getDocsFromServer(collection(uid));
        if (readyUid !== uid || auth.currentUser?.uid !== uid) return;
        list.replaceChildren();
        for (const record of records.docs) {
          const revoke = document.createElement('button');
          revoke.type = 'button';
          revoke.textContent = 'Revoke connection · ' + record.id.slice(-6);
          revoke.onclick = async () => {
            revoke.disabled = true;
            try {
              await firebase.deleteDoc(record.ref);
              if (readyUid !== uid) return;
              key.value = '';
              key.hidden = copy.hidden = true;
              message.textContent = 'Connection revoked.';
              await refresh(uid);
            } catch {
              if (readyUid === uid) message.textContent = 'Could not revoke this connection. Try again.';
            } finally { revoke.disabled = false; }
          };
          list.append(revoke);
        }
      }
      const unavailable = 'Widget connection unavailable. The dashboard owner may need to publish the widget Firestore rules.';
      panel.addEventListener('toggle', () => {
        const uid = readyUid;
        if (panel.open && uid) refresh(uid).catch(() => { if (readyUid === uid) message.textContent = unavailable; });
      });
      pair.onclick = async () => {
        const uid = readyUid;
        if (!uid || auth.currentUser?.uid !== uid) return;
        pair.disabled = true;
        key.value = '';
        key.hidden = copy.hidden = true;
        try {
          const token = [...crypto.getRandomValues(new Uint8Array(32))].map(byte => byte.toString(16).padStart(2, '0')).join('');
          const data = window.DashboardSyncBridge.snapshot().state;
          await firebase.setDoc(firebase.doc(collection(uid), token), payload(data));
          if (readyUid !== uid || auth.currentUser?.uid !== uid) return;
          key.value = [projectId, uid, token].join('.');
          key.hidden = copy.hidden = false;
          message.textContent = 'Paste this private pairing code into Scriptable.';
          await refresh(uid);
        } catch {
          if (readyUid === uid) message.textContent = unavailable;
        } finally { pair.disabled = false; }
      };
      copy.onclick = async () => {
        try { await navigator.clipboard.writeText(key.value); message.textContent = 'Pairing code copied.'; }
        catch { key.select(); message.textContent = 'Copy the selected pairing code.'; }
      };

      return {
        ready(uid) { readyUid = uid; panel.hidden = false; },
        publish(uid, data) {
          published = published.catch(() => {}).then(async () => {
            if (uid !== readyUid || auth.currentUser?.uid !== uid) return;
            const records = await firebase.getDocsFromServer(collection(uid));
            if (uid !== readyUid || auth.currentUser?.uid !== uid || records.empty) return;
            const value = payload(data);
            // An update can never recreate a connection deleted by another device.
            await Promise.allSettled(records.docs.map(record => firebase.updateDoc(record.ref, value)));
          }).catch(() => {});
        }
      };
    }
  };
})();
