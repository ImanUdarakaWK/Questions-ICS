const db = {
  users:   () => JSON.parse(localStorage.getItem('cq_u') || '[]'),
  save:    u  => localStorage.setItem('cq_u', JSON.stringify(u)),
  me:      () => localStorage.getItem('cq_me') || null,
  setMe:   n  => localStorage.setItem('cq_me', n),
  clrMe:   () => localStorage.removeItem('cq_me'),
  user:    n  => db.users().find(u => u.username === n) || null,
  av:      n  => localStorage.getItem('cq_av_' + n) || null,
  setAv:   (n, d) => localStorage.setItem('cq_av_' + n, d),
  addScore(n, s) {
    const us = db.users();
    const i  = us.findIndex(u => u.username === n);
    if (i === -1) return;
    us[i].scores.push({ score: s, total: TOTAL, date: new Date().toISOString() });
    db.save(us);
  }
};
