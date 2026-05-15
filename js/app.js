/* ── matrix rain ── */
(function () {
  const cv = document.getElementById('cv'), cx = cv.getContext('2d');
  const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*';
  let cols, drops;
  function resize() { cv.width = innerWidth; cv.height = innerHeight; cols = Math.floor(cv.width / 16); drops = Array(cols).fill(1); }
  resize(); addEventListener('resize', resize);
  setInterval(() => {
    cx.fillStyle = 'rgba(0,0,0,.045)'; cx.fillRect(0, 0, cv.width, cv.height);
    cx.font = '13px JetBrains Mono,monospace';
    drops.forEach((y, i) => {
      const c = chars[~~(Math.random() * chars.length)];
      cx.fillStyle = Math.random() > .95 ? '#fff' : '#00FF41';
      cx.fillText(c, i * 16, y * 16);
      if (y * 16 > cv.height && Math.random() > .975) drops[i] = 0;
      drops[i]++;
    });
  }, 42);
})();

/* ── typewriter ── */
(function () {
  const msgs = [
    '> Initializing assessment protocol...',
    '> 60 questions from IE2022 exam papers...',
    '> Test your Cyber Security knowledge...',
    '> Are you ready, agent?'
  ];
  let mi = 0, ci = 0, del = false;
  const el = document.getElementById('typer');
  function tick() {
    const m = msgs[mi];
    if (!del) {
      ci++; el.innerHTML = m.slice(0, ci) + '<span class="cur"></span>';
      if (ci === m.length) { del = true; setTimeout(tick, 2400); return; }
      setTimeout(tick, 44);
    } else {
      ci--; el.innerHTML = m.slice(0, ci) + '<span class="cur"></span>';
      if (ci === 0) { del = false; mi = (mi + 1) % msgs.length; setTimeout(tick, 400); return; }
      setTimeout(tick, 16);
    }
  }
  tick();
})();

/* ── routing ── */
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function pg(p) {
  document.getElementById('pg-dash').style.display = p === 'dash' ? 'block' : 'none';
  document.getElementById('pg-quiz').style.display = p === 'quiz' ? 'block' : 'none';
  document.getElementById('nb-d').classList.toggle('on', p === 'dash');
  document.getElementById('nb-q').classList.toggle('on', p === 'quiz');
  if (p === 'dash') renderDash();
  if (p === 'quiz') renderQuiz();
}

function enterApp(toQuiz = false) {
  const me = db.me(), u = db.user(me);
  document.getElementById('nav-nm').textContent = me;
  document.getElementById('gtag').style.display = u && u.isGuest ? 'inline' : 'none';
  renderNavAv(me);
  showView('view-app');
  pg(toQuiz ? 'quiz' : 'dash');
}

function renderNavAv(me) {
  const btn = document.getElementById('nav-av'), av = db.av(me);
  btn.innerHTML = av ? `<img src="${av}" alt="av">` : me.charAt(0).toUpperCase();
}

/* ── profile modal ── */
function openProf()  { const me = db.me(); renderProf(me); document.getElementById('mprof').classList.add('on'); }
function closeProf() { document.getElementById('mprof').classList.remove('on'); }

document.getElementById('mprof').addEventListener('click', e => {
  if (e.target === document.getElementById('mprof')) closeProf();
});

document.getElementById('pav-inp').addEventListener('change', e => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = ev => { const me = db.me(); if (!me) return; db.setAv(me, ev.target.result); renderNavAv(me); renderProf(me); };
  r.readAsDataURL(f);
});

function renderProf(me) {
  const u = db.user(me), av = db.av(me), el = document.getElementById('pav');
  el.innerHTML = av
    ? `<img src="${av}" alt="av"><div class="pav-ov">📸 Change</div>`
    : `<span id="pav-init">${me.charAt(0).toUpperCase()}</span><div class="pav-ov">📸 Add</div>`;
  document.getElementById('pname').value = me;
  document.getElementById('gn').style.display = u && u.isGuest ? 'block' : 'none';
  document.getElementById('preg-lnk').style.display = u && u.isGuest ? 'inline' : 'none';
  const al = document.getElementById('pal'); al.className = 'al'; al.textContent = '';
}

function saveProf() {
  const me = db.me(), newN = document.getElementById('pname').value.trim();
  const al = document.getElementById('pal');
  if (!newN || newN.length < 3) { alert2(al, 'Name must be at least 3 characters.', 'e'); return; }
  if (newN !== me) {
    const us = db.users();
    if (us.find(u => u.username === newN)) { alert2(al, 'That name is already taken.', 'e'); return; }
    const i = us.findIndex(u => u.username === me); if (i === -1) return;
    const av = db.av(me); if (av) db.setAv(newN, av);
    us[i].username = newN; db.save(us); db.setMe(newN);
    document.getElementById('nav-nm').textContent = newN;
    renderNavAv(newN);
  }
  alert2(al, 'Profile updated!', 's');
  setTimeout(closeProf, 900);
}

/* ── init ── */
(function () {
  const me = db.me();
  if (me && db.user(me)) enterApp(); else { db.clrMe(); showView('view-home'); }
})();
