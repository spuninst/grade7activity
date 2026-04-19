const mongoose = require('mongoose');

// ── Survey Response ──────────────────────────────────────────────
const responseSchema = new mongoose.Schema({
  childName: { type: String, required: true, trim: true },
  numAttending: { type: Number, required: true, min: 1 },
  category: { type: String, enum: ['Land', 'Sea', 'Beach'], required: true },
  activityRankings: [{ activity: String, rank: Number }],
  budgetMin: { type: Number, required: true },
  budgetMax: { type: Number, required: true },
  potluck: { type: Boolean, required: true },
  potluckFood: [String],
  potluckOther: { type: String, default: '' },
  extraAnswers: [{ questionId: mongoose.Schema.Types.ObjectId, answer: mongoose.Schema.Types.Mixed }],
  submittedAt: { type: Date, default: Date.now }
});

// ── Admin Extra Questions ────────────────────────────────────────
const questionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  type: {
    type: String,
    enum: ['text', 'yesno', 'multiple_choice', 'slider', 'ranking'],
    required: true
  },
  options: [String],          // for multiple_choice / ranking
  sliderMin: Number,          // for slider
  sliderMax: Number,
  order: { type: Number, default: 99 },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = {
  Response: mongoose.model('Response', responseSchema),
  Question: mongoose.model('Question', questionSchema)
};
