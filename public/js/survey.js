// ── State ─────────────────────────────────────────────────────────
const state = {
  childName: '',
  numAttending: 1,
  category: '',
  activityRankings: [],
  activityOther: '',
  budgetMin: 20,
  budgetMax: 80,
  potluck: null,
  potluckFood: [],
  potluckOther: '',
  extraAnswers: [],
  extraQuestions: []
};

let config = { activities: {}, potluckOptions: [] };
let currentStep = 0;
let totalSteps = 0;

// ── Bootstrap ─────────────────────────────────────────────────────
async function init() {
  const [cfgRes, qRes] = await Promise.all([
    fetch('/api/config').then(r => r.json()),
    fetch('/api/questions').then(r => r.json())
  ]);
  config = cfgRes;
  state.extraQuestions = qRes;
  buildSteps();
  renderStep(0);
}

// ── Step Definitions ──────────────────────────────────────────────
function buildSteps() {
  steps = [
    stepBasicInfo,
    stepCategory,
    stepActivities,
    stepBudget,
    stepPotluck,
    ...state.potluckFood ? [] : [],   // potluck food added dynamically
    ...state.extraQuestions.map((q, i) => () => stepExtra(q, i))
  ];
  // We'll handle potluck food step dynamically in nextStep
}

const FIXED_STEPS = ['basicInfo', 'category', 'activities', 'budget', 'potluck'];

// Each step returns { html, validate, collect }
function getStepDef(idx) {
  const hasPotluckFood = state.potluck === true;
  const steps = [
    { id: 'basicInfo',   fn: stepBasicInfo },
    { id: 'category',    fn: stepCategory },
    { id: 'activities',  fn: stepActivities },
    { id: 'budget',      fn: stepBudget },
    { id: 'potluck',     fn: stepPotluck },
    ...(hasPotluckFood ? [{ id: 'potluckFood', fn: stepPotluckFood }] : []),
    ...state.extraQuestions.map((q, i) => ({ id: 'extra_' + i, fn: () => stepExtra(q, i) }))
  ];
  totalSteps = steps.length;
  return steps[idx];
}

// ── Render ────────────────────────────────────────────────────────
function renderStep(idx) {
  const def = getStepDef(idx);
  if (!def) { submitSurvey(); return; }

  const { html } = def.fn();
  document.getElementById('step-container').innerHTML = html;
  document.getElementById('frame-top').scrollTop = 0;

  // progress
  const fill = Math.round(((idx) / Math.max(totalSteps - 1, 1)) * 100);
  document.getElementById('progress-fill').style.width = fill + '%';
  document.getElementById('progress-text').textContent = `Step ${idx + 1} of ${totalSteps}`;
  document.getElementById('step-info').textContent = def.id.replace(/_/g, ' ');

  // back button
  document.getElementById('btn-back').style.display = idx > 0 ? 'inline-flex' : 'none';

  // next button label
  const isLast = idx === totalSteps - 1;
  document.getElementById('btn-next').textContent = isLast ? '🎉 Submit' : 'Next →';

  attachListeners(def.id);
}

function attachListeners(id) {
  if (id === 'category') {
    document.querySelectorAll('.cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        state.category = btn.dataset.value;
        // reset activities when category changes
        state.activityRankings = [];
        state.activityOther = '';
      });
    });
  }
  if (id === 'potluck') {
    document.querySelectorAll('.yn-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.yn-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        state.potluck = btn.dataset.value === 'yes';
      });
    });
  }
  if (id === 'potluckFood') {
    document.querySelectorAll('.food-item').forEach(item => {
      item.addEventListener('click', () => {
        const cb = item.querySelector('input[type=checkbox]');
        cb.checked = !cb.checked;
        item.classList.toggle('checked', cb.checked);
      });
    });
  }
  if (id === 'activities') {
    initDragDrop();
  }
  if (id === 'budget') {
    initDualSlider();
  }
}

// ── Step Builders ─────────────────────────────────────────────────

function stepBasicInfo() {
  return {
    id: 'basicInfo',
    html: `
      <div class="card">
        <div class="step-label">Step 1 — Who's coming?</div>
        <h2>Tell us about your child 👧👦</h2>
        <div class="input-row">
          <div>
            <label for="childName">Child's First Name</label>
            <input type="text" id="childName" placeholder="e.g. Emma" value="${state.childName}" oninput="state.childName=this.value.trim()">
          </div>
          <div>
            <label for="numAttending">How many attending?</label>
            <input type="number" id="numAttending" min="1" max="20" value="${state.numAttending}" oninput="state.numAttending=parseInt(this.value)||1">
          </div>
        </div>
      </div>`
  };
}

function stepCategory() {
  const cats = [
    { v: 'Land',  icon: '🌳', desc: 'Indoor & outdoor fun' },
    { v: 'Sea',   icon: '⛵', desc: 'On the water' },
    { v: 'Beach', icon: '🏖️', desc: 'Sand & sun' }
  ];
  return {
    id: 'category',
    html: `
      <div class="card">
        <div class="step-label">Step 2 — Activity Type</div>
        <h2>What kind of activities do you prefer?</h2>
        <div class="category-grid">
          ${cats.map(c => `
            <button class="cat-btn ${state.category === c.v ? 'selected' : ''}" data-value="${c.v}">
              <span class="icon">${c.icon}</span>
              <span class="label">${c.v}</span>
              <span style="font-size:11px;color:#64748b">${c.desc}</span>
            </button>`).join('')}
        </div>
      </div>`
  };
}

function stepActivities() {
  const list = config.activities[state.category] || [];
  if (state.activityRankings.length !== list.length + 1) {
    state.activityRankings = [
      ...list.map((a, i) => ({ activity: a, rank: i + 1 })),
      { activity: '__other__', rank: list.length + 1 }
    ];
  }
  const ranked = [...state.activityRankings].sort((a, b) => a.rank - b.rank);

  return {
    id: 'activities',
    html: `
      <div class="card">
        <div class="step-label">Step 3 — Rank Activities</div>
        <h2>Rank these ${state.category} activities<br><small style="font-size:14px;font-weight:400;color:#64748b">#1 = most preferred</small></h2>
        <p class="hint">Drag to reorder</p>
        <div class="rank-list" id="rank-list">
          ${ranked.map((r, i) => {
            if (r.activity === '__other__') {
              return `
            <div class="rank-item" draggable="true" data-activity="__other__">
              <div class="rank-num">${i + 1}</div>
              <input type="text" class="other-activity-input" placeholder="Other (describe your idea...)"
                value="${state.activityOther}"
                ondragstart="event.stopPropagation()"
                oninput="state.activityOther=this.value">
              <span class="drag-handle">⠿</span>
            </div>`;
            }
            return `
            <div class="rank-item" draggable="true" data-activity="${r.activity}">
              <div class="rank-num">${i + 1}</div>
              <span class="rank-name">${r.activity}</span>
              <span class="drag-handle">⠿</span>
            </div>`;
          }).join('')}
        </div>
      </div>`
  };
}

function stepBudget() {
  const p1 = (state.budgetMin / 300 * 100).toFixed(2);
  const p2 = (state.budgetMax / 300 * 100).toFixed(2);
  return {
    id: 'budget',
    html: `
      <div class="card">
        <div class="step-label">Step 4 — Budget</div>
        <h2>What's your budget per head? 💰</h2>
        <div class="budget-display" id="budget-display">$${state.budgetMin} – $${state.budgetMax}</div>
        <div class="slider-wrap">
          <div class="dual-slider" id="dual-slider">
            <div class="slider-track"></div>
            <div class="slider-range" id="slider-range" style="left:${p1}%;width:${p2 - p1}%"></div>
            <div class="slider-thumb" id="thumb-min" style="left:${p1}%" data-thumb="min"></div>
            <div class="slider-thumb" id="thumb-max" style="left:${p2}%" data-thumb="max"></div>
          </div>
          <div class="slider-labels"><span>$0</span><span>$300+</span></div>
        </div>
      </div>`
  };
}

function stepPotluck() {
  return {
    id: 'potluck',
    html: `
      <div class="card">
        <div class="step-label">Step 5 — Potluck</div>
        <h2>Would you like to contribute to a potluck? 🥘</h2>
        <div class="yesno-row">
          <button class="yn-btn yes ${state.potluck === true ? 'selected' : ''}" data-value="yes">✅ Yes, I'll bring something!</button>
          <button class="yn-btn no ${state.potluck === false ? 'selected' : ''}" data-value="no">❌ No thanks</button>
        </div>
      </div>`
  };
}

function stepPotluckFood() {
  const options = config.potluckOptions || [];
  return {
    id: 'potluckFood',
    html: `
      <div class="card">
        <div class="step-label">Step 6 — What will you bring?</div>
        <h2>Select what you'll bring to the potluck 🍱</h2>
        <p class="hint">Choose one or more</p>
        <div class="food-grid">
          ${options.map(f => `
            <div class="food-item ${state.potluckFood.includes(f) ? 'checked' : ''}">
              <input type="checkbox" value="${f}" ${state.potluckFood.includes(f) ? 'checked' : ''}>
              ${f}
            </div>`).join('')}
        </div>
        <div class="other-row">
          <label>Other:</label>
          <input type="text" id="potluck-other" placeholder="Tell us what you'll bring..." value="${state.potluckOther}" oninput="state.potluckOther=this.value">
        </div>
      </div>`
  };
}

function stepExtra(q, idx) {
  const saved = state.extraAnswers[idx] || {};
  let inputHtml = '';

  if (q.type === 'text') {
    inputHtml = `<input type="text" id="extra-input" value="${saved.answer || ''}" oninput="saveExtra(${idx},this.value)" placeholder="Your answer...">`;
  } else if (q.type === 'yesno') {
    inputHtml = `
      <div class="extra-yesno">
        <button class="yn-btn yes ${saved.answer === 'yes' ? 'selected' : ''}" onclick="saveExtra(${idx},'yes');document.querySelectorAll('.extra-yesno .yn-btn').forEach(b=>b.classList.remove('selected'));this.classList.add('selected')">✅ Yes</button>
        <button class="yn-btn no ${saved.answer === 'no' ? 'selected' : ''}" onclick="saveExtra(${idx},'no');document.querySelectorAll('.extra-yesno .yn-btn').forEach(b=>b.classList.remove('selected'));this.classList.add('selected')">❌ No</button>
      </div>`;
  } else if (q.type === 'multiple_choice') {
    inputHtml = `<div class="extra-choice">
      ${(q.options || []).map(opt => `
        <label>
          <input type="checkbox" value="${opt}" ${(saved.answer || []).includes(opt) ? 'checked' : ''} onchange="toggleExtraChoice(${idx},'${opt}')">
          ${opt}
        </label>`).join('')}
    </div>`;
  } else if (q.type === 'slider') {
    const min = q.sliderMin || 0, max = q.sliderMax || 100;
    inputHtml = `
      <div class="extra-slider">
        <div style="font-size:22px;font-weight:700;color:var(--primary);text-align:center;margin-bottom:8px" id="extra-slider-val">${saved.answer || min}</div>
        <input type="range" min="${min}" max="${max}" value="${saved.answer || min}" oninput="saveExtra(${idx},+this.value);document.getElementById('extra-slider-val').textContent=this.value">
        <div style="display:flex;justify-content:space-between;font-size:12px;color:#64748b"><span>${min}</span><span>${max}</span></div>
      </div>`;
  } else if (q.type === 'ranking') {
    const opts = q.options || [];
    const ranked = saved.answer || opts;
    inputHtml = `
      <p class="hint">Drag to reorder</p>
      <div class="rank-list" id="extra-rank-list">
        ${ranked.map((opt, i) => `
          <div class="rank-item" draggable="true" data-activity="${opt}">
            <div class="rank-num">${i + 1}</div>
            <span class="rank-name">${opt}</span>
            <span class="drag-handle">⠿</span>
          </div>`).join('')}
      </div>`;
  }

  const stepNum = FIXED_STEPS.length + (state.potluck ? 1 : 0) + idx + 1;
  return {
    id: 'extra_' + idx,
    html: `
      <div class="card">
        <div class="step-label">Step ${stepNum} — Additional Question</div>
        <h2>${q.text}</h2>
        ${inputHtml}
      </div>`
  };
}

function saveExtra(idx, value) {
  if (!state.extraAnswers[idx]) state.extraAnswers[idx] = {};
  state.extraAnswers[idx] = { questionId: state.extraQuestions[idx]._id, answer: value };
}

function toggleExtraChoice(idx, value) {
  if (!state.extraAnswers[idx]) state.extraAnswers[idx] = { questionId: state.extraQuestions[idx]._id, answer: [] };
  const arr = state.extraAnswers[idx].answer || [];
  const i = arr.indexOf(value);
  if (i === -1) arr.push(value); else arr.splice(i, 1);
  state.extraAnswers[idx].answer = arr;
}

// ── Drag & Drop Ranking ───────────────────────────────────────────
function initDragDrop() {
  const list = document.getElementById('rank-list') || document.getElementById('extra-rank-list');
  if (!list) return;
  let dragged = null;

  list.querySelectorAll('.rank-item').forEach(item => {
    item.addEventListener('dragstart', e => {
      dragged = item;
      setTimeout(() => item.style.opacity = '0.4', 0);
    });
    item.addEventListener('dragend', () => {
      item.style.opacity = '1';
      list.querySelectorAll('.rank-item').forEach(i => i.classList.remove('drag-over'));
      updateRankNumbers(list);
      collectRankings(list);
    });
    item.addEventListener('dragover', e => {
      e.preventDefault();
      if (item !== dragged) {
        item.classList.add('drag-over');
        const rect = item.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        if (e.clientY < mid) {
          list.insertBefore(dragged, item);
        } else {
          list.insertBefore(dragged, item.nextSibling);
        }
      }
    });
    item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
  });
}

function updateRankNumbers(list) {
  list.querySelectorAll('.rank-item').forEach((item, i) => {
    item.querySelector('.rank-num').textContent = i + 1;
  });
}

function collectRankings(list) {
  if (!list) return;
  const items = list.querySelectorAll('.rank-item');
  state.activityRankings = Array.from(items).map((item, i) => ({
    activity: item.dataset.activity === '__other__'
      ? (state.activityOther || '__other__')
      : item.dataset.activity,
    rank: i + 1
  }));
}

// ── Dual Range Slider ─────────────────────────────────────────────
function initDualSlider() {
  const track = document.getElementById('dual-slider');
  if (!track) return;

  const MIN = 0, MAX = 300, STEP = 5;
  let activeThumb = null;

  function pct(v) { return (v - MIN) / (MAX - MIN) * 100; }
  function snap(v) { return Math.min(MAX, Math.max(MIN, Math.round(v / STEP) * STEP)); }

  function render() {
    const p1 = pct(state.budgetMin), p2 = pct(state.budgetMax);
    document.getElementById('budget-display').textContent = `$${state.budgetMin} – $${state.budgetMax}`;
    document.getElementById('slider-range').style.left  = p1 + '%';
    document.getElementById('slider-range').style.width = (p2 - p1) + '%';
    document.getElementById('thumb-min').style.left = p1 + '%';
    document.getElementById('thumb-max').style.left = p2 + '%';
  }

  function clientXToVal(clientX) {
    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return snap(MIN + ratio * (MAX - MIN));
  }

  function onMove(e) {
    if (!activeThumb) return;
    e.preventDefault();
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const val = clientXToVal(x);
    if (activeThumb === 'min') state.budgetMin = Math.min(val, state.budgetMax);
    else                       state.budgetMax = Math.max(val, state.budgetMin);
    render();
  }

  function onUp() { activeThumb = null; }

  ['thumb-min', 'thumb-max'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('mousedown',  e => { activeThumb = el.dataset.thumb; e.preventDefault(); });
    el.addEventListener('touchstart', e => { activeThumb = el.dataset.thumb; }, { passive: true });
  });

  // Click anywhere on the track moves the nearest thumb
  track.addEventListener('click', e => {
    if (e.target.classList.contains('slider-thumb')) return;
    const val = clientXToVal(e.clientX);
    const mid = (state.budgetMin + state.budgetMax) / 2;
    if (val <= mid) state.budgetMin = Math.min(val, state.budgetMax);
    else            state.budgetMax = Math.max(val, state.budgetMin);
    render();
  });

  window.addEventListener('mousemove', onMove);
  window.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('mouseup',   onUp);
  window.addEventListener('touchend',  onUp);

  render();
}

// ── Navigation ────────────────────────────────────────────────────
function nextStep() {
  const def = getStepDef(currentStep);
  if (!validate(def.id)) return;
  collectStep(def.id);

  // Rebuild step list after potluck answer is known
  currentStep++;
  renderStep(currentStep);
}

function prevStep() {
  if (currentStep > 0) { currentStep--; renderStep(currentStep); }
}

function validate(id) {
  if (id === 'basicInfo') {
    const name = document.getElementById('childName').value.trim();
    const num = parseInt(document.getElementById('numAttending').value);
    if (!name) { alert('Please enter your child\'s first name.'); return false; }
    if (!num || num < 1) { alert('Please enter how many are attending.'); return false; }
  }
  if (id === 'category' && !state.category) {
    alert('Please select a category.'); return false;
  }
  if (id === 'potluck' && state.potluck === null) {
    alert('Please answer yes or no.'); return false;
  }
  return true;
}

function collectStep(id) {
  if (id === 'basicInfo') {
    state.childName = document.getElementById('childName').value.trim();
    state.numAttending = parseInt(document.getElementById('numAttending').value) || 1;
  }
  if (id === 'activities') {
    const list = document.getElementById('rank-list');
    if (list) collectRankings(list);
  }
  if (id === 'potluckFood') {
    state.potluckFood = Array.from(document.querySelectorAll('.food-item input:checked')).map(cb => cb.value);
    state.potluckOther = document.getElementById('potluck-other')?.value || '';
  }
}

// ── Submit ────────────────────────────────────────────────────────
async function submitSurvey() {
  const payload = {
    childName: state.childName,
    numAttending: state.numAttending,
    category: state.category,
    activityRankings: state.activityRankings.filter(r => r.activity !== '__other__' || state.activityOther),
    activityOther: state.activityOther,
    budgetMin: state.budgetMin,
    budgetMax: state.budgetMax,
    potluck: state.potluck,
    potluckFood: state.potluckFood,
    potluckOther: state.potluckOther,
    extraAnswers: state.extraAnswers.filter(Boolean)
  };

  try {
    const res = await fetch('/api/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.ok) {
      document.getElementById('step-container').innerHTML = `
        <div class="card">
          <div class="success-screen">
            <div class="check">🎉</div>
            <h2>Thank you, ${state.childName}'s family!</h2>
            <p>Your response has been saved.<br>We'll use it to plan the best grad celebration for the kids!</p>
            <p style="margin-top:16px;font-size:13px;color:#94a3b8">Response ID: ${data.id}</p>
          </div>
        </div>`;
      document.getElementById('frame-bottom').style.display = 'none';
      document.getElementById('progress-fill').style.width = '100%';
    } else {
      alert('Error saving response: ' + data.error);
    }
  } catch (e) {
    alert('Network error. Please try again.');
  }
}

// ── Landing page ──────────────────────────────────────────────────
async function loadLandingStats() {
  try {
    const d = await fetch('/api/summary').then(r => r.json());

    document.getElementById('stat-total').textContent = d.total;
    document.getElementById('stat-budget').textContent =
      d.total ? `$${d.avgBudgetMin} – $${d.avgBudgetMax}` : 'N/A';
    document.getElementById('stat-potluck').textContent =
      d.total ? Math.round(d.potluckYes / d.total * 100) + '%' : '—';

    if (!d.total) {
      document.getElementById('no-data-msg').style.display = '';
      return;
    }

    new Chart(document.getElementById('chart-cat'), {
      type: 'bar',
      data: {
        labels: ['🌳 Land', '⛵ Sea', '🏖️ Beach'],
        datasets: [{
          data: [d.catCount.Land, d.catCount.Sea, d.catCount.Beach],
          backgroundColor: ['#16a34a', '#2563eb', '#f59e0b'],
          borderRadius: 6
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
      }
    });

    if (d.topActivities.length) {
      new Chart(document.getElementById('chart-activities'), {
        type: 'bar',
        data: {
          labels: d.topActivities.map(a => a.name.length > 22 ? a.name.slice(0, 20) + '…' : a.name),
          datasets: [{
            data: d.topActivities.map(a => a.score),
            backgroundColor: '#2563eb',
            borderRadius: 4
          }]
        },
        options: {
          indexAxis: 'y',
          plugins: { legend: { display: false } },
          scales: { x: { beginAtZero: true } }
        }
      });
    }
  } catch (e) {
    console.error('Stats load error:', e);
  }
}

function startSurvey() {
  document.getElementById('landing-view').style.display = 'none';
  document.getElementById('survey-view').style.display = '';
  document.getElementById('nav-row').style.display = 'flex';
  document.getElementById('frame-top').scrollTop = 0;
  init();
}

document.addEventListener('DOMContentLoaded', loadLandingStats);
