require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const { Response, Question } = require('./server/models');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ── Cookie parser (no extra package) ─────────────────────────────
app.use((req, res, next) => {
  req.cookies = {};
  (req.headers.cookie || '').split(';').forEach(c => {
    const i = c.indexOf('=');
    if (i > 0) req.cookies[c.slice(0, i).trim()] = c.slice(i + 1).trim();
  });
  next();
});

// ── Site password auth ────────────────────────────────────────────
const SITE_PWD = process.env.SURVEY_PASSWORD;
const AUTH_TOKEN = SITE_PWD
  ? crypto.createHash('sha256').update(SITE_PWD + ':grad_survey_2025').digest('hex')
  : null;

function checkAuth(req) {
  if (!AUTH_TOKEN) return true; // no password set → open access
  return req.cookies.auth === AUTH_TOKEN;
}

function requireAuth(req, res, next) {
  if (checkAuth(req)) return next();
  res.redirect('/login');
}

function requireApiAuth(req, res, next) {
  if (checkAuth(req)) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// ── Public routes (login / logout) ───────────────────────────────
app.get('/login', (req, res) => {
  if (checkAuth(req)) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/auth/login', (req, res) => {
  if (!AUTH_TOKEN || req.body.password === SITE_PWD) {
    if (AUTH_TOKEN) {
      res.cookie('auth', AUTH_TOKEN, {
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
    }
    return res.redirect('/');
  }
  res.redirect('/login?error=1');
});

app.get('/logout', (req, res) => {
  res.clearCookie('auth');
  res.redirect('/login');
});

// ── Protected HTML pages ──────────────────────────────────────────
app.get('/', requireAuth, (req, res, next) => next());
app.get('/admin', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'admin.html'))
);

// ── Static files ──────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── DB Connect ───────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err.message));

// ── Static activity data ─────────────────────────────────────────
const ACTIVITIES = {
  Land: [
    'Laser Tag Battle (Laserdome Plus)',
    'Escape Room Challenge (Find & Seek)',
    'Glow Bowling Night (Grandview Lanes)',
    'Interactive Game Rooms (Game On GO!)',
    'Stanley Park Bike Ride'
  ],
  Sea: [
    'Whale Watching Tour (Prince of Whales)',
    'Group Sea Kayaking (Deep Cove)',
    'Harbour Dinner Cruise',
    'City & Seals Boat Tour',
    'Pirate Boat/Picnic'
  ],
  Beach: [
    'Beach Volleyball Tournament (Kits Beach)',
    'Bonfire & BBQ Picnic (Spanish Banks)',
    'Sunset Kayak Tour (Jericho Beach)',
    'Sandcastle Contest (Jericho Beach)'
  ]
};

const POTLUCK_OPTIONS = [
  'Sandwiches / Wraps',
  'Veggie Tray & Dip',
  'Fruit Salad',
  'Chips & Salsa',
  'Cupcakes / Cake',
  'Pasta Salad',
  'Hot Dogs & Buns',
  'Juice Boxes / Drinks',
  'Cookies / Brownies',
  'Pizza'
];

// ── Admin API (no site-cookie required — uses own adminAuth) ──────
function adminAuth(req, res, next) {
  if (req.headers['x-admin-password'] !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

app.get('/api/admin/responses', adminAuth, async (req, res) => {
  try {
    const responses = await Response.find().sort({ submittedAt: -1 });
    res.json(responses);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/admin/summary', adminAuth, async (req, res) => {
  try {
    const all = await Response.find();
    const total = all.length;
    const totalAttendees = all.reduce((s, r) => s + r.numAttending, 0);
    const catCount = { Land: 0, Sea: 0, Beach: 0 };
    const activityVotes = {};
    let potluckYes = 0;
    const foodCount = {};
    const budgets = all.map(r => ({ min: r.budgetMin, max: r.budgetMax }));

    all.forEach(r => {
      catCount[r.category] = (catCount[r.category] || 0) + 1;
      if (r.potluck) potluckYes++;
      r.potluckFood.forEach(f => { foodCount[f] = (foodCount[f] || 0) + 1; });
      if (r.potluckOther && r.potluckOther.trim()) {
        const key = r.potluckOther.trim();
        foodCount[key] = (foodCount[key] || 0) + 1;
      }
      r.activityRankings.forEach(a => {
        if (!activityVotes[a.activity]) activityVotes[a.activity] = 0;
        activityVotes[a.activity] += (10 - a.rank);
      });
    });

    const avgBudgetMin = total ? Math.round(budgets.reduce((s, b) => s + b.min, 0) / total) : 0;
    const avgBudgetMax = total ? Math.round(budgets.reduce((s, b) => s + b.max, 0) / total) : 0;

    res.json({ total, totalAttendees, catCount, potluckYes, potluckNo: total - potluckYes, foodCount, activityVotes, avgBudgetMin, avgBudgetMax });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/admin/responses/:id', adminAuth, async (req, res) => {
  try {
    await Response.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch('/api/admin/responses/:id', adminAuth, async (req, res) => {
  try {
    const allowed = ['childName', 'numAttending', 'category', 'budgetMin', 'budgetMax', 'potluck', 'potluckFood', 'potluckOther', 'activityRankings'];
    const update = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
    const doc = await Response.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/admin/questions', adminAuth, async (req, res) => {
  try {
    const q = new Question(req.body);
    await q.save();
    res.status(201).json(q);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch('/api/admin/questions/:id', adminAuth, async (req, res) => {
  try {
    const q = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(q);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/admin/questions/:id', adminAuth, async (req, res) => {
  try {
    await Question.findByIdAndUpdate(req.params.id, { active: false });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ── API auth guard (survey routes) ───────────────────────────────
app.use('/api', requireApiAuth);

// ── Survey API ────────────────────────────────────────────────────
app.get('/api/config', (req, res) => {
  res.json({ activities: ACTIVITIES, potluckOptions: POTLUCK_OPTIONS });
});

app.get('/api/questions', async (req, res) => {
  try {
    const questions = await Question.find({ active: true }).sort({ order: 1 });
    res.json(questions);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/responses', async (req, res) => {
  try {
    const doc = new Response(req.body);
    await doc.save();
    res.status(201).json({ ok: true, id: doc._id });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ── Public summary (site-password protected, no admin pwd needed) ─
app.get('/api/summary', async (req, res) => {
  try {
    const all = await Response.find();
    const total = all.length;
    const catCount = { Land: 0, Sea: 0, Beach: 0 };
    const activityVotes = {};
    let potluckYes = 0;
    const budgets = [];

    all.forEach(r => {
      catCount[r.category] = (catCount[r.category] || 0) + 1;
      if (r.potluck) potluckYes++;
      budgets.push({ min: r.budgetMin, max: r.budgetMax });
      r.activityRankings.forEach(a => {
        if (!activityVotes[a.activity]) activityVotes[a.activity] = 0;
        activityVotes[a.activity] += (10 - a.rank);
      });
    });

    const topActivities = Object.entries(activityVotes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, score]) => ({ name, score }));

    const avgBudgetMin = total ? Math.round(budgets.reduce((s, b) => s + b.min, 0) / total) : 0;
    const avgBudgetMax = total ? Math.round(budgets.reduce((s, b) => s + b.max, 0) / total) : 0;

    res.json({ total, catCount, potluckYes, potluckNo: total - potluckYes, topActivities, avgBudgetMin, avgBudgetMax });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
