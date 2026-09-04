/* ---------- State ---------- */
let shifts = [];
let mileage = [];

/* ---------- Date helpers ---------- */
function startOfWeek(d){
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0,0,0,0);
  return date;
}
function isSameDay(a, b){
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}
function isSameMonth(a, b){
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth();
}
function isInThisWeek(dateStr){
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  const weekStart = startOfWeek(today);
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 7);
  return d >= weekStart && d < weekEnd;
}
function isInThisMonth(dateStr){
  return isSameMonth(new Date(dateStr + 'T00:00:00'), new Date());
}
function formatDate(dateStr){
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { day:'2-digit', month:'short', year:'numeric' });
}
function monthKey(dateStr){ return dateStr.slice(0,7); } // YYYY-MM
function monthLabel(key){
  const [y,m] = key.split('-').map(Number);
  return new Date(y, m-1, 1).toLocaleDateString(undefined, { month:'long', year:'numeric' });
}
function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ---------- Tabs ---------- */
document.querySelectorAll('.tab-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.tab-btn').forEach(b=>{ b.classList.remove('active'); b.setAttribute('aria-selected','false'); });
    btn.classList.add('active'); btn.setAttribute('aria-selected','true');
    document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
    document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
  });
});

/* ---------- Shifts ---------- */
const shiftForm = document.getElementById('shiftForm');
const shiftList = document.getElementById('shiftList');
const shiftEmpty = document.getElementById('shiftEmpty');
const shiftFilter = document.getElementById('shiftFilter');
const shiftMonthPicker = document.getElementById('shiftMonthPicker');
const shiftSummary = document.getElementById('shiftSummary');

shiftForm.addEventListener('submit', async e=>{
  e.preventDefault();
  const entry = {
    id: Date.now(),
    date: document.getElementById('shiftDate').value,
    company: document.getElementById('shiftCompany').value.trim(),
    start: document.getElementById('shiftStart').value,
    end: document.getElementById('shiftEnd').value,
    notes: document.getElementById('shiftNotes').value.trim()
  };
  await Store.putShift(entry);
  shifts.push(entry);
  maybeNotifyUpcoming(entry);
  shiftForm.reset();
  document.getElementById('shiftDate').valueAsDate = new Date();
  populateShiftMonths();
  renderShifts();
});

async function deleteShift(id){
  await Store.deleteShift(id);
  shifts = shifts.filter(s=>s.id!==id);
  populateShiftMonths();
  renderShifts();
}

shiftFilter.addEventListener('change', ()=>{
  shiftMonthPicker.style.display = shiftFilter.value === 'choose' ? 'block' : 'none';
  renderShifts();
});
shiftMonthPicker.addEventListener('change', renderShifts);

function populateShiftMonths(){
  const keys = [...new Set(shifts.map(s=>monthKey(s.date)))].sort().reverse();
  const current = shiftMonthPicker.value;
  shiftMonthPicker.innerHTML = keys.map(k=>`<option value="${k}">${monthLabel(k)}</option>`).join('');
  if(keys.includes(current)) shiftMonthPicker.value = current;
}

function renderShifts(){
  const filter = shiftFilter.value;
  let rows = [...shifts].sort((a,b)=> new Date(b.date) - new Date(a.date));
  if(filter === 'week') rows = rows.filter(s=>isInThisWeek(s.date));
  else if(filter === 'month') rows = rows.filter(s=>isInThisMonth(s.date));
  else if(filter === 'choose' && shiftMonthPicker.value) rows = rows.filter(s=>monthKey(s.date) === shiftMonthPicker.value);

  shiftList.innerHTML = '';
  rows.forEach(s=>{
    const li = document.createElement('li');
    const timeStr = (s.start || s.end) ? `${s.start||'—'} to ${s.end||'—'}` : 'No times set';
    li.innerHTML = `
      <span class="entry-date">${formatDate(s.date)}</span>
      <div class="entry-main" style="flex:1">
        <span class="entry-title">${escapeHtml(s.company)}</span>
        <span class="entry-meta">${timeStr}${s.notes ? ' · ' + escapeHtml(s.notes) : ''}</span>
      </div>
      <button class="remove-btn" aria-label="Delete shift">Remove</button>
    `;
    li.querySelector('.remove-btn').addEventListener('click', ()=>deleteShift(s.id));
    shiftList.appendChild(li);
  });

  shiftEmpty.classList.toggle('show', rows.length===0);
  shiftSummary.textContent = rows.length ? `${rows.length} shift${rows.length===1?'':'s'}` : '';
}

/* ---------- Mileage ---------- */
const mileageForm = document.getElementById('mileageForm');
const mileageList = document.getElementById('mileageList');
const mileageEmpty = document.getElementById('mileageEmpty');
const mileageHistory = document.getElementById('mileageHistory');

mileageForm.addEventListener('submit', async e=>{
  e.preventDefault();
  const start = parseFloat(document.getElementById('mileStart').value);
  const end = parseFloat(document.getElementById('mileEnd').value);
  if(end < start){
    alert('End odometer must be greater than or equal to start odometer.');
    return;
  }
  const entry = {
    id: Date.now(),
    date: document.getElementById('mileDate').value,
    from: document.getElementById('mileFrom').value.trim(),
    to: document.getElementById('mileTo').value.trim(),
    start, end,
    miles: +(end - start).toFixed(1)
  };
  await Store.putMileage(entry);
  mileage.push(entry);
  mileageForm.reset();
  document.getElementById('mileDate').valueAsDate = new Date();
  renderMileage();
});

async function deleteMileage(id){
  await Store.deleteMileage(id);
  mileage = mileage.filter(m=>m.id!==id);
  renderMileage();
}

function renderMileage(){
  const rows = [...mileage].sort((a,b)=> new Date(b.date) - new Date(a.date));
  mileageList.innerHTML = '';
  rows.slice(0, 40).forEach(m=>{
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="entry-date">${formatDate(m.date)}</span>
      <div class="entry-main" style="flex:1">
        <span class="entry-title">${escapeHtml(m.from)} &rarr; ${escapeHtml(m.to)}</span>
        <span class="entry-meta">${m.start} to ${m.end} on the odometer</span>
      </div>
      <span class="entry-value">${m.miles.toFixed(1)} mi</span>
      <button class="remove-btn" aria-label="Delete trip">Remove</button>
    `;
    li.querySelector('.remove-btn').addEventListener('click', ()=>deleteMileage(m.id));
    mileageList.appendChild(li);
  });
  mileageEmpty.classList.toggle('show', rows.length===0);

  const today = new Date();
  const dayTotal = mileage.filter(m=>isSameDay(new Date(m.date+'T00:00:00'), today)).reduce((s,m)=>s+m.miles,0);
  const weekTotal = mileage.filter(m=>isInThisWeek(m.date)).reduce((s,m)=>s+m.miles,0);
  const monthTotal = mileage.filter(m=>isInThisMonth(m.date)).reduce((s,m)=>s+m.miles,0);
  document.getElementById('totalDay').textContent = dayTotal.toFixed(1);
  document.getElementById('totalWeek').textContent = weekTotal.toFixed(1);
  document.getElementById('totalMonth').textContent = monthTotal.toFixed(1);

  // Historical monthly totals table
  const byMonth = {};
  mileage.forEach(m=>{
    const key = monthKey(m.date);
    byMonth[key] = (byMonth[key] || 0) + m.miles;
  });
  const monthKeys = Object.keys(byMonth).sort().reverse();
  mileageHistory.innerHTML = monthKeys.length
    ? monthKeys.map(k=>`
        <li>
          <span class="entry-main"><span class="entry-title">${monthLabel(k)}</span></span>
          <span class="entry-value">${byMonth[k].toFixed(1)} mi</span>
        </li>`).join('')
    : '<li class="empty show" style="border:none;">No history yet.</li>';
}

/* ---------- Notifications ---------- */
const notifBtn = document.getElementById('notifBtn');
const notifStatus = document.getElementById('notifStatus');

function refreshNotifStatus(){
  if(!('Notification' in window)){
    notifStatus.textContent = 'Not supported in this browser';
    notifBtn.disabled = true;
    return;
  }
  if(Notification.permission === 'granted'){
    notifStatus.textContent = 'Reminders are on';
    notifBtn.textContent = 'Reminders enabled';
  }else{
    notifStatus.textContent = 'Reminders are off';
    notifBtn.textContent = 'Enable reminders';
  }
}

notifBtn.addEventListener('click', async ()=>{
  if(!('Notification' in window)) return;
  const perm = await Notification.requestPermission();
  refreshNotifStatus();
  if(perm === 'granted'){
    new Notification('Logbook', { body: "Reminders are on. You'll be notified about upcoming shifts while the app is open." });
  }
});

function maybeNotifyUpcoming(entry){
  if(!('Notification' in window) || Notification.permission !== 'granted') return;
  const today = new Date(); today.setHours(0,0,0,0);
  const shiftDate = new Date(entry.date + 'T00:00:00');
  const diffDays = Math.round((shiftDate - today) / 86400000);

  if(diffDays === 0){
    new Notification('Shift today', { body: `${entry.company} — ${entry.start || 'time not set'}` });
  }else if(diffDays === 1){
    new Notification('Shift tomorrow', { body: `${entry.company} — ${entry.start || 'time not set'}` });
  }
  if(diffDays === 0 && entry.start){
    const [h,m] = entry.start.split(':').map(Number);
    const target = new Date(); target.setHours(h, m, 0, 0);
    const msUntil = target - new Date();
    if(msUntil > 0 && msUntil < 12*60*60*1000){
      setTimeout(()=>{ new Notification('Shift starting now', { body: entry.company }); }, msUntil);
    }
  }
}

function checkTodaysShiftsOnLoad(){
  if(!('Notification' in window) || Notification.permission !== 'granted') return;
  const lastCheck = localStorage.getItem('logbook.lastNotifyCheck');
  const todayKey = new Date().toDateString();
  if(lastCheck === todayKey) return;
  localStorage.setItem('logbook.lastNotifyCheck', todayKey);

  const today = new Date(); today.setHours(0,0,0,0);
  shifts.forEach(s=>{
    const shiftDate = new Date(s.date + 'T00:00:00');
    const diffDays = Math.round((shiftDate - today) / 86400000);
    if(diffDays === 0){
      new Notification('Shift today', { body: `${s.company} — ${s.start || 'time not set'}` });
    }
  });
}

/* ---------- Service worker (offline + installable) ---------- */
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('sw.js').catch(e=>console.warn('SW registration failed', e));
  });
}

/* ---------- Init ---------- */
async function init(){
  await Store.migrate();
  shifts = await Store.getAllShifts();
  mileage = await Store.getAllMileage();

  document.getElementById('shiftDate').valueAsDate = new Date();
  document.getElementById('mileDate').valueAsDate = new Date();
  populateShiftMonths();
  refreshNotifStatus();
  renderShifts();
  renderMileage();
  checkTodaysShiftsOnLoad();
}
init();
