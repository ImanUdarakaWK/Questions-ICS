let tempAv = null;

/* ── random alias generator ── */
const px = ['Cyber','Shadow','Ghost','Stealth','Phantom','Binary','Crypto','Neon','Dark','Void','Hex','Neural','Quantum','Pixel','Sigma','Delta','Rogue','Null','Zero','Proxy'];
const sx = ['Hacker','Agent','Cipher','Wolf','Hawk','Byte','Node','Core','Matrix','Shell','Root','Pulse','Nexus','Blade','Specter','Reaper','Warden','Dagger'];
const gen = () => px[~~(Math.random() * px.length)] + '_' + sx[~~(Math.random() * sx.length)] + '_' + (~~(Math.random() * 9000) + 1000);

function roll() {
  document.getElementById('guest-inp').value = gen();
}

function alert2(el, msg, t) {
  el.textContent = msg;
  el.className = `al al-${t === 'e' ? 'e' : 's'} on`;
}

function guestPlay() {
  const name = (document.getElementById('guest-inp').value.trim()) || gen();
  const us = db.users();
  if (!us.find(u => u.username === name))
    us.push({ username: name, password: null, scores: [], isGuest: true, joinedAt: new Date().toISOString() });
  db.save(us);
  db.setMe(name);
  enterApp(true);
}

function logout() {
  db.clrMe();
  tempAv = null;
  showView('view-home');
}

/* ── avatar upload on register page ── */
document.getElementById('av-inp').addEventListener('change', e => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = ev => {
    tempAv = ev.target.result;
    document.getElementById('av-ring').innerHTML = `<img src="${tempAv}" alt="av">`;
  };
  r.readAsDataURL(f);
});

/* ── login ── */
document.getElementById('l-form').addEventListener('submit', e => {
  e.preventDefault();
  const n  = document.getElementById('l-u').value.trim();
  const p  = document.getElementById('l-p').value;
  const al = document.getElementById('l-al');
  const u  = db.user(n);
  if (!u || u.isGuest || u.password !== btoa(p)) { alert2(al, 'Invalid username or password.', 'e'); return; }
  db.setMe(n);
  db.logEvent(n, 'login', 'password auth');
  if (db.isAdmin(n)) { enterAdmin(); return; }
  enterApp();
});

/* ── register ── */
document.getElementById('r-form').addEventListener('submit', e => {
  e.preventDefault();
  const n  = document.getElementById('r-u').value.trim();
  const p  = document.getElementById('r-p').value;
  const c  = document.getElementById('r-c').value;
  const al = document.getElementById('r-al');
  if (p !== c) { alert2(al, 'Passwords do not match.', 'e'); return; }
  const us = db.users();
  if (us.find(u => u.username === n)) { alert2(al, 'Username already taken.', 'e'); return; }
  us.push({ username: n, password: btoa(p), scores: [], isGuest: false, joinedAt: new Date().toISOString() });
  db.save(us);
  if (tempAv) db.setAv(n, tempAv);
  db.setMe(n);
  alert2(al, 'Account created! Loading…', 's');
  setTimeout(enterApp, 750);
});

/* ── seed the alias field on page load ── */
document.getElementById('guest-inp').value = gen();
