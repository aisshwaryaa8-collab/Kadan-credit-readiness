// ============================================================
// KADAN — Credit-Readiness Score Engine
// Multi-step application flow. All logic runs client-side.
// ============================================================

const WEIGHTS = {
  regularity: 0.30,
  tenure: 0.25,
  ratings: 0.20,
  bills: 0.25,
};

const PRESETS = {
  ramesh: { regularity: 75, tenure: 26, ratings: 4.6, bills: 97 },
  lakshmi: { regularity: 50, tenure: 40, ratings: 4.1, bills: 85 },
  arjun: { regularity: 20, tenure: 3, ratings: 3.8, bills: 62 },
};

const STEP_LABELS = {
  regularity: "UPI Transaction Regularity",
  tenure: "Work Tenure",
  ratings: "App / Customer Rating",
  bills: "Utility Bill Payment History",
};

const FIELD_TO_STEP = { regularity: 1, tenure: 2, ratings: 3, bills: 4 };

// ---------- STATE ----------
const appData = { regularity: null, tenure: null, ratings: null, bills: null };
let currentStep = 1;
const TOTAL_STEPS = 5;
let lastResult = null;

// ---------- DOM ----------
const stepPanels = document.querySelectorAll(".step-panel");
const stepDots = document.querySelectorAll(".step-dot");
const backBtn = document.getElementById("backBtn");
const nextBtn = document.getElementById("nextBtn");
const generateBtn = document.getElementById("generateBtn");
const reviewList = document.getElementById("reviewList");
const demoSelect = document.getElementById("demoSelect");

const tenureInput = document.getElementById("tenureInput");
const ratingsInput = document.getElementById("ratingsInput");
const stars = document.querySelectorAll(".star");

const appShell = document.getElementById("appShell");
const resultsSection = document.getElementById("results");

// ---------- NAVIGATION ----------
function showStep(step) {
  currentStep = step;
  stepPanels.forEach((p) => p.classList.toggle("active", Number(p.dataset.panel) === step));
  stepDots.forEach((d) => {
    const n = Number(d.dataset.step);
    d.classList.toggle("active", n === step);
    d.classList.toggle("done", n < step);
  });

  backBtn.hidden = step === 1;
  nextBtn.hidden = step === TOTAL_STEPS;
  generateBtn.hidden = step !== TOTAL_STEPS;

  if (step < TOTAL_STEPS) validateCurrentStep();
  if (step === TOTAL_STEPS) renderReview();
}

function validateCurrentStep() {
  let valid = false;
  if (currentStep === 1) valid = appData.regularity !== null;
  if (currentStep === 2) valid = appData.tenure !== null && appData.tenure >= 0;
  if (currentStep === 3) valid = appData.ratings !== null && appData.ratings >= 0 && appData.ratings <= 5;
  if (currentStep === 4) valid = appData.bills !== null;
  nextBtn.disabled = !valid;
}

backBtn.addEventListener("click", () => showStep(Math.max(1, currentStep - 1)));
nextBtn.addEventListener("click", () => {
  if (!nextBtn.disabled) showStep(Math.min(TOTAL_STEPS, currentStep + 1));
});

// ---------- STEP 1 & 4: OPTION CARDS ----------
function refreshOptionSelection(name) {
  document.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
    input.closest(".option-card").classList.toggle("selected", input.checked);
  });
}
document.querySelectorAll('input[name="regularity"]').forEach((input) => {
  input.addEventListener("change", () => {
    appData.regularity = Number(input.value);
    refreshOptionSelection("regularity");
    validateCurrentStep();
  });
});
document.querySelectorAll('input[name="bills"]').forEach((input) => {
  input.addEventListener("change", () => {
    appData.bills = Number(input.value);
    refreshOptionSelection("bills");
    validateCurrentStep();
  });
});

// ---------- STEP 2: TENURE ----------
tenureInput.addEventListener("input", () => {
  const val = tenureInput.value === "" ? null : Number(tenureInput.value);
  appData.tenure = val;
  validateCurrentStep();
});
document.querySelectorAll(".quick-chips .chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    tenureInput.value = chip.dataset.value;
    appData.tenure = Number(chip.dataset.value);
    validateCurrentStep();
  });
});

// ---------- STEP 3: STAR RATING ----------
function setStars(value) {
  stars.forEach((star) => {
    star.classList.toggle("filled", Number(star.dataset.star) <= Math.round(value));
  });
}
stars.forEach((star) => {
  star.addEventListener("click", () => {
    const val = Number(star.dataset.star);
    ratingsInput.value = val.toFixed(1);
    appData.ratings = val;
    setStars(val);
    validateCurrentStep();
  });
});
ratingsInput.addEventListener("input", () => {
  const val = ratingsInput.value === "" ? null : Number(ratingsInput.value);
  appData.ratings = val;
  if (val !== null) setStars(val);
  validateCurrentStep();
});

// ---------- STEP 5: REVIEW ----------
function formatValue(field, value) {
  if (field === "regularity" || field === "bills") return `${value}%`;
  if (field === "tenure") return `${value} months`;
  if (field === "ratings") return `${Number(value).toFixed(1)} / 5`;
  return value;
}
function renderReview() {
  reviewList.innerHTML = "";
  Object.keys(STEP_LABELS).forEach((field) => {
    const li = document.createElement("li");
    li.className = "review-item";
    li.innerHTML = `
      <div>
        <div class="review-label">${STEP_LABELS[field]}</div>
        <div class="review-value">${formatValue(field, appData[field])}</div>
      </div>
      <button type="button" class="review-edit" data-goto="${FIELD_TO_STEP[field]}">Edit</button>
    `;
    reviewList.appendChild(li);
  });
  reviewList.querySelectorAll(".review-edit").forEach((btn) => {
    btn.addEventListener("click", () => showStep(Number(btn.dataset.goto)));
  });
}

// ---------- SCORING ENGINE ----------
function tenureSubScore(months) {
  if (months <= 6) return (months / 6) * 40;
  if (months <= 18) return 40 + ((months - 6) / 12) * 30;
  return 70 + Math.min((months - 18) / 24, 1) * 30;
}
function ratingsSubScore(rating) {
  return (rating / 5) * 100;
}

function calculateScore(inputs) {
  const regularitySub = inputs.regularity;
  const tenureSub = tenureSubScore(inputs.tenure);
  const ratingsSub = ratingsSubScore(inputs.ratings);
  const billsSub = inputs.bills;

  const breakdown = [
    {
      signal: STEP_LABELS.regularity,
      raw: `${inputs.regularity}%`,
      weight: WEIGHTS.regularity,
      points: regularitySub * WEIGHTS.regularity,
      maxPoints: 100 * WEIGHTS.regularity,
      reason:
        regularitySub >= 75 ? "Very consistent digital payment activity" :
        regularitySub >= 50 ? "Moderately regular UPI usage" :
        "Irregular UPI transaction history",
    },
    {
      signal: STEP_LABELS.tenure,
      raw: `${inputs.tenure} months`,
      weight: WEIGHTS.tenure,
      points: tenureSub * WEIGHTS.tenure,
      maxPoints: 100 * WEIGHTS.tenure,
      reason:
        inputs.tenure >= 18 ? "Long, stable work tenure (18+ months)" :
        inputs.tenure >= 6 ? "Building steady work history" :
        "Early-stage work tenure",
    },
    {
      signal: STEP_LABELS.ratings,
      raw: `${Number(inputs.ratings).toFixed(1)} / 5`,
      weight: WEIGHTS.ratings,
      points: ratingsSub * WEIGHTS.ratings,
      maxPoints: 100 * WEIGHTS.ratings,
      reason:
        inputs.ratings >= 4.5 ? "Excellent customer/service ratings" :
        inputs.ratings >= 3.5 ? "Good, reliable service ratings" :
        "Ratings below platform average",
    },
    {
      signal: STEP_LABELS.bills,
      raw: `${inputs.bills}%`,
      weight: WEIGHTS.bills,
      points: billsSub * WEIGHTS.bills,
      maxPoints: 100 * WEIGHTS.bills,
      reason:
        billsSub >= 80 ? "Consistent, on-time bill payments" :
        billsSub >= 55 ? "Mostly on-time with occasional delays" :
        "Frequent missed or late payments",
    },
  ];

  const weightedTotal = breakdown.reduce((sum, item) => sum + item.points, 0);
  const score850 = Math.round(300 + (weightedTotal / 100) * 550);

  let tier;
  if (score850 >= 700) tier = "good";
  else if (score850 >= 500) tier = "mid";
  else tier = "low";

  return { score850, tier, breakdown };
}

const TIER_COPY = {
  good: { label: "Credit Ready", desc: "Strong, explainable signals of financial reliability. Ready to be shared with a lender or NBFC." },
  mid: { label: "Building Readiness", desc: "Solid foundation with room to grow — a few more months of consistent activity will strengthen this score." },
  low: { label: "Needs More History", desc: "Early signals only. Keep building UPI regularity and on-time payments to improve readiness." },
};

const GAUGE_ARC_LENGTH = 283;

function renderResults(result) {
  lastResult = result;

  document.getElementById("scoreValue").textContent = result.score850;

  const fraction = (result.score850 - 300) / 550;
  const offset = GAUGE_ARC_LENGTH - GAUGE_ARC_LENGTH * fraction;
  const gaugeFill = document.getElementById("gaugeFill");
  gaugeFill.style.strokeDashoffset = offset;
  const tierColor = { good: "#34D399", mid: "#FBBF24", low: "#F472B6" };
  gaugeFill.style.stroke = tierColor[result.tier];

  const tierInfo = TIER_COPY[result.tier];
  const tierBadge = document.getElementById("tierBadge");
  tierBadge.textContent = tierInfo.label;
  tierBadge.className = `tier-badge tier-${result.tier}`;
  document.getElementById("tierDesc").textContent = tierInfo.desc;

  const list = document.getElementById("breakdownList");
  list.innerHTML = "";
  result.breakdown.forEach((item) => {
    const li = document.createElement("li");
    li.className = "breakdown-item";
    li.innerHTML = `
      <div>
        <div class="breakdown-reason">${item.signal}</div>
        <div class="breakdown-sub">${item.reason} — input: ${item.raw}</div>
      </div>
      <div class="breakdown-points">+${item.points.toFixed(1)} / ${item.maxPoints.toFixed(0)}</div>
    `;
    list.appendChild(li);
  });

  appShell.closest(".app-section").hidden = true;
  document.querySelector(".demo-loader").hidden = true;
  resultsSection.hidden = false;
  resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

generateBtn.addEventListener("click", () => {
  const result = calculateScore(appData);
  renderResults(result);
});

// ---------- RESTART ----------
document.getElementById("restartBtn").addEventListener("click", () => {
  Object.keys(appData).forEach((k) => (appData[k] = null));
  document.querySelectorAll('input[type="radio"]').forEach((r) => (r.checked = false));
  document.querySelectorAll(".option-card.selected").forEach((c) => c.classList.remove("selected"));
  tenureInput.value = "";
  ratingsInput.value = "";
  setStars(0);
  demoSelect.value = "";

  resultsSection.hidden = true;
  document.querySelector(".app-section").hidden = false;
  document.querySelector(".demo-loader").hidden = false;
  showStep(1);
  document.getElementById("app").scrollIntoView({ behavior: "smooth", block: "start" });
});

// ---------- DEMO LOADER ----------
demoSelect.addEventListener("change", () => {
  const preset = PRESETS[demoSelect.value];
  if (!preset) return;

  appData.regularity = preset.regularity;
  appData.tenure = preset.tenure;
  appData.ratings = preset.ratings;
  appData.bills = preset.bills;

  const regRadio = document.querySelector(`input[name="regularity"][value="${preset.regularity}"]`);
  if (regRadio) regRadio.checked = true;
  const billRadio = document.querySelector(`input[name="bills"][value="${preset.bills}"]`);
  if (billRadio) billRadio.checked = true;
  refreshOptionSelection("regularity");
  refreshOptionSelection("bills");
  tenureInput.value = preset.tenure;
  ratingsInput.value = preset.ratings.toFixed(1);
  setStars(preset.ratings);

  showStep(5);
});

// ---------- PDF EXPORT ----------
document.getElementById("exportBtn").addEventListener("click", () => {
  if (!lastResult) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const tierInfo = TIER_COPY[lastResult.tier];

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Kadan — Credit-Readiness Report", 20, 25);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Alternative Credit-Readiness Assessment (Prototype)", 20, 33);

  doc.setDrawColor(200);
  doc.line(20, 38, 190, 38);

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`Score: ${lastResult.score850} / 850`, 20, 52);
  doc.text(`Tier: ${tierInfo.label}`, 20, 60);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const descLines = doc.splitTextToSize(tierInfo.desc, 170);
  doc.text(descLines, 20, 68);

  let y = 68 + descLines.length * 6 + 10;
  doc.setFont("helvetica", "bold");
  doc.text("Score Breakdown", 20, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  lastResult.breakdown.forEach((item) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${item.signal}`, 20, y);
    doc.setFont("helvetica", "normal");
    doc.text(`+${item.points.toFixed(1)} / ${item.maxPoints.toFixed(0)} pts`, 150, y);
    y += 6;
    const reasonLines = doc.splitTextToSize(`${item.reason} (input: ${item.raw})`, 170);
    doc.setFontSize(9.5);
    doc.setTextColor(100);
    doc.text(reasonLines, 20, y);
    doc.setFontSize(11);
    doc.setTextColor(0);
    y += reasonLines.length * 5 + 6;
  });

  doc.setDrawColor(200);
  doc.line(20, y + 2, 190, y + 2);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text("Generated by Kadan — Alternative Credit-Readiness Platform. Prototype for HackInTym'26 2.0.", 20, y + 10);

  doc.save("Kadan_Credit_Readiness_Report.pdf");
});

// ---------- HEADER GITHUB LINK ----------
document.getElementById("githubLink").href = "https://github.com/aisshwaryaa8-collab/kadan-credit-readiness";

// ---------- INIT ----------
showStep(1);
if (window.lucide) lucide.createIcons();
