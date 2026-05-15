function best(u)  { return u.scores.length ? Math.max(...u.scores.map(s => s.score)) : -1; }
function bpct(u)  { const b = best(u); return b === -1 ? -1 : Math.round(b / TOTAL * 100); }
function ranked() { return db.users().map(u => ({ ...u, _b: best(u), _p: bpct(u) })).sort((a, b) => b._b - a._b || b.scores.length - a.scores.length); }
function myRank(n){ const r = ranked(), i = r.findIndex(u => u.username === n); return i === -1 ? '—' : '#' + (i + 1); }

function renderDash() {
  const me = db.me(), u = db.user(me); if (!u) return;
  const hr = new Date().getHours();
  document.getElementById('dash-s').textContent = `> ${hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening'}, ${me}`;

  const b = best(u), p = bpct(u), att = u.scores.length;
  const latest = att ? u.scores[att - 1].score : null;
  const rank   = myRank(me), total = db.users().length;

  document.getElementById('sg').innerHTML = `
    <div class="sc c1"><div class="sc-l">// YOUR RANK</div><div class="sc-v">${rank}</div><div class="sc-s">among ${total} player${total !== 1 ? 's' : ''}</div></div>
    <div class="sc c2"><div class="sc-l">// BEST SCORE</div><div class="sc-v">${b === -1 ? '—' : b + '/' + TOTAL}</div><div class="sc-s">${p === -1 ? 'no attempts yet' : p + '% correct'}</div></div>
    <div class="sc c3"><div class="sc-l">// ATTEMPTS</div><div class="sc-v">${att}</div><div class="sc-s">${att === 1 ? '1 quiz taken' : att + ' quizzes'}</div></div>
    <div class="sc c4"><div class="sc-l">// LATEST</div><div class="sc-v">${latest !== null ? latest + '/' + TOTAL : '—'}</div><div class="sc-s">${latest !== null ? Math.round(latest / TOTAL * 100) + '% correct' : 'no attempts'}</div></div>`;

  /* leaderboard */
  const r = ranked(), tb = document.getElementById('lbb');
  tb.innerHTML = r.length ? r.map((pl, i) => {
    const pos  = i + 1;
    const bc   = pos === 1 ? 'r1' : pos === 2 ? 'r2' : pos === 3 ? 'r3' : 'rn';
    const pv   = pl._p === -1 ? 0 : pl._p;
    const av   = db.av(pl.username);
    const avEl = av ? `<img src="${av}" style="width:20px;height:20px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:5px;">` : '';
    return `<tr class="${pl.username === me ? 'me' : ''}">
      <td><span class="rb ${bc}">${pos}</span></td>
      <td>${avEl}${pl.username}${pl.username === me ? ' <span style="color:var(--g);font-size:.7em;font-family:var(--mono);">(you)</span>' : ''}${pl.isGuest ? ' <span style="color:#fbbf24;font-size:.67em;font-family:var(--mono);">GUEST</span>' : ''}</td>
      <td style="font-family:var(--mono);color:var(--g2);">${pl._b === -1 ? '—' : pl._b + '/' + TOTAL}</td>
      <td style="min-width:65px;"><div style="font-size:.78em;font-family:var(--mono);">${pv}%</div><div class="sb"><div class="sf" style="width:${pv}%"></div></div></td>
    </tr>`;
  }).join('') : `<tr><td colspan="4"><div class="empty">// no players yet</div></td></tr>`;

  /* history */
  const hl = document.getElementById('hlist');
  hl.innerHTML = u.scores.length ? [...u.scores].reverse().map(s => {
    const p2 = Math.round(s.score / s.total * 100);
    const bc = p2 >= 80 ? 'ok' : p2 >= 50 ? 'md' : 'lo';
    const lb = p2 >= 80 ? 'PASS' : p2 >= 50 ? 'FAIR' : 'RETRY';
    const d  = new Date(s.date);
    return `<li class="hi">
      <div><div class="hi-s">${s.score}/${s.total}</div><div class="hi-d">${d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})} ${d.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})}</div></div>
      <div style="text-align:right;"><span class="bx ${bc}">${lb}</span><div style="font-size:.7em;color:var(--muted);margin-top:2px;font-family:var(--mono);">${p2}%</div></div>
    </li>`;
  }).join('') : `<div class="empty">// no attempts yet<br>take the quiz!</div>`;
}
