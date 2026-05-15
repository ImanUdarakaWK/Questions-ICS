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
  ['dash','quiz','tools','exams'].forEach(x => {
    const el = document.getElementById('pg-' + x);
    if (el) el.style.display = 'none';
    const nb = document.getElementById('nb-' + x);
    if (nb) nb.classList.remove('on');
  });
  const target = document.getElementById('pg-' + p);
  if (target) target.style.display = (p === 'dash') ? 'flex' : 'block';
  const tab = document.getElementById('nb-' + p);
  if (tab) tab.classList.add('on');
  db.updateActivity(db.me(), p);
  if (p === 'dash')  renderDash();
  if (p === 'quiz')  renderQuiz();
  if (p === 'tools') renderTools();
  if (p === 'exams') renderExamsPage();
}

function enterApp(toQuiz = false) {
  const me = db.me(), u = db.user(me);
  document.getElementById('nav-nm').textContent = me;
  document.getElementById('gtag').style.display = u && u.isGuest ? 'inline' : 'none';
  renderNavAv(me);
  showView('view-app');
  pg(toQuiz ? 'quiz' : 'dash');
}

function enterAdmin() {
  showView('view-admin');
  initAdmin();
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

/* ── written exams page (user side) ── */
function renderExamsPage() {
  const con = document.getElementById('pg-exams');
  if (!con) return;
  const exams = db.exams().filter(e => e.published);
  const myAns = db.answers().filter(a => a.username === db.me());
  con.innerHTML = `
    <div style="padding:26px 22px;max-width:1060px;margin:0 auto;width:100%;">
      <div class="ph"><div class="ph-t">// WRITTEN EXAMS</div><div class="ph-s">> Submit your answers · Instructor will grade them</div></div>
      ${exams.length ? exams.map(ex => {
        const done = myAns.filter(a => a.examId === ex.id);
        const graded = done.filter(a => a.grade !== null);
        return `<div class="adm-card" style="margin-bottom:14px;">
          <div class="adm-card-t">${ex.icon||'📝'} ${ex.title} <span class="diff-badge">${ex.questions?.length||0} Q</span> <span class="diff-badge">${ex.timeLimit||0}min</span></div>
          <div style="color:var(--muted);font-size:.82em;margin-bottom:14px;">${ex.description||''}</div>
          <div style="font-size:.78em;color:var(--g2);font-family:var(--mono);margin-bottom:12px;">
            Submitted: ${done.length} / ${ex.questions?.length||0} &nbsp;·&nbsp; Graded: ${graded.length}
            ${graded.length ? ' &nbsp;·&nbsp; Score: ' + graded.reduce((s,a)=>s+(a.grade||0),0) + '/' + ex.questions?.reduce((s,q)=>s+(q.marks||1),0) : ''}
          </div>
          <button class="adm-btn primary" onclick="openWrittenExam('${ex.id}')">📝 Open Exam</button>
        </div>`;
      }).join('') : '<div class="empty">// No written exams published yet</div>'}
    </div>`;
}

let _examTimer = null;
function openWrittenExam(examId) {
  const ex = db.exam(examId); if (!ex) return;
  if (_examTimer) { clearInterval(_examTimer); _examTimer = null; }
  const modal = document.getElementById('modal-written-exam');
  const body = document.getElementById('written-exam-body');
  const myAns = db.answers().filter(a => a.username === db.me() && a.examId === examId);
  let timeLeft = (ex.timeLimit || 60) * 60;
  body.innerHTML = `
    <div style="margin-bottom:18px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
      <div><div style="font-family:var(--mono);font-size:1.1em;color:var(--g);">${ex.title}</div>
      <div style="color:var(--muted);font-size:.82em;margin-top:3px;">${ex.description||''}</div></div>
      <div style="font-family:var(--mono);font-size:1.3em;color:var(--g);" id="exam-timer">--:--</div>
    </div>
    ${(ex.questions||[]).map((q,i) => {
      const prev = myAns.find(a => a.questionId === q.id);
      return `<div class="qb" style="margin-bottom:14px;">
        <div class="qt">${i+1}. ${q.text} <span style="color:var(--g2);font-size:.75em;font-family:var(--mono);">[${q.marks||1} mark${q.marks>1?'s':''}]</span></div>
        ${prev ? `<div style="background:rgba(0,255,65,.04);border-left:3px solid var(--g2);padding:10px 14px;border-radius:8px;font-size:.83em;color:var(--g3);font-family:var(--mono);margin-bottom:8px;">Previous answer: ${prev.text}</div>` : ''}
        <textarea id="we-${q.id}" class="tool-textarea" placeholder="Your answer..." style="width:100%;min-height:100px;">${prev?prev.text:''}</textarea>
      </div>`;
    }).join('')}
    <button class="sub-btn" onclick="submitWrittenExam('${examId}')">SUBMIT EXAM →</button>`;
  modal.classList.add('on');
  const timerEl = () => document.getElementById('exam-timer');
  _examTimer = setInterval(() => {
    timeLeft--;
    if (timeLeft <= 0) { clearInterval(_examTimer); submitWrittenExam(examId); return; }
    const m = String(Math.floor(timeLeft/60)).padStart(2,'0'), s = String(timeLeft%60).padStart(2,'0');
    const el = timerEl(); if (el) el.textContent = m + ':' + s;
    if (timeLeft < 60 && el) el.style.color = '#f87171';
  }, 1000);
}

function submitWrittenExam(examId) {
  if (_examTimer) { clearInterval(_examTimer); _examTimer = null; }
  const ex = db.exam(examId); if (!ex) return;
  const me = db.me();
  (ex.questions||[]).forEach(q => {
    const ta = document.getElementById('we-' + q.id);
    if (ta && ta.value.trim()) db.submitAnswer(me, examId, q.id, ta.value.trim());
  });
  document.getElementById('modal-written-exam').classList.remove('on');
  admAlert('Exam submitted! Awaiting instructor review.', 'ok');
  pg('exams');
}

/* ── seed admin + ICS module ── */
(function seed() {
  const us = db.users();
  if (!us.find(u => u.username === 'adminzypherbay')) {
    us.push({ username: 'adminzypherbay', password: btoa('Iman2004@@@@@'), scores: [], isGuest: false, isAdmin: true, joinedAt: new Date().toISOString() });
    db.save(us);
  }
  const mods = db.modules();
  if (!mods.find(m => m.id === 'ics')) {
    mods.push({ id: 'ics', name: 'Information & Cyber Security', code: 'IE2022', description: 'SLIIT ICS module — all exam topics from 2019–2024 papers', icon: '🔐', color: '#00FF41', builtIn: true, published: true, createdBy: 'adminzypherbay', createdAt: new Date().toISOString() });
    db.saveMods(mods);
  }
})();

/* ── init ── */
(function () {
  const me = db.me();
  if (me && db.user(me)) {
    if (db.isAdmin(me)) enterAdmin(); else enterApp();
  } else { db.clrMe(); showView('view-home'); }
})();
