function renderQuiz() {
  const rc = document.getElementById('res');
  rc.style.display = 'none'; rc.innerHTML = '';
  document.getElementById('qsub').style.display = 'block';
  document.getElementById('qprog').style.width = '0%';
  document.getElementById('qbdg').textContent = TOTAL + ' Questions';

  const con = document.getElementById('qcon'); con.innerHTML = '';

  Q.forEach((q, idx) => {
    const wrap = document.createElement('div');
    wrap.className = 'qb'; wrap.id = 'qb-' + q.id;
    const numCorr = q.ans.length;
    const hint = numCorr === 1 ? 'select 1 correct answer' : 'select ' + numCorr + ' correct answers';
    wrap.innerHTML = `<div class="qt">${idx + 1}. ${q.q}</div><div class="qhint">✦ ${hint}</div><div class="opts" id="op-${q.id}"></div><div class="exp" id="ex-${q.id}"></div>`;
    con.appendChild(wrap);

    const opEl = wrap.querySelector('#op-' + q.id);
    q.opts.forEach((o, oi) => {
      const lbl = document.createElement('label');
      const inp = document.createElement('input');
      inp.type = 'checkbox'; inp.name = 'q_' + q.id; inp.value = oi;
      inp.addEventListener('change', updProg);
      lbl.appendChild(inp); lbl.appendChild(document.createTextNode(' ' + o));
      opEl.appendChild(lbl);
    });
  });
}

function updProg() {
  let done = 0;
  Q.forEach(q => { if (document.querySelector(`input[name="q_${q.id}"]:checked`)) done++; });
  document.getElementById('qprog').style.width = `${done / TOTAL * 100}%`;
}

document.getElementById('qform').addEventListener('submit', e => {
  e.preventDefault();
  let score = 0;

  Q.forEach(q => {
    const sel  = Array.from(document.querySelectorAll(`input[name="q_${q.id}"]:checked`)).map(el => parseInt(el.value));
    const blk  = document.getElementById('qb-' + q.id);
    const exEl = document.getElementById('ex-' + q.id);
    const ss   = [...sel].sort((a, b) => a - b);
    const sc   = [...q.ans].sort((a, b) => a - b);
    const ok   = ss.length === sc.length && ss.every((v, i) => v === sc[i]);

    if (ok) {
      score++;
      blk.classList.add('ok');
      exEl.innerHTML = `<span class="ans-ok">✓ CORRECT!</span><br><br><strong>WHY:</strong> ${q.exp}`;
    } else {
      blk.classList.add('fail');
      exEl.innerHTML = `<span class="ans-fail">✗ INCORRECT.</span><br><br><strong>WHY:</strong> ${q.exp}`;
    }
    exEl.classList.add('on');
    document.querySelectorAll(`input[name="q_${q.id}"]`).forEach(i => i.disabled = true);
  });

  db.addScore(db.me(), score);
  const pct = Math.round(score / TOTAL * 100);
  const msg = pct === 100 ? '// PERFECT — ELITE AGENT'
            : pct >= 80   ? '// OUTSTANDING — SENIOR ANALYST'
            : pct >= 60   ? '// GOOD EFFORT — KEEP TRAINING'
            : pct >= 40   ? '// FAIR — STUDY THE MODULES'
            :               '// ROOKIE — HIT THE BOOKS';

  const rc = document.getElementById('res');
  rc.style.display = 'block';
  rc.innerHTML = `<div class="res-sc">${score}/${TOTAL}</div><div class="res-pc">${pct}% correct</div><div class="res-msg">${msg}</div><div class="res-btns"><button class="rb2 p" onclick="pg('dash')">📊 VIEW DASHBOARD</button><button class="rb2" onclick="pg('quiz')">↻ RETRY QUIZ</button></div>`;
  document.getElementById('qsub').style.display = 'none';
  document.getElementById('qprog').style.width = '100%';
  rc.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});
