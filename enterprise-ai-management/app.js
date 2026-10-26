// ---- Data (in memory; saved to localStorage when available) ----
const KEY = "eam-v1";
const seed = {
  models: [
    {id:1, name:"Support Assistant", provider:"Anthropic", team:"Customer Care", status:"live", costPerK:0.012, calls:[320,410,380,520,610,580,640]},
    {id:2, name:"Contract Reviewer", provider:"OpenAI", team:"Legal", status:"live", costPerK:0.03, calls:[90,110,95,140,150,130,170]},
    {id:3, name:"Demand Forecaster", provider:"In-house", team:"Supply Chain", status:"paused", costPerK:0.004, calls:[200,180,210,0,0,0,0]}
  ],
  requests: [
    {id:1, title:"Summarise HR exit interviews", team:"People", risk:"High", status:"pending"},
    {id:2, title:"Draft marketing copy", team:"Marketing", risk:"Low", status:"approved"}
  ],
  budget: 12000,
  nextId: 10
};
let S;
try { S = JSON.parse(localStorage.getItem(KEY)) || seed; } catch(e) { S = seed; }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e) {} };

const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const spend = m => m.calls.reduce((a,b)=>a+b,0) * m.costPerK * 10;   // demo cost formula
const totalSpend = () => S.models.reduce((a,m)=>a+spend(m),0);
const money = n => "$" + Math.round(n).toLocaleString("en-US");

// ---- Views ----
const tabs = {
  overview() {
    const live = S.models.filter(m=>m.status==="live").length;
    const pending = S.requests.filter(r=>r.status==="pending").length;
    const pct = Math.min(100, totalSpend()/S.budget*100);
    const daily = days.map((_,i)=>S.models.reduce((a,m)=>a+m.calls[i]*m.costPerK*10,0));
    const max = Math.max(...daily,1);
    const bars = daily.map((v,i)=>{
      const h = v/max*120;
      return `<rect x="${i*60+16}" y="${140-h}" width="36" height="${h}" rx="3" fill="var(--accent)"/>
              <text x="${i*60+34}" y="156" text-anchor="middle">${days[i]}</text>
              <text x="${i*60+34}" y="${134-h}" text-anchor="middle">${money(v)}</text>`;
    }).join("");
    return `<div class="grid">
      <div class="stat"><b>${S.models.length}</b><span>Registered models (${live} live)</span></div>
      <div class="stat"><b>${money(totalSpend())}</b><span>Spend this week</span></div>
      <div class="stat"><b>${pending}</b><span>Requests awaiting review</span></div>
    </div>
    <section><h2>Daily spend</h2>
      <svg viewBox="0 0 430 164" width="100%" role="img" aria-label="Daily spend bar chart">${bars}</svg></section>
    <section><h2>Budget</h2>
      <div>${money(totalSpend())} of ${money(S.budget)} used (${pct.toFixed(0)}%)</div>
      <div class="bar"><i style="width:${pct}%;${pct>85?'background:var(--bad)':''}"></i></div>
      <form data-form="budget"><input name="budget" type="number" min="1" placeholder="New weekly budget" required>
      <button class="btn">Update budget</button></form></section>`;
  },
  models() {
    const rows = S.models.map(m=>`<tr>
      <td>${esc(m.name)}</td><td>${esc(m.provider)}</td><td>${esc(m.team)}</td>
      <td><span class="tag t-${m.status}">${m.status}</span></td><td>${money(spend(m))}</td>
      <td><button class="btn ghost sm" data-act="toggle" data-id="${m.id}">${m.status==="live"?"Pause":"Resume"}</button>
          <button class="btn ghost sm" data-act="del" data-id="${m.id}">Remove</button></td></tr>`).join("");
    return `<section><h2>Model registry</h2>
      ${S.models.length?`<div class="scroll"><table><thead><tr><th>Model</th><th>Provider</th><th>Owner</th><th>Status</th><th>Spend</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`
      :`<div class="empty">No models yet. Add the first one below.</div>`}
      <form data-form="model">
        <input name="name" placeholder="Model name" required>
        <select name="provider"><option>Anthropic</option><option>OpenAI</option><option>Google</option><option>In-house</option></select>
        <input name="team" placeholder="Owning team" required>
        <input name="costPerK" type="number" step="0.001" min="0" placeholder="Cost per 1K calls ($)" required>
        <button class="btn">Add model</button>
      </form></section>`;
  },
  governance() {
    const rows = S.requests.map(r=>`<tr>
      <td>${esc(r.title)}</td><td>${esc(r.team)}</td><td>${r.risk}</td>
      <td><span class="tag t-${r.status}">${r.status}</span></td>
      <td>${r.status==="pending"?`<button class="btn sm" data-act="approve" data-id="${r.id}">Approve</button>
        <button class="btn ghost sm" data-act="reject" data-id="${r.id}">Reject</button>`:""}</td></tr>`).join("");
    return `<section><h2>Use-case requests</h2>
      ${S.requests.length?`<div class="scroll"><table><thead><tr><th>Use case</th><th>Team</th><th>Risk</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`
      :`<div class="empty">No requests. Teams can submit one below.</div>`}
      <form data-form="request">
        <input name="title" placeholder="What will AI be used for?" required>
        <input name="team" placeholder="Requesting team" required>
        <select name="risk"><option>Low</option><option>Medium</option><option>High</option></select>
        <button class="btn">Submit request</button>
      </form></section>`;
  }
};

let current = "overview";
function render() {
  document.getElementById("nav").innerHTML = Object.keys(tabs).map(t =>
    `<button role="tab" aria-selected="${t===current}" data-tab="${t}">${t[0].toUpperCase()+t.slice(1)}</button>`).join("");
  document.getElementById("view").innerHTML = tabs[current]();
}

// ---- Events ----
document.addEventListener("click", e => {
  const t = e.target.closest("[data-tab]");
  if (t) { current = t.dataset.tab; location.hash = current; render(); return; }
  const b = e.target.closest("[data-act]");
  if (!b) return;
  const id = +b.dataset.id, act = b.dataset.act;
  if (act==="toggle") { const m=S.models.find(x=>x.id===id); m.status = m.status==="live"?"paused":"live"; }
  if (act==="del") S.models = S.models.filter(x=>x.id!==id);
  if (act==="approve"||act==="reject") S.requests.find(x=>x.id===id).status = act==="approve"?"approved":"rejected";
  save(); render();
});
document.addEventListener("submit", e => {
  e.preventDefault();
  const f = e.target.dataset.form, d = Object.fromEntries(new FormData(e.target));
  if (f==="budget") S.budget = +d.budget;
  if (f==="model") S.models.push({id:S.nextId++, name:d.name, provider:d.provider, team:d.team, status:"live", costPerK:+d.costPerK, calls:[0,0,0,0,0,0,0]});
  if (f==="request") S.requests.push({id:S.nextId++, title:d.title, team:d.team, risk:d.risk, status:"pending"});
  save(); render();
});
const h = location.hash.slice(1); if (tabs[h]) current = h;
render();
