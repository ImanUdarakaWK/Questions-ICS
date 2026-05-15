const db = {
  /* ── Users ── */
  users:   () => JSON.parse(localStorage.getItem('cq_u') || '[]'),
  save:    u  => localStorage.setItem('cq_u', JSON.stringify(u)),
  me:      () => localStorage.getItem('cq_me') || null,
  setMe:   n  => localStorage.setItem('cq_me', n),
  clrMe:   () => localStorage.removeItem('cq_me'),
  user:    n  => db.users().find(u => u.username === n) || null,
  av:      n  => localStorage.getItem('cq_av_' + n) || null,
  setAv:   (n, d) => localStorage.setItem('cq_av_' + n, d),
  isAdmin: n  => db.user(n)?.isAdmin === true,

  addScore(n, s, moduleId = 'ics') {
    const us = db.users(), i = us.findIndex(u => u.username === n);
    if (i === -1) return;
    if (!us[i].scores) us[i].scores = [];
    us[i].scores.push({ score: s, total: TOTAL, moduleId, date: new Date().toISOString() });
    db.save(us);
    db.logEvent(n, 'quiz_complete', `score ${s}/${TOTAL}`);
  },

  updateActivity(n, page) {
    const us = db.users(), i = us.findIndex(u => u.username === n);
    if (i === -1) return;
    us[i].lastSeen = new Date().toISOString();
    us[i].currentPage = page;
    db.save(us);
  },

  /* ── Modules ── */
  modules:  () => JSON.parse(localStorage.getItem('cq_modules') || '[]'),
  saveMods: m  => localStorage.setItem('cq_modules', JSON.stringify(m)),
  module:   id => db.modules().find(m => m.id === id) || null,

  saveModule(mod) {
    const mods = db.modules(), i = mods.findIndex(m => m.id === mod.id);
    if (i === -1) mods.push(mod); else mods[i] = mod;
    db.saveMods(mods);
  },

  deleteModule(id) { db.saveMods(db.modules().filter(m => m.id !== id)); },

  /* ── Custom Questions ── */
  cqs:     () => JSON.parse(localStorage.getItem('cq_cqs') || '[]'),
  saveCqs: q  => localStorage.setItem('cq_cqs', JSON.stringify(q)),
  cq:      id => db.cqs().find(q => q.id === id) || null,

  saveCq(q) {
    const qs = db.cqs(), i = qs.findIndex(x => x.id === q.id);
    const now = new Date().toISOString();
    if (i === -1) {
      q.createdAt = now; q.version = 1; q.history = [];
      qs.push(q);
    } else {
      const snap = { ...qs[i] }; delete snap.history;
      if (!qs[i].history) qs[i].history = [];
      qs[i].history.push({ snapshot: snap, savedAt: now });
      qs[i] = { ...qs[i], ...q, updatedAt: now, version: (qs[i].version || 1) + 1, history: qs[i].history };
    }
    db.saveCqs(qs);
  },

  deleteCq(id) { db.saveCqs(db.cqs().filter(q => q.id !== id)); },

  /* ── Written Exams ── */
  exams:     () => JSON.parse(localStorage.getItem('cq_exams') || '[]'),
  saveExams:  e => localStorage.setItem('cq_exams', JSON.stringify(e)),
  exam:      id => db.exams().find(e => e.id === id) || null,

  saveExam(exam) {
    const exams = db.exams(), i = exams.findIndex(e => e.id === exam.id);
    const now = new Date().toISOString();
    if (i === -1) { exam.createdAt = now; exams.push(exam); }
    else { exams[i] = { ...exams[i], ...exam, updatedAt: now }; }
    db.saveExams(exams);
  },

  deleteExam(id) { db.saveExams(db.exams().filter(e => e.id !== id)); },

  /* ── Written Answers ── */
  answers:     () => JSON.parse(localStorage.getItem('cq_answers') || '[]'),
  saveAnswers:  a => localStorage.setItem('cq_answers', JSON.stringify(a)),

  submitAnswer(username, examId, questionId, text) {
    const ans = db.answers();
    ans.push({ id: Date.now().toString() + Math.random().toString(36).slice(2), username, examId, questionId, text, submittedAt: new Date().toISOString(), grade: null, feedback: null });
    db.saveAnswers(ans);
    db.logEvent(username, 'written_submit', `exam:${examId}`);
  },

  gradeAnswer(id, grade, feedback) {
    const ans = db.answers(), i = ans.findIndex(a => a.id === id);
    if (i !== -1) { ans[i].grade = grade; ans[i].feedback = feedback; ans[i].gradedAt = new Date().toISOString(); }
    db.saveAnswers(ans);
  },

  /* ── Activity Log (shares key with adminDb.log) ── */
  logs: () => JSON.parse(localStorage.getItem('cq_log') || '[]'),

  logEvent(username, type, detail = '') {
    const logs = db.logs();
    logs.unshift({ ts: new Date().toISOString(), user: username, type, detail });
    if (logs.length > 500) logs.splice(500);
    localStorage.setItem('cq_log', JSON.stringify(logs));
  }
};
