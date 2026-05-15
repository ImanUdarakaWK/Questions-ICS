/* ══════════════════════════════════════════════════════════════
   admin.js — Admin panel logic for CyberQuiz
   Depends on: db.js (extended), data.js (Q array)
══════════════════════════════════════════════════════════════ */

/* ── helpers ── */
function timeAgo(iso) {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 10) return 'just now';
  if (s < 60) return s + 's ago';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  const d = Math.floor(h / 24);
  if (d < 30) return d + 'd ago';
  const mo = Math.floor(d / 30);
  if (mo < 12) return mo + 'mo ago';
  return Math.floor(mo / 12) + 'y ago';
}

function admAlert(msg, type) {
  const existing = document.querySelector('.adm-toast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.className = 'adm-toast ' + (type === 'err' ? 'err' : 'ok');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

/* ── db extensions (admin-specific localStorage keys) ── */
const adminDb = {
  modules:    () => JSON.parse(localStorage.getItem('cq_modules') || '[]'),
  saveModules: ms => localStorage.setItem('cq_modules', JSON.stringify(ms)),
  cqs:        () => JSON.parse(localStorage.getItem('cq_cqs') || '[]'),
  saveCqs:    qs => localStorage.setItem('cq_cqs', JSON.stringify(qs)),
  saveCq(q) {
    const qs = adminDb.cqs();
    const i = qs.findIndex(x => x.id === q.id);
    if (i === -1) { qs.push(q); } else { qs[i] = q; }
    adminDb.saveCqs(qs);
  },
  deleteCq(id) {
    adminDb.saveCqs(adminDb.cqs().filter(q => q.id !== id));
  },
  exams:      () => JSON.parse(localStorage.getItem('cq_exams') || '[]'),
  saveExams:  es => localStorage.setItem('cq_exams', JSON.stringify(es)),
  saveExam(ex) {
    const es = adminDb.exams();
    const i = es.findIndex(x => x.id === ex.id);
    if (i === -1) { es.push(ex); } else { es[i] = ex; }
    adminDb.saveExams(es);
  },
  deleteExam(id) {
    adminDb.saveExams(adminDb.exams().filter(e => e.id !== id));
  },
  answers:    () => JSON.parse(localStorage.getItem('cq_answers') || '[]'),
  saveAnswers: as => localStorage.setItem('cq_answers', JSON.stringify(as)),
  gradeAnswer(id, grade, feedback) {
    const as = adminDb.answers();
    const i = as.findIndex(a => a.id === id);
    if (i === -1) return;
    as[i].grade = grade;
    as[i].feedback = feedback;
    as[i].gradedAt = new Date().toISOString();
    adminDb.saveAnswers(as);
  },
  log:        () => JSON.parse(localStorage.getItem('cq_log') || '[]'),
  addLog(user, type, detail) {
    const log = adminDb.log();
    log.push({ ts: new Date().toISOString(), user, type, detail });
    if (log.length > 500) log.splice(0, log.length - 500);
    localStorage.setItem('cq_log', JSON.stringify(log));
  }
};

/* patch db object with admin-facing methods if not already present */
if (!db.cqs)       db.cqs       = adminDb.cqs;
if (!db.modules)   db.modules   = adminDb.modules;
if (!db.exams)     db.exams     = adminDb.exams;
if (!db.answers)   db.answers   = adminDb.answers;
if (!db.gradeAnswer) db.gradeAnswer = adminDb.gradeAnswer;

/* ── routing ── */
function admPg(p) {
  if (window._monInterval) { clearInterval(window._monInterval); window._monInterval = null; }
  document.querySelectorAll('.adm-pg').forEach(el => el.classList.remove('active'));
  const target = document.getElementById('adm-' + p);
  if (target) target.classList.add('active');
  document.querySelectorAll('.adm-tab').forEach(el => {
    el.classList.toggle('on', el.dataset.page === p);
  });
  const renders = {
    dash:    renderAdmDash,
    users:   renderAdmUsers,
    modules: renderAdmModules,
    qbank:   renderAdmQBank,
    exams:   renderAdmExams,
    answers: renderAdmAnswers,
    monitor: renderAdmMonitor,
    logs:    renderAdmLogs
  };
  if (renders[p]) renders[p]();
}

function exitAdmin() {
  document.getElementById('view-admin') && (document.getElementById('view-admin').style.display = 'none');
  showView('view-app');
  enterApp();
}

/* ── DASHBOARD ── */
function renderAdmDash() {
  const users   = db.users();
  const cqs     = adminDb.cqs();
  const mods    = adminDb.modules();
  const exams   = adminDb.exams();
  const answers = adminDb.answers();
  const log     = adminDb.log();

  const today   = new Date().toDateString();
  const todayAt = log.filter(e => new Date(e.ts).toDateString() === today && e.type === 'attempt').length;
  const ungraded = answers.filter(a => a.grade == null).length;
  const totalQ  = Q.length + cqs.length;

  const statsEl = document.getElementById('adm-dash-stats');
  if (statsEl) statsEl.innerHTML = `
    <div class="adm-stat"><div class="label">Total Users</div><div class="val">${users.length}</div><div class="sub">registered accounts</div></div>
    <div class="adm-stat"><div class="label">Questions</div><div class="val">${totalQ}</div><div class="sub">${Q.length} built-in · ${cqs.length} custom</div></div>
    <div class="adm-stat"><div class="label">Modules</div><div class="val">${mods.length}</div><div class="sub">topic modules</div></div>
    <div class="adm-stat"><div class="label">Exams</div><div class="val">${exams.length}</div><div class="sub">written exams</div></div>
    <div class="adm-stat"><div class="label">Today's Attempts</div><div class="val">${todayAt}</div><div class="sub">quiz attempts today</div></div>
    <div class="adm-stat"><div class="label">Ungraded</div><div class="val">${ungraded}</div><div class="sub">answers awaiting grade</div></div>`;

  const logEl = document.getElementById('adm-dash-log');
  if (logEl) {
    const recent = [...log].reverse().slice(0, 10);
    if (!recent.length) { logEl.innerHTML = '<div class="empty">// no activity yet</div>'; return; }
    logEl.innerHTML = `<table class="adm-table"><thead><tr><th>Time</th><th>User</th><th>Event</th><th>Detail</th></tr></thead><tbody>
      ${recent.map(e => `<tr><td style="color:var(--muted);font-family:var(--mono);font-size:.75em;">${timeAgo(e.ts)}</td><td>${e.user}</td><td><span class="badge badge-user">${e.type}</span></td><td style="color:var(--muted);max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${e.detail}</td></tr>`).join('')}
    </tbody></table>`;
  }
}

/* ── USERS ── */
function renderAdmUsers(filter) {
  const el = document.getElementById('adm-users-body');
  if (!el) return;
  let users = db.users();
  const q = (filter || (document.getElementById('adm-users-search') || {}).value || '').toLowerCase();
  if (q) users = users.filter(u => u.username.toLowerCase().includes(q));

  if (!users.length) { el.innerHTML = '<tr><td colspan="7"><div class="empty">// no users found</div></td></tr>'; return; }

  el.innerHTML = users.map(u => {
    const av  = db.av(u.username);
    const avEl = av
      ? `<img src="${av}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;vertical-align:middle;">`
      : `<span style="width:28px;height:28px;border-radius:50%;background:rgba(0,255,65,.1);border:1px solid var(--border2);display:inline-flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:.75em;color:var(--g);vertical-align:middle;">${u.username.charAt(0).toUpperCase()}</span>`;
    const role  = u.isAdmin ? '<span class="badge badge-admin">ADMIN</span>' : u.isGuest ? '<span class="badge badge-guest">GUEST</span>' : '<span class="badge badge-user">USER</span>';
    const best  = u.scores && u.scores.length ? Math.max(...u.scores.map(s => s.score)) : null;
    const bestS = best !== null ? best + '/' + TOTAL + ' (' + Math.round(best / TOTAL * 100) + '%)' : '—';
    const joined = u.joinedAt ? new Date(u.joinedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
    const del = u.username === 'adminzypherbay' ? '' : `<button class="adm-btn danger" onclick="deleteUser('${u.username}')">Delete</button>`;
    return `<tr>
      <td>${avEl}</td>
      <td style="font-family:var(--mono);">${u.username}</td>
      <td>${role}</td>
      <td style="color:var(--muted);font-size:.8em;">${joined}</td>
      <td style="font-family:var(--mono);">${u.scores ? u.scores.length : 0}</td>
      <td style="font-family:var(--mono);color:var(--g3);">${bestS}</td>
      <td style="display:flex;gap:6px;flex-wrap:wrap;"><button class="adm-btn" onclick="openUserModal('${u.username}')">Edit</button>${del}</td>
    </tr>`;
  }).join('');
}

function openUserModal(username) {
  const u = username ? db.user(username) : null;
  document.getElementById('modal-user-title').textContent = u ? '// EDIT USER' : '// NEW USER';
  document.getElementById('mu-username').value = u ? u.username : '';
  document.getElementById('mu-password').value = '';
  document.getElementById('mu-isadmin').checked = u ? !!u.isAdmin : false;
  document.getElementById('mu-orig').value = u ? u.username : '';
  document.getElementById('modal-user').classList.add('on');
}

function closeUserModal() {
  document.getElementById('modal-user').classList.remove('on');
}

function saveUserModal() {
  const orig    = document.getElementById('mu-orig').value;
  const newName = document.getElementById('mu-username').value.trim();
  const pass    = document.getElementById('mu-password').value;
  const isAdmin = document.getElementById('mu-isadmin').checked;

  if (!newName || newName.length < 3) { admAlert('Username must be at least 3 characters.', 'err'); return; }

  const us = db.users();

  if (!orig) {
    if (us.find(u => u.username === newName)) { admAlert('Username already taken.', 'err'); return; }
    if (!pass || pass.length < 6) { admAlert('Password must be at least 6 characters for new users.', 'err'); return; }
    us.push({ username: newName, password: btoa(pass), scores: [], isGuest: false, isAdmin, joinedAt: new Date().toISOString() });
    adminDb.addLog('admin', 'user_created', newName);
  } else {
    const i = us.findIndex(u => u.username === orig);
    if (i === -1) { admAlert('User not found.', 'err'); return; }
    if (newName !== orig && us.find(u => u.username === newName)) { admAlert('Username already taken.', 'err'); return; }
    if (pass && pass.length < 6) { admAlert('New password must be at least 6 characters.', 'err'); return; }
    us[i].username = newName;
    if (pass) us[i].password = btoa(pass);
    us[i].isAdmin = isAdmin;
    if (newName !== orig) {
      const av = db.av(orig);
      if (av) db.setAv(newName, av);
    }
    adminDb.addLog('admin', 'user_edited', newName);
  }

  db.save(us);
  closeUserModal();
  admAlert('User saved.', 'ok');
  renderAdmUsers();
}

function deleteUser(n) {
  if (n === 'adminzypherbay') { admAlert('Cannot delete root admin.', 'err'); return; }
  if (!confirm('Delete user "' + n + '"? This cannot be undone.')) return;
  const us = db.users().filter(u => u.username !== n);
  db.save(us);
  adminDb.addLog('admin', 'user_deleted', n);
  admAlert('User deleted.', 'ok');
  renderAdmUsers();
}

/* ── MODULES ── */
const _neonColors = ['#00FF41', '#22C55E', '#38bdf8', '#a78bfa', '#fb923c'];

function renderAdmModules() {
  const el = document.getElementById('adm-modules-grid');
  if (!el) return;
  const mods = adminDb.modules();
  if (!mods.length) { el.innerHTML = '<div class="empty">// no modules yet — create one!</div>'; return; }
  el.innerHTML = mods.map(m => `
    <div class="adm-card" style="border-color:${m.color}22;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
        <span style="font-size:1.6em;">${m.icon || '📁'}</span>
        <div>
          <div style="font-family:var(--mono);font-size:.9em;color:${m.color || 'var(--g)'};">${m.name}</div>
          <div style="font-size:.72em;color:var(--muted);font-family:var(--mono);">${m.code || ''}</div>
        </div>
      </div>
      <div style="font-size:.82em;color:var(--muted);margin-bottom:14px;line-height:1.5;">${m.description || ''}</div>
      <div style="display:flex;gap:8px;">
        <button class="adm-btn" onclick="openModuleModal('${m.id}')">Edit</button>
        <button class="adm-btn danger" onclick="deleteModule('${m.id}')">Delete</button>
      </div>
    </div>`).join('');
}

function openModuleModal(id) {
  const mods = adminDb.modules();
  const m = id ? mods.find(x => x.id === id) : null;
  document.getElementById('modal-module-title').textContent = m ? '// EDIT MODULE' : '// NEW MODULE';
  document.getElementById('mm-id').value     = m ? m.id : '';
  document.getElementById('mm-name').value   = m ? m.name : '';
  document.getElementById('mm-code').value   = m ? m.code : '';
  document.getElementById('mm-desc').value   = m ? m.description : '';
  document.getElementById('mm-icon').value   = m ? m.icon : '';
  const selColor = m ? m.color : _neonColors[0];
  document.querySelectorAll('.mm-color-btn').forEach(btn => {
    btn.classList.toggle('on', btn.dataset.color === selColor);
  });
  document.getElementById('mm-color').value  = selColor;
  document.getElementById('modal-module').classList.add('on');
}

function closeModuleModal() {
  document.getElementById('modal-module').classList.remove('on');
}

function saveModuleModal() {
  const id   = document.getElementById('mm-id').value;
  const name = document.getElementById('mm-name').value.trim();
  const code = document.getElementById('mm-code').value.trim();
  const desc = document.getElementById('mm-desc').value.trim();
  const icon = document.getElementById('mm-icon').value.trim() || '📁';
  const color = document.getElementById('mm-color').value || _neonColors[0];

  if (!name) { admAlert('Module name is required.', 'err'); return; }

  const mods = adminDb.modules();
  if (id) {
    const i = mods.findIndex(m => m.id === id);
    if (i !== -1) { mods[i] = { ...mods[i], name, code, description: desc, icon, color }; }
  } else {
    mods.push({ id: 'mod_' + Date.now(), name, code, description: desc, icon, color, createdAt: new Date().toISOString() });
  }
  adminDb.saveModules(mods);
  closeModuleModal();
  admAlert('Module saved.', 'ok');
  renderAdmModules();
}

function deleteModule(id) {
  if (!confirm('Delete this module?')) return;
  adminDb.saveModules(adminDb.modules().filter(m => m.id !== id));
  admAlert('Module deleted.', 'ok');
  renderAdmModules();
}

/* ── QUESTION BANK ── */
let _qbTab = 'builtin';

function renderAdmQBank() {
  const el = document.getElementById('adm-qbank-content');
  if (!el) return;
  if (_qbTab === 'builtin') renderQBankBuiltin();
  else renderQBankCustom();
}

function switchQBankTab(t) {
  _qbTab = t;
  document.querySelectorAll('.qb-tab').forEach(el => el.classList.toggle('on', el.dataset.tab === t));
  renderAdmQBank();
}

function renderQBankBuiltin() {
  const el = document.getElementById('adm-qbank-content');
  el.innerHTML = Q.map((q, i) => `
    <div style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,.04);display:flex;align-items:flex-start;gap:14px;">
      <span style="font-family:var(--mono);color:var(--muted);font-size:.75em;min-width:26px;margin-top:2px;">${i + 1}</span>
      <div style="flex:1;">
        <div style="font-size:.85em;line-height:1.5;margin-bottom:5px;">${q.q}</div>
        <span class="badge badge-user">MCQ</span>
        <span style="margin-left:6px;font-size:.7em;color:var(--muted);font-family:var(--mono);">${q.ans.length} correct</span>
      </div>
    </div>`).join('');
}

function renderQBankCustom() {
  const el = document.getElementById('adm-qbank-content');
  const cqs = adminDb.cqs();
  if (!cqs.length) { el.innerHTML = '<div class="empty">// no custom questions yet</div>'; return; }
  el.innerHTML = cqs.map((q, i) => {
    const typeLabel = q.type === 'written' ? '<span class="badge badge-admin">WRITTEN</span>' : '<span class="badge badge-user">MCQ</span>';
    const ver = q.version > 1 ? `<span class="diff-badge">v${q.version}</span>` : '';
    return `
    <div style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,.04);display:flex;align-items:flex-start;gap:14px;">
      <span style="font-family:var(--mono);color:var(--muted);font-size:.75em;min-width:26px;margin-top:2px;">${i + 1}</span>
      <div style="flex:1;">
        <div style="font-size:.85em;line-height:1.5;margin-bottom:6px;">${q.question} ${ver}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
          ${typeLabel}
          ${q.difficulty ? `<span class="badge" style="background:rgba(255,255,255,.05);color:var(--muted);border:1px solid rgba(255,255,255,.08);">${q.difficulty}</span>` : ''}
          ${q.tags ? q.tags.split(',').map(t => t.trim()).filter(Boolean).map(t => `<span class="badge badge-guest">${t}</span>`).join('') : ''}
        </div>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0;">
        <button class="adm-btn" onclick="viewQHistory('${q.id}')">History</button>
        <button class="adm-btn" onclick="openQModal('${q.id}')">Edit</button>
        <button class="adm-btn danger" onclick="deleteQ('${q.id}')">Delete</button>
      </div>
    </div>`;
  }).join('');
}

function openQModal(id) {
  const cqs = adminDb.cqs();
  const q = id ? cqs.find(x => x.id === id) : null;
  document.getElementById('modal-q-title').textContent = q ? '// EDIT QUESTION' : '// NEW QUESTION';
  document.getElementById('mq-id').value         = q ? q.id : '';
  document.getElementById('mq-question').value   = q ? q.question : '';
  document.getElementById('mq-explanation').value = q ? q.explanation || '' : '';
  document.getElementById('mq-tags').value        = q ? q.tags || '' : '';

  const mods = adminDb.modules();
  const modSel = document.getElementById('mq-module');
  modSel.innerHTML = '<option value="">— No Module —</option>' + mods.map(m => `<option value="${m.id}"${q && q.moduleId === m.id ? ' selected' : ''}>${m.name}</option>`).join('');

  const diff = q ? q.difficulty || 'Medium' : 'Medium';
  document.querySelectorAll('.mq-diff-btn').forEach(btn => btn.classList.toggle('on', btn.dataset.diff === diff));

  const type = q ? q.type || 'mcq' : 'mcq';
  document.querySelectorAll('.mq-type-btn').forEach(btn => btn.classList.toggle('on', btn.dataset.type === type));

  const opts = q && q.options ? q.options : ['', '', '', ''];
  const correct = q && q.correct ? q.correct : [];
  renderOptsBuilder(opts, correct);

  const optsSection = document.getElementById('mq-opts-section');
  if (optsSection) optsSection.style.display = type === 'written' ? 'none' : 'block';

  document.getElementById('modal-question').classList.add('on');
}

function renderOptsBuilder(opts, correct) {
  const el = document.getElementById('mq-opts-builder');
  if (!el) return;
  el.innerHTML = opts.map((o, i) => `
    <div class="opt-row" data-idx="${i}">
      <input type="checkbox" ${correct.includes(i) ? 'checked' : ''} title="Correct answer" onchange="syncOptCorrect(this,${i})">
      <input type="text" value="${o.replace(/"/g, '&quot;')}" placeholder="Option ${i + 1}" oninput="syncOptText(this,${i})">
      <button class="opt-del" onclick="removeOpt(${i})" title="Remove">✕</button>
    </div>`).join('');
}

function syncOptText(inp, i) {
  const rows = document.querySelectorAll('#mq-opts-builder .opt-row');
  const texts = Array.from(rows).map((r, ri) => ri === i ? inp.value : r.querySelector('input[type=text]').value);
  inp.dataset.val = inp.value;
}

function syncOptCorrect() {}

function addOpt() {
  const rows = document.querySelectorAll('#mq-opts-builder .opt-row');
  if (rows.length >= 8) { admAlert('Maximum 8 options.', 'err'); return; }
  const texts  = Array.from(rows).map(r => r.querySelector('input[type=text]').value);
  const correct = Array.from(rows).map((r, i) => r.querySelector('input[type=checkbox]').checked ? i : -1).filter(i => i !== -1);
  renderOptsBuilder([...texts, ''], correct);
}

function removeOpt(idx) {
  const rows = document.querySelectorAll('#mq-opts-builder .opt-row');
  if (rows.length <= 2) { admAlert('Minimum 2 options required.', 'err'); return; }
  const texts  = Array.from(rows).map(r => r.querySelector('input[type=text]').value);
  const correct = Array.from(rows).map((r, i) => r.querySelector('input[type=checkbox]').checked ? i : -1).filter(i => i !== -1);
  texts.splice(idx, 1);
  const newCorrect = correct.map(c => c > idx ? c - 1 : c).filter(c => c !== idx && c >= 0);
  renderOptsBuilder(texts, newCorrect);
}

function setQType(t) {
  document.querySelectorAll('.mq-type-btn').forEach(btn => btn.classList.toggle('on', btn.dataset.type === t));
  const optsSection = document.getElementById('mq-opts-section');
  if (optsSection) optsSection.style.display = t === 'written' ? 'none' : 'block';
}

function setQDiff(d) {
  document.querySelectorAll('.mq-diff-btn').forEach(btn => btn.classList.toggle('on', btn.dataset.diff === d));
}

function closeQModal() {
  document.getElementById('modal-question').classList.remove('on');
}

function saveQModal() {
  const id       = document.getElementById('mq-id').value;
  const question = document.getElementById('mq-question').value.trim();
  const exp      = document.getElementById('mq-explanation').value.trim();
  const tags     = document.getElementById('mq-tags').value.trim();
  const moduleId = document.getElementById('mq-module').value;
  const type     = document.querySelector('.mq-type-btn.on') ? document.querySelector('.mq-type-btn.on').dataset.type : 'mcq';
  const diff     = document.querySelector('.mq-diff-btn.on') ? document.querySelector('.mq-diff-btn.on').dataset.diff : 'Medium';

  if (!question) { admAlert('Question text is required.', 'err'); return; }

  let options = [];
  let correct = [];
  if (type === 'mcq') {
    const rows = document.querySelectorAll('#mq-opts-builder .opt-row');
    options = Array.from(rows).map(r => r.querySelector('input[type=text]').value.trim());
    correct = Array.from(rows).map((r, i) => r.querySelector('input[type=checkbox]').checked ? i : -1).filter(i => i !== -1);
    if (options.filter(Boolean).length < 2) { admAlert('At least 2 options are required.', 'err'); return; }
    if (!correct.length) { admAlert('Mark at least one correct answer.', 'err'); return; }
  }

  const cqs = adminDb.cqs();
  if (id) {
    const i = cqs.findIndex(q => q.id === id);
    if (i !== -1) {
      const prev = { ...cqs[i] };
      const version = (prev.version || 1) + 1;
      const history = prev.history || [];
      history.push({ version: prev.version || 1, question: prev.question, options: prev.options, correct: prev.correct, explanation: prev.explanation, savedAt: new Date().toISOString() });
      cqs[i] = { ...cqs[i], question, options, correct, explanation: exp, tags, moduleId, type, difficulty: diff, version, history };
      adminDb.saveCqs(cqs);
    }
  } else {
    cqs.push({ id: 'cq_' + Date.now(), question, options, correct, explanation: exp, tags, moduleId, type, difficulty: diff, version: 1, history: [], createdAt: new Date().toISOString() });
    adminDb.saveCqs(cqs);
  }

  closeQModal();
  admAlert('Question saved.', 'ok');
  renderQBankCustom();
}

function deleteQ(id) {
  if (!confirm('Delete this question?')) return;
  adminDb.deleteCq(id);
  admAlert('Question deleted.', 'ok');
  renderQBankCustom();
}

function viewQHistory(id) {
  const q = adminDb.cqs().find(x => x.id === id);
  if (!q) return;
  const hist = q.history || [];
  const el = document.getElementById('modal-history-body');
  if (el) {
    if (!hist.length) {
      el.innerHTML = '<div class="empty">// no history — only one version exists</div>';
    } else {
      el.innerHTML = hist.map(h => `
        <div class="adm-card" style="margin-bottom:12px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <span class="diff-badge">v${h.version}</span>
            <span style="font-size:.72em;color:var(--muted);font-family:var(--mono);">${timeAgo(h.savedAt)}</span>
          </div>
          <div style="font-size:.85em;line-height:1.5;margin-bottom:6px;">${h.question}</div>
          ${h.options && h.options.length ? `<div style="font-size:.75em;color:var(--muted);font-family:var(--mono);">${h.options.map((o, i) => `${h.correct && h.correct.includes(i) ? '✓ ' : '  '}${o}`).join(' · ')}</div>` : ''}
        </div>`).join('');
    }
  }
  document.getElementById('modal-history-title').textContent = '// HISTORY: ' + q.question.slice(0, 40) + (q.question.length > 40 ? '…' : '');
  document.getElementById('modal-history').classList.add('on');
}

function closeHistoryModal() {
  document.getElementById('modal-history').classList.remove('on');
}

/* ── EXAMS ── */
function renderAdmExams() {
  const el = document.getElementById('adm-exams-list');
  if (!el) return;
  const exams = adminDb.exams();
  const mods  = adminDb.modules();
  if (!exams.length) { el.innerHTML = '<div class="empty">// no exams yet — create one!</div>'; return; }
  el.innerHTML = exams.map(ex => {
    const mod = mods.find(m => m.id === ex.moduleId);
    const qcount = ex.questions ? ex.questions.length : 0;
    const totalMarks = ex.questions ? ex.questions.reduce((s, q) => s + (parseInt(q.marks) || 0), 0) : 0;
    return `
    <div class="adm-card">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;">
        <div>
          <div style="font-family:var(--mono);font-size:.92em;color:var(--text);margin-bottom:4px;">${ex.title}</div>
          <div style="font-size:.78em;color:var(--muted);margin-bottom:8px;">${ex.description || ''}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
            ${mod ? `<span class="badge badge-user">${mod.name}</span>` : ''}
            <span style="font-size:.72em;color:var(--muted);font-family:var(--mono);">${qcount} question${qcount !== 1 ? 's' : ''}</span>
            <span style="font-size:.72em;color:var(--muted);font-family:var(--mono);">${totalMarks} marks</span>
            ${ex.timeLimit ? `<span style="font-size:.72em;color:var(--muted);font-family:var(--mono);">${ex.timeLimit} min</span>` : ''}
          </div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="adm-btn" onclick="openExamModal('${ex.id}')">Edit</button>
          <button class="adm-btn danger" onclick="deleteExam('${ex.id}')">Delete</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function openExamModal(id) {
  const exams = adminDb.exams();
  const ex = id ? exams.find(x => x.id === id) : null;
  document.getElementById('modal-exam-title').textContent = ex ? '// EDIT EXAM' : '// NEW EXAM';
  document.getElementById('mex-id').value    = ex ? ex.id : '';
  document.getElementById('mex-title').value = ex ? ex.title : '';
  document.getElementById('mex-desc').value  = ex ? ex.description || '' : '';
  document.getElementById('mex-time').value  = ex ? ex.timeLimit || '' : '';

  const mods = adminDb.modules();
  const modSel = document.getElementById('mex-module');
  modSel.innerHTML = '<option value="">— No Module —</option>' + mods.map(m => `<option value="${m.id}"${ex && ex.moduleId === m.id ? ' selected' : ''}>${m.name}</option>`).join('');

  const qs = ex && ex.questions ? ex.questions.map(q => q.text + ' | ' + q.marks).join('\n') : '';
  document.getElementById('mex-questions').value = qs;
  document.getElementById('modal-exam').classList.add('on');
}

function closeExamModal() {
  document.getElementById('modal-exam').classList.remove('on');
}

function saveExamModal() {
  const id       = document.getElementById('mex-id').value;
  const title    = document.getElementById('mex-title').value.trim();
  const desc     = document.getElementById('mex-desc').value.trim();
  const moduleId = document.getElementById('mex-module').value;
  const timeLimit = parseInt(document.getElementById('mex-time').value) || null;
  const raw = document.getElementById('mex-questions').value.trim();

  if (!title) { admAlert('Exam title is required.', 'err'); return; }

  const questions = raw ? raw.split('\n').filter(l => l.trim()).map(line => {
    const parts = line.split('|');
    return { text: (parts[0] || '').trim(), marks: parseInt((parts[1] || '1').trim()) || 1 };
  }).filter(q => q.text) : [];

  if (!questions.length) { admAlert('Add at least one question.', 'err'); return; }

  const exams = adminDb.exams();
  if (id) {
    const i = exams.findIndex(e => e.id === id);
    if (i !== -1) { exams[i] = { ...exams[i], title, description: desc, moduleId, timeLimit, questions }; }
    adminDb.saveExams(exams);
  } else {
    const newEx = { id: 'ex_' + Date.now(), title, description: desc, moduleId, timeLimit, questions, createdAt: new Date().toISOString() };
    exams.push(newEx);
    adminDb.saveExams(exams);
  }

  closeExamModal();
  admAlert('Exam saved.', 'ok');
  renderAdmExams();
}

function deleteExam(id) {
  if (!confirm('Delete this exam?')) return;
  adminDb.deleteExam(id);
  admAlert('Exam deleted.', 'ok');
  renderAdmExams();
}

/* ── ANSWERS ── */
function renderAdmAnswers() {
  const el = document.getElementById('adm-answers-ungraded');
  const el2 = document.getElementById('adm-answers-graded');
  if (!el) return;
  const answers  = adminDb.answers();
  const ungraded = answers.filter(a => a.grade == null);
  const graded   = answers.filter(a => a.grade != null);

  if (!ungraded.length) {
    el.innerHTML = '<div class="empty">// no ungraded answers</div>';
  } else {
    el.innerHTML = `<table class="adm-table"><thead><tr><th>Student</th><th>Exam</th><th>Question</th><th>Submitted</th><th>Grade</th><th>Feedback</th><th></th></tr></thead><tbody>
      ${ungraded.map(a => {
        const exam = adminDb.exams().find(e => e.id === a.examId);
        const maxMarks = exam && exam.questions ? (exam.questions[a.questionIdx] || {}).marks || 10 : 10;
        return `<tr>
          <td style="font-family:var(--mono);">${a.student}</td>
          <td>${exam ? exam.title : a.examId}</td>
          <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);">${a.question || ''}</td>
          <td style="font-size:.78em;color:var(--muted);">${timeAgo(a.submittedAt)}</td>
          <td><input id="grade-${a.id}" type="number" min="0" max="${maxMarks}" style="width:70px;padding:6px 9px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:var(--text);font-family:var(--mono);font-size:.85em;outline:none;" placeholder="0-${maxMarks}"></td>
          <td><input id="fb-${a.id}" type="text" style="width:180px;padding:6px 9px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:var(--text);font-family:var(--mono);font-size:.82em;outline:none;" placeholder="Feedback…"></td>
          <td><button class="adm-btn primary" onclick="gradeAnswer('${a.id}')">Save</button></td>
        </tr>`;
      }).join('')}
    </tbody></table>`;
  }

  if (el2) {
    if (!graded.length) { el2.innerHTML = '<div class="empty">// no graded answers yet</div>'; return; }
    el2.innerHTML = `<table class="adm-table"><thead><tr><th>Student</th><th>Exam</th><th>Question</th><th>Grade</th><th>Feedback</th><th>Graded</th></tr></thead><tbody>
      ${graded.map(a => {
        const exam = adminDb.exams().find(e => e.id === a.examId);
        return `<tr>
          <td style="font-family:var(--mono);">${a.student}</td>
          <td>${exam ? exam.title : a.examId}</td>
          <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);">${a.question || ''}</td>
          <td style="font-family:var(--mono);color:var(--g);">${a.grade}</td>
          <td style="color:var(--muted);font-size:.82em;">${a.feedback || '—'}</td>
          <td style="font-size:.78em;color:var(--muted);">${timeAgo(a.gradedAt)}</td>
        </tr>`;
      }).join('')}
    </tbody></table>`;
  }
}

function gradeAnswer(id) {
  const gradeEl = document.getElementById('grade-' + id);
  const fbEl    = document.getElementById('fb-' + id);
  if (!gradeEl) return;
  const grade    = parseFloat(gradeEl.value);
  const feedback = fbEl ? fbEl.value.trim() : '';
  if (isNaN(grade)) { admAlert('Enter a valid grade.', 'err'); return; }
  adminDb.gradeAnswer(id, grade, feedback);
  admAlert('Answer graded.', 'ok');
  renderAdmAnswers();
}

/* ── MONITOR ── */
function renderAdmMonitor() {
  const el = document.getElementById('adm-monitor-tbody');
  if (!el) return;

  function draw() {
    const users = db.users().sort((a, b) => new Date(b.lastSeen || 0) - new Date(a.lastSeen || 0));
    el.innerHTML = users.map(u => {
      const ls   = u.lastSeen || null;
      const diff = ls ? Date.now() - new Date(ls).getTime() : Infinity;
      const online = diff < 2 * 60 * 1000;
      const dot  = online ? '<span class="online-dot"></span>' : '<span class="offline-dot"></span>';
      const av   = db.av(u.username);
      const avEl = av
        ? `<img src="${av}" style="width:26px;height:26px;border-radius:50%;object-fit:cover;vertical-align:middle;">`
        : `<span style="width:26px;height:26px;border-radius:50%;background:rgba(0,255,65,.1);border:1px solid var(--border2);display:inline-flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:.72em;color:var(--g);vertical-align:middle;">${u.username.charAt(0).toUpperCase()}</span>`;
      const best = u.scores && u.scores.length ? Math.max(...u.scores.map(s => s.score)) : null;
      return `<tr>
        <td>${avEl}</td>
        <td style="font-family:var(--mono);">${dot}${u.username}</td>
        <td style="font-family:var(--mono);font-size:.8em;color:var(--muted);">${ls ? timeAgo(ls) : 'never'}</td>
        <td style="font-size:.8em;color:var(--muted);font-family:var(--mono);">${u.currentPage || '—'}</td>
        <td style="font-family:var(--mono);">${u.scores ? u.scores.length : 0}</td>
        <td style="font-family:var(--mono);color:var(--g3);">${best !== null ? best + '/' + TOTAL : '—'}</td>
      </tr>`;
    }).join('');
  }

  draw();
  if (window._monInterval) clearInterval(window._monInterval);
  window._monInterval = setInterval(draw, 10000);
}

/* ── LOGS ── */
let _logFilter = '';

function renderAdmLogs() {
  const el = document.getElementById('adm-logs-tbody');
  if (!el) return;
  let log = [...adminDb.log()].reverse().slice(0, 200);
  if (_logFilter) log = log.filter(e => e.type === _logFilter);
  if (!log.length) { el.innerHTML = '<tr><td colspan="4"><div class="empty">// no log entries</div></td></tr>'; return; }
  el.innerHTML = log.map(e => `<tr>
    <td style="font-family:var(--mono);font-size:.75em;color:var(--muted);white-space:nowrap;">${new Date(e.ts).toLocaleString()}</td>
    <td style="font-family:var(--mono);">${e.user}</td>
    <td><span class="badge badge-user">${e.type}</span></td>
    <td style="color:var(--muted);font-size:.82em;max-width:360px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${e.detail}</td>
  </tr>`).join('');
}

function setLogFilter(t) {
  _logFilter = t;
  document.querySelectorAll('.log-filter-btn').forEach(btn => btn.classList.toggle('on', btn.dataset.type === t));
  renderAdmLogs();
}

/* ── init admin panel ── */
function initAdmin() {
  admPg('dash');
}
