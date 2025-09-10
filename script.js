
/* ===========================
   QuickVote (localStorage demo)
   =========================== */
const $ = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];
const Toast = (() => {
  const el = $('#toast');
  let t = 0;
  return {
    show(msg, type='info'){
      el.textContent = msg;
      el.classList.remove('hidden');
      el.style.borderLeft = '6px solid ' + (type==='ok' ? '#39d98a' : type==='warn' ? '#ffd166' : type==='err' ? '#ff5470' : '#6f8cff');
      clearTimeout(t);
      t = setTimeout(()=> el.classList.add('hidden'), 2800);
    }
  }
})();

const storeKey = 'QV_ELECTIONS_V1';
const getStore = () => JSON.parse(localStorage.getItem(storeKey) || '{"elections":{}}');
const saveStore = data => localStorage.setItem(storeKey, JSON.stringify(data));
const nowISO = () => new Date().toISOString();

const genId = (len=6) => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s=""; for(let i=0;i<len;i++) s += alphabet[Math.floor(Math.random()*alphabet.length)];
  return s;
};
const genCode = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const part = n => Array.from({length:n},()=>alphabet[Math.floor(Math.random()*alphabet.length)]).join('');
  return `${part(4)}-${part(4)}`;
};
const copyTxt = async (txt) => {
  try { await navigator.clipboard.writeText(txt); Toast.show('Copied to clipboard ✔️','ok'); }
  catch { Toast.show('Copy failed. Select & copy manually.','err'); }
};

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

/* Router (simple sections) */
const sections = { home: null, host: $('#host'), voter: $('#voter'), results: $('#results') };
function go(to){
  for(const k of Object.keys(sections)){
    if(sections[k]) sections[k].classList.toggle('hidden', k!==to);
  }
  // also hide all when home
  if(to==='home'){
    $('#host').classList.add('hidden');
    $('#voter').classList.add('hidden');
    $('#results').classList.add('hidden');
  }
  window.scrollTo({top:0, behavior:'instant'});
}

/* Landing buttons */
$('#btnHost').onclick = ()=> go('host');
$('#btnVoter').onclick = ()=> go('voter');
$('#btnResults').onclick = ()=> go('results');
$$('[data-nav="home"]').forEach(b=> b.onclick = ()=> go('home'));

/* -------- Host: Create -------- */
$('#resetHostForm').onclick = () => {
  $('#eTitle').value = '';
  $('#eDesc').value = '';
  $('#eCandidates').value = '';
  $('#eRequireCodes').checked = false;
  $('#eCodeCount').value = 20;
  $('#eWhen').value = '';
};
$('#createElection').onclick = () => {
  const title = $('#eTitle').value.trim();
  const desc = $('#eDesc').value.trim();
  const candidatesRaw = $('#eCandidates').value.trim();
  const requireCodes = $('#eRequireCodes').checked;
  const codeCount = clamp(parseInt($('#eCodeCount').value||'0',10), 1, 10000);
  const autoCloseAt = $('#eWhen').value ? new Date($('#eWhen').value).toISOString() : null;

  if(!title){ Toast.show('Please enter a title.','warn'); return; }
  const candidates = candidatesRaw.split('\n').map(s=>s.trim()).filter(Boolean);
  if(candidates.length < 2){ Toast.show('Add at least two candidates.','warn'); return; }

  const id = genId(6);
  const candObjs = candidates.map(name => ({ id: genId(5), name, votes: 0 }));
  const election = {
    id, title, desc,
    candidates: candObjs,
    status: 'draft', // 'open' | 'closed'
    createdAt: nowISO(),
    autoCloseAt,
    requireCodes,
    voterCodes: requireCodes ? Object.fromEntries(Array.from({length: codeCount}, () => {
      const c = genCode(); return [c, { used:false, usedBy:null, usedAt:null }];
    })) : {},
    ballots: []
  };

  const db = getStore();
  db.elections[id] = election;
  saveStore(db);

  $('#manageId').value = id;
  Toast.show(`Election created. ID: ${id}`, 'ok');
  $('#loadElection').click();
};

/* -------- Host: Manage -------- */
let currentElection = null;
const statusSpan = (statusEl, status) => {
  statusEl.textContent = status;
  statusEl.className = 'status ' + status;
};
const drawLiveChart = (el, election) => {
  const total = election.candidates.reduce((a,c)=>a+c.votes,0) || 0;
  el.innerHTML = '';
  election.candidates.forEach(c=>{
    const pct = total ? Math.round((c.votes/total)*100) : 0;
    const bar = document.createElement('div'); bar.className='bar';
    bar.innerHTML = `
      <div class="code">${c.name}</div>
      <div class="track"><div class="fill" style="width:${pct}%"></div></div>
      <div class="pct">${c.votes} (${pct}%)</div>
    `;
    el.appendChild(bar);
  });
  if(!election.candidates.length){
    el.innerHTML = '<div class="muted">No candidates.</div>';
  }
};

$('#loadElection').onclick = () => {
  const id = $('#manageId').value.trim().toUpperCase();
  const db = getStore();
  const e = db.elections[id];
  if(!e){ Toast.show('Election not found.','err'); $('#managePanel').classList.add('hidden'); return; }
  currentElection = e;
  $('#managePanel').classList.remove('hidden');
  $('#mTitle').textContent = e.title;
  $('#mDesc').textContent = e.desc || '';
  const mStatus = $('#mStatus'); statusSpan(mStatus, e.status);
  const idSpan = $('#mIdCopy'); idSpan.textContent = e.id;
  idSpan.onclick = ()=> copyTxt(e.id);

  // Codes section
  if(e.requireCodes){
    $('#codesBlock').innerHTML = `Codes required. <b>${Object.keys(e.voterCodes).length}</b> generated. Used: <b>${
      Object.values(e.voterCodes).filter(v=>v.used).length
    }</b>.`;
    $('#codesActions').classList.remove('hidden');
  } else {
    $('#codesBlock').textContent = 'Not required for this election.';
    $('#codesActions').classList.add('hidden');
    $('#codesList').classList.add('hidden');
  }

  drawLiveChart($('#liveChart'), e);
  Toast.show('Loaded ✔️','ok');
};
$('#copyManageLink').onclick = () => {
  const id = $('#manageId').value.trim().toUpperCase();
  if(!id){ Toast.show('Enter an election ID first.','warn'); return; }
  const url = location.origin + location.pathname + `#results:${id}`;
  copyTxt(url);
};
$('#btnOpen').onclick = () => {
  if(!currentElection){ Toast.show('Load an election first.','warn'); return; }
  if(currentElection.status === 'open'){ Toast.show('Already open.','warn'); return; }
  currentElection.status = 'open';
  const db = getStore(); db.elections[currentElection.id] = currentElection; saveStore(db);
  statusSpan($('#mStatus'),'open');
  Toast.show('Voting opened.','ok');
  drawLiveChart($('#liveChart'), currentElection);
};
$('#btnClose').onclick = () => {
  if(!currentElection){ Toast.show('Load an election first.','warn'); return; }
  if(currentElection.status === 'closed'){ Toast.show('Already closed.','warn'); return; }
  currentElection.status = 'closed';
  const db = getStore(); db.elections[currentElection.id] = currentElection; saveStore(db);
  statusSpan($('#mStatus'),'closed');
  Toast.show('Voting closed.','ok');
  drawLiveChart($('#liveChart'), currentElection);
};
$('#btnDownloadCodes').onclick = () => {
  if(!currentElection?.requireCodes){ Toast.show('No codes to download.','warn'); return; }
  const rows = [['code','used','usedBy','usedAt']];
  for(const [c,meta] of Object.entries(currentElection.voterCodes)){
    rows.push([c, meta.used, meta.usedBy||'', meta.usedAt||'']);
  }
  const csv = rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `quickvote_${currentElection.id}_codes.csv`;
  document.body.appendChild(a); a.click(); a.remove();
};
let codesRevealed = false;
$('#btnShowCodes').onclick = () => {
  codesRevealed = !codesRevealed;
  const box = $('#codesList');
  if(codesRevealed){
    const list = Object.keys(currentElection.voterCodes).map(c=>{
      const u = currentElection.voterCodes[c].used ? ' (used)' : '';
      return c + u;
    }).join('\n');
    box.textContent = list || '(none)';
    box.classList.remove('hidden');
  } else {
    box.classList.add('hidden');
  }
};

/* -------- Voter -------- */
let loadedBallot = null;
function setBallotUI(e){
  $('#ballot').classList.remove('hidden');
  $('#bTitle').textContent = e.title;
  $('#bDesc').textContent = e.desc || '';
  const bStatus = $('#bStatus'); bStatus.textContent = 'Status: ' + e.status; bStatus.className = 'badge status ' + e.status;

  const wrap = $('#bOptions'); wrap.innerHTML = '';
  e.candidates.forEach(c=>{
    const id = 'cand_' + c.id;
    const row = document.createElement('label');
    row.className = 'card'; row.style.display='flex'; row.style.alignItems='center'; row.style.gap='12px';
    row.innerHTML = `
      <input type="radio" name="candidate" value="${c.id}" style="accent-color:#6f8cff; width:20px; height:20px" />
      <div><div style="font-weight:700">${c.name}</div><div class="muted">Single choice</div></div>
    `;
    wrap.appendChild(row);
  });

  if(e.status!=='open'){
    $('#castVote').disabled = true;
    Toast.show('Voting is not open.','warn');
  } else {
    $('#castVote').disabled = false;
  }
}
$('#vLoad').onclick = () => {
  const id = $('#vElectionId').value.trim().toUpperCase();
  const db = getStore();
  const e = db.elections[id];
  if(!e){ Toast.show('Election not found.','err'); return; }
  loadedBallot = e;

  // show/hide code field
  if(e.requireCodes){ $('#vCodeWrap').classList.remove('hidden'); }
  else { $('#vCodeWrap').classList.add('hidden'); }

  setBallotUI(e);
};
$('#vClear').onclick = () => {
  $('#vElectionId').value = '';
  $('#vCode').value = '';
  $('#vName').value = '';
  $('#ballot').classList.add('hidden');
  loadedBallot = null;
};
const hasReceipt = (electionId) => {
  const key = 'QV_RECEIPT_' + electionId;
  try { return JSON.parse(localStorage.getItem(key) || 'null'); }
  catch{ return null; }
};
const setReceipt = (electionId, payload) => {
  const key = 'QV_RECEIPT_' + electionId;
  localStorage.setItem(key, JSON.stringify(payload));
};

$('#castVote').onclick = () => {
  if(!loadedBallot){ Toast.show('Load a ballot first.','warn'); return; }
  if(loadedBallot.status!=='open'){ Toast.show('Voting is not open.','warn'); return; }
  const candId = ($$('input[name="candidate"]:checked')[0] || {}).value;
  if(!candId){ Toast.show('Select a candidate.','warn'); return; }

  const receipt = hasReceipt(loadedBallot.id);
  const voterName = $('#vName').value.trim() || null;
  const code = $('#vCode').value.trim().toUpperCase() || null;

  // If codes required, validate and single-use enforce
  if(loadedBallot.requireCodes){
    if(!code){ Toast.show('This election requires a voter code.','err'); return; }
    const entry = loadedBallot.voterCodes[code];
    if(!entry){ Toast.show('Invalid voter code.','err'); return; }
    if(entry.used){ Toast.show('This code has already been used.','err'); return; }
  } else {
    // Otherwise enforce one vote per device (best-effort)
    if(receipt){ Toast.show('You already voted on this device.','err'); return; }
  }

  // Record vote
  const db = getStore();
  const e = db.elections[loadedBallot.id];
  const candidate = e.candidates.find(c=>c.id===candId);
  if(!candidate){ Toast.show('Candidate not found.','err'); return; }

  candidate.votes += 1;
  e.ballots.push({
    id: genId(8),
    candidateId: candId,
    voterName,
    at: nowISO(),
    via: e.requireCodes ? 'code' : 'device'
  });

  // Mark code used if needed
  if(e.requireCodes && code){
    e.voterCodes[code].used = true;
    e.voterCodes[code].usedBy = voterName || '(anonymous)';
    e.voterCodes[code].usedAt = nowISO();
  } else {
    setReceipt(e.id, { at: nowISO(), voterName });
  }

  db.elections[e.id] = e;
  saveStore(db);
  loadedBallot = e;

  setBallotUI(e);
  Toast.show('Vote recorded ✔️','ok');
};

/* -------- Results -------- */
function renderResults(e, chartEl, tableEl, statusEl, titleEl, descEl, idEl){
  statusSpan(statusEl, e.status);
  titleEl.textContent = e.title;
  descEl.textContent = e.desc || '';
  idEl.textContent = e.id;

  const total = e.candidates.reduce((a,c)=>a+c.votes,0);
  chartEl.innerHTML = '';
  e.candidates
    .slice()
    .sort((a,b)=> b.votes - a.votes)
    .forEach(c=>{
      const pct = total ? Math.round((c.votes/total)*100) : 0;
      const row = document.createElement('div'); row.className='bar';
      row.innerHTML = `
        <div class="code">${c.name}</div>
        <div class="track"><div class="fill" style="width:${pct}%"></div></div>
        <div class="pct">${c.votes} (${pct}%)</div>
      `;
      chartEl.appendChild(row);
    });

  tableEl.innerHTML = `
    <tr><th>Candidate</th><th class="right">Votes</th><th class="right">Percent</th></tr>
    ${e.candidates.map(c=>{
      const pct = total ? ((c.votes/total)*100).toFixed(2) : '0.00';
      return `<tr><td>${escapeHtml(c.name)}</td><td class="right">${c.votes}</td><td class="right">${pct}%</td></tr>`
    }).join('')}
    <tr><td><b>Total</b></td><td class="right"><b>${total}</b></td><td class="right">100%</td></tr>
  `;
}
function escapeHtml(s){ return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

$('#rLoad').onclick = () => {
  const id = $('#rElectionId').value.trim().toUpperCase();
  const db = getStore();
  const e = db.elections[id];
  if(!e){ Toast.show('Election not found.','err'); $('#rPanel').classList.add('hidden'); return; }
  $('#rPanel').classList.remove('hidden');
  renderResults(e, $('#rChart'), $('#rTable'), $('#rStatus'), $('#rTitle'), $('#rDesc'), $('#rId'));

  // minimal "live" refresh while open
  if(window._rInt) clearInterval(window._rInt);
  window._rInt = setInterval(()=>{
    const d2 = getStore().elections[id];
    if(!d2) return;
    renderResults(d2, $('#rChart'), $('#rTable'), $('#rStatus'), $('#rTitle'), $('#rDesc'), $('#rId'));
  }, 1200);
};
$('#rShare').onclick = () => {
  const id = $('#rElectionId').value.trim().toUpperCase();
  if(!id){ Toast.show('Enter an election ID first.','warn'); return; }
  copyTxt(location.origin + location.pathname + `#results:${id}`);
};

/* Deep-link support: #results:ABC123 or #vote:ABC123 */
(function handleHash(){
  const h = location.hash.slice(1);
  if(!h) return;
  const [view, id] = h.split(':');
  if(view==='results' && id){
    go('results');
    $('#rElectionId').value = id.toUpperCase();
    $('#rLoad').click();
  }
  if(view==='vote' && id){
    go('voter');
    $('#vElectionId').value = id.toUpperCase();
    $('#vLoad').click();
  }
})();

/* Auto-close checker */
setInterval(()=>{
  const db = getStore(); let changed = false;
  for(const e of Object.values(db.elections)){
    if(e.status==='open' && e.autoCloseAt && new Date(e.autoCloseAt).getTime() <= Date.now()){
      e.status = 'closed'; changed = true;
    }
  }
  if(changed) saveStore(db);
}, 30_000);

/* Keep Host live chart fresh when loaded */
setInterval(()=>{
  if(!currentElection) return;
  const db = getStore(); const e = db.elections[currentElection.id];
  if(!e) return;
  currentElection = e;
  drawLiveChart($('#liveChart'), e);
  statusSpan($('#mStatus'), e.status);
  if(e.requireCodes){
    $('#codesBlock').innerHTML = `Codes required. <b>${Object.keys(e.voterCodes).length}</b> generated. Used: <b>${
      Object.values(e.voterCodes).filter(v=>v.used).length
    }</b>.`;
  }
}, 1500);
// Create election
document.getElementById("createElection").addEventListener("click", async () => {
  const title = document.getElementById("eTitle").value;
  const desc = document.getElementById("eDesc").value;
  const candidates = document.getElementById("eCandidates").value.split("\n");

  const res = await fetch("create_election.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, description: desc, candidates }),
  });

  const data = await res.json();
  alert("Election created with ID: " + data.id);
});

// Cast vote
document.getElementById("castVote").addEventListener("click", async () => {
  const electionId = document.getElementById("vElectionId").value;
  const candidateId = document.querySelector("input[name='candidate']:checked").value;

  const res = await fetch("cast_vote.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ election_id: electionId, candidate_id: candidateId }),
  });

  const data = await res.json();
  alert(data.message || data.error);
});

// Get results
document.getElementById("rLoad").addEventListener("click", async () => {
  const electionId = document.getElementById("rElectionId").value;
  const res = await fetch("get_results.php?id=" + electionId);
  const data = await res.json();

  document.getElementById("rTitle").innerText = data.title;
  document.getElementById("rDesc").innerText = data.description;
  document.getElementById("rTable").innerHTML = data.candidates
    .map(c => `<tr><td>${c.name}</td><td>${c.votes}</td></tr>`)
    .join("");
});

