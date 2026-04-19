# 🎓 Grade 7 Grad Celebration Survey

A full-stack Node.js + Express survey app with MongoDB Atlas backend.

## Project Structure

```
grad-survey/
├── index.js              ← Express server + all API routes
├── server/
│   └── models.js         ← Mongoose schemas (Response, Question)
├── public/
│   ├── index.html        ← Survey (two-frame layout)
│   ├── admin.html        ← Admin console
│   ├── css/style.css     ← Survey styles
│   └── js/survey.js      ← Survey multi-step logic
├── .env.example          ← Copy to .env and fill in
└── package.json
```

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```
Edit `.env`:
```
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/grad_survey?retryWrites=true&w=majority
PORT=3000
ADMIN_PASSWORD=yourSecurePassword
```

### 3. MongoDB Atlas setup
1. Go to https://cloud.mongodb.com
2. Create a free M0 cluster
3. Create a database user (username + password)
4. Whitelist your IP (or 0.0.0.0/0 for open access)
5. Get your connection string and paste into MONGODB_URI

### 4. Run
```bash
npm start
# or for development with auto-reload:
npm run dev
```

## URLs

| URL | Description |
|-----|-------------|
| `http://localhost:3000` | Survey for parents |
| `http://localhost:3000/admin` | Admin console |

## API Endpoints

### Public
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/config` | Activity lists + potluck food options |
| GET | `/api/questions` | Active custom questions |
| POST | `/api/responses` | Submit a survey response |

### Admin (requires `x-admin-password` header)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/responses` | All responses |
| GET | `/api/admin/summary` | Analytics summary |
| POST | `/api/admin/questions` | Add a custom question |
| PATCH | `/api/admin/questions/:id` | Update a question |
| DELETE | `/api/admin/questions/:id` | Soft-delete a question |

## Survey Flow

```
1. Child's first name + number attending
2. Category selection: Land / Sea / Beach
3. Drag-to-rank activities (filtered by category)
4. Budget slider (min–max per head, $0–$300)
5. Potluck Yes/No
   └── If Yes → food multi-select checklist
6. Any custom questions added via Admin Console
```

## Admin Console Features
- Dashboard with response stats, category breakdown, activity popularity, food contributions
- Full response table with CSV export
- Add custom questions (Text, Yes/No, Multiple Choice, Slider, Ranking)
- Questions appear live in the survey immediately after adding
