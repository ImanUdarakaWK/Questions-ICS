/* ── Morse & NATO tables ── */
const MORSE = {A:'.-',B:'-...',C:'-.-.',D:'-..',E:'.',F:'..-.',G:'--.',H:'....',I:'..',J:'.---',K:'-.-',L:'.-..',M:'--',N:'-.',O:'---',P:'.--.',Q:'--.-',R:'.-.',S:'...',T:'-',U:'..-',V:'...-',W:'.--',X:'-..-',Y:'-.--',Z:'--..',0:'-----',1:'.----',2:'..---',3:'...--',4:'....-',5:'.....',6:'-....',7:'--...',8:'---..',9:'----.'};
const NATO  = {A:'Alpha',B:'Bravo',C:'Charlie',D:'Delta',E:'Echo',F:'Foxtrot',G:'Golf',H:'Hotel',I:'India',J:'Juliet',K:'Kilo',L:'Lima',M:'Mike',N:'November',O:'Oscar',P:'Papa',Q:'Quebec',R:'Romeo',S:'Sierra',T:'Tango',U:'Uniform',V:'Victor',W:'Whiskey',X:'X-ray',Y:'Yankee',Z:'Zulu'};

/* ── Tool converter ── */
function toolConvert(type) {
  const inp = document.getElementById('tool-input')?.value || '';
  let out = '';
  try {
    switch(type) {
      case 'caesar': {
        const sh = parseInt(document.getElementById('caesar-shift')?.value) || 3;
        out = inp.replace(/[a-zA-Z]/g, c => {
          const b = c < 'a' ? 65 : 97;
          return String.fromCharCode(((c.charCodeAt(0) - b + sh + 26) % 26) + b);
        }); break;
      }
      case 'rot13':
        out = inp.replace(/[a-zA-Z]/g, c => { const b = c < 'a' ? 65 : 97; return String.fromCharCode(((c.charCodeAt(0) - b + 13) % 26) + b); }); break;
      case 'b64enc': out = btoa(unescape(encodeURIComponent(inp))); break;
      case 'b64dec': out = decodeURIComponent(escape(atob(inp))); break;
      case 'binary': out = inp.split('').map(c => c.charCodeAt(0).toString(2).padStart(8,'0')).join(' '); break;
      case 'bindec': out = inp.trim().split(/\s+/).map(b => String.fromCharCode(parseInt(b,2))).join(''); break;
      case 'hex':    out = inp.split('').map(c => c.charCodeAt(0).toString(16).padStart(2,'0')).join(' '); break;
      case 'hexdec': out = inp.trim().split(/\s+/).map(h => String.fromCharCode(parseInt(h,16))).join(''); break;
      case 'morse':
        out = inp.toUpperCase().split('').map(c => c === ' ' ? '/' : (MORSE[c] || '?')).join(' '); break;
      case 'leet':
        out = inp.replace(/[aeilostAEILOST]/g, c => ({a:'4',e:'3',i:'1',l:'1',o:'0',s:'5',t:'7',A:'4',E:'3',I:'1',L:'1',O:'0',S:'5',T:'7'}[c])); break;
      case 'nato':
        out = inp.toUpperCase().split('').map(c => c === ' ' ? '[space]' : (NATO[c] || c)).join(' '); break;
      case 'reverse': out = inp.split('').reverse().join(''); break;
      case 'upper': out = inp.toUpperCase(); break;
      case 'lower': out = inp.toLowerCase(); break;
      case 'url':   out = encodeURIComponent(inp); break;
      case 'urld':  out = decodeURIComponent(inp); break;
      default: out = inp;
    }
  } catch(e) { out = '⚠ Error: ' + e.message; }
  const el = document.getElementById('tool-output');
  if (el) { el.textContent = out; el.style.color = out.startsWith('⚠') ? '#f87171' : ''; }
}

function copyToolOutput() {
  const el = document.getElementById('tool-output');
  if (!el || !el.textContent) return;
  navigator.clipboard.writeText(el.textContent).then(() => admAlert('Copied!','ok'));
}

function clearTools() {
  const i = document.getElementById('tool-input'), o = document.getElementById('tool-output');
  if (i) i.value = '';
  if (o) o.textContent = '';
}

/* ── Flash cards ── */
let _fcIdx = 0, _fcFlipped = false, _fcCards = [];

function renderFlashCards(moduleId) {
  _fcCards = moduleId === 'ics' ? Q : (db.cqs().filter(q => q.moduleId === moduleId && q.type === 'mcq'));
  _fcIdx = 0; _fcFlipped = false;
  _drawFC();
}

function _drawFC() {
  const con = document.getElementById('fc-area'); if (!con || !_fcCards.length) return;
  const q = _fcCards[_fcIdx];
  const correctOpts = (q.ans || []).map(i => q.opts ? q.opts[i] : '').join(', ');
  con.innerHTML = `
    <div class="fc-wrap">
      <div class="fc-card${_fcFlipped?' flipped':''}" id="fc-card" onclick="flipFC()">
        ${!_fcFlipped
          ? `<div class="fc-q">${_fcIdx+1}. ${q.q}</div><div class="fc-hint">click to reveal answer</div>`
          : `<div class="fc-q" style="font-size:.82em;color:var(--muted);">${_fcIdx+1}. ${q.q}</div>
             <div class="fc-a">✓ ${correctOpts}</div>
             ${q.exp ? `<div class="fc-hint" style="margin-top:8px;font-size:.72em;">${q.exp}</div>` : ''}`
        }
      </div>
      <div class="fc-nav">
        <button class="tool-btn" onclick="prevFC()" ${_fcIdx===0?'disabled':''}>← Prev</button>
        <span class="fc-counter">${_fcIdx+1} / ${_fcCards.length}</span>
        <button class="tool-btn" onclick="nextFC()" ${_fcIdx===_fcCards.length-1?'disabled':''}>Next →</button>
      </div>
    </div>`;
}

function flipFC() { _fcFlipped = !_fcFlipped; _drawFC(); }
function nextFC() { if (_fcIdx < _fcCards.length-1) { _fcIdx++; _fcFlipped = false; _drawFC(); } }
function prevFC() { if (_fcIdx > 0) { _fcIdx--; _fcFlipped = false; _drawFC(); } }

/* ── Tools page render ── */
function renderTools() {
  const con = document.getElementById('tools-body'); if (!con) return;
  if (con.dataset.built) return; // only build once
  con.dataset.built = '1';

  const mods = db.modules();
  const modOpts = mods.map(m => `<option value="${m.id}">${m.name}</option>`).join('');

  con.innerHTML = `
    <div class="ph"><div class="ph-t">// CYBER TOOLS LAB</div><div class="ph-s">> Encoding · Ciphers · Flash Cards · Converters</div></div>

    <!-- Main cipher tool -->
    <div class="adm-card" style="margin-bottom:18px;">
      <div class="adm-card-t">🔐 Cipher &amp; Encoder Lab</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div>
          <label class="adm-label">Input Text</label>
          <textarea id="tool-input" class="tool-textarea" placeholder="Type or paste text here..." rows="5"></textarea>
          <div style="margin-top:8px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <label class="adm-label" style="margin:0;">Caesar shift:</label>
            <input id="caesar-shift" type="number" value="3" min="1" max="25"
              style="width:60px;padding:5px 9px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:var(--text);font-family:var(--mono);font-size:.85em;outline:none;">
          </div>
        </div>
        <div>
          <label class="adm-label">Output</label>
          <div id="tool-output" class="tool-out" style="min-height:108px;"></div>
          <div style="margin-top:8px;display:flex;gap:7px;">
            <button class="tool-btn" onclick="copyToolOutput()">📋 Copy</button>
            <button class="tool-btn" onclick="clearTools()">🗑 Clear</button>
          </div>
        </div>
      </div>

      <div style="margin-top:16px;">
        <label class="adm-label">Ciphers</label>
        <div class="tool-btns" style="margin-bottom:10px;">
          <button class="tool-btn" onclick="toolConvert('caesar')">Caesar</button>
          <button class="tool-btn" onclick="toolConvert('rot13')">ROT-13</button>
          <button class="tool-btn" onclick="toolConvert('reverse')">Reverse</button>
          <button class="tool-btn" onclick="toolConvert('leet')">L33t Speak</button>
        </div>
        <label class="adm-label">Encoding</label>
        <div class="tool-btns" style="margin-bottom:10px;">
          <button class="tool-btn" onclick="toolConvert('b64enc')">Base64 Enc</button>
          <button class="tool-btn" onclick="toolConvert('b64dec')">Base64 Dec</button>
          <button class="tool-btn" onclick="toolConvert('binary')">→ Binary</button>
          <button class="tool-btn" onclick="toolConvert('bindec')">Binary →</button>
          <button class="tool-btn" onclick="toolConvert('hex')">→ Hex</button>
          <button class="tool-btn" onclick="toolConvert('hexdec')">Hex →</button>
          <button class="tool-btn" onclick="toolConvert('url')">URL Enc</button>
          <button class="tool-btn" onclick="toolConvert('urld')">URL Dec</button>
        </div>
        <label class="adm-label">Communication Codes</label>
        <div class="tool-btns">
          <button class="tool-btn" onclick="toolConvert('morse')">Morse Code</button>
          <button class="tool-btn" onclick="toolConvert('nato')">NATO Phonetic</button>
          <button class="tool-btn" onclick="toolConvert('upper')">UPPERCASE</button>
          <button class="tool-btn" onclick="toolConvert('lower')">lowercase</button>
        </div>
      </div>
    </div>

    <!-- Flash cards -->
    <div class="adm-card">
      <div class="adm-card-t">🃏 Flash Cards — Study Mode</div>
      <div style="display:flex;gap:10px;align-items:center;margin-bottom:16px;flex-wrap:wrap;">
        <select id="fc-mod-sel" class="adm-select" style="width:auto;flex:1;max-width:300px;">
          ${modOpts}
        </select>
        <button class="adm-btn primary" onclick="renderFlashCards(document.getElementById('fc-mod-sel').value)">▶ Start Flash Cards</button>
      </div>
      <div id="fc-area"><div class="empty">// Select a module and click Start</div></div>
    </div>`;
}
