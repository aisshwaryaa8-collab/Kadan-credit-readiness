// ============================================================
// KADAN — Credit-Readiness Score Engine
// All logic runs client-side. No backend required for this prototype.
// ============================================================

// ---------- 1. WEIGHTS (must sum to 1.0) ----------
const WEIGHTS = {
  regularity: 0.30, // UPI transaction regularity
  tenure: 0.25,     // Work tenure
  ratings: 0.20,    // App / customer ratings
  bills: 0.25,      // Utility bill payment history
};

// ---------- 2. SAMPLE PROFILES (for live demo) ----------
const PRESETS = {
  ramesh: { regularity: 82, tenure: 26, ratings: 4.6, bills: 88 },
  lakshmi: { regularity: 65, tenure: 40, ratings: 4.1, bills: 70 },
  arjun: { regularity: 45, tenure: 3, ratings: 3.8, bills: 55 },
};

// ---------- 3. DOM REFERENCES ----------
const el = {
  regularity: document.getElementById("regularity"),
  tenure: document.getElementById("tenure"),
  ratings: document.getElementById("ratings"),
  bills: document.getElementById("bills"),

  regularityValue: document.getElementById("regularityValue"),
  tenureValue: document.getElementById("tenureValue"),
  ratingsValue: document.getElementById("ratingsValue"),
  billsValue: document.getElementById("billsValue"),

  calculateBtn: document.getElementById("calculateBtn"),
  exportBtn: document.getElementById("exportBtn"),
  results: document.getElementById("results"),

  scoreValue: document.getElementById("scoreValue"),
  gaugeFill: document.getElementById("gaugeFill"),
  tierBadge: document.getElementById("tierBadge"),
  tierDesc: document.getElementById("tierDesc"),
  breakdownList: document.getElementById("breakdownList"),
};

let lastResult = null; // cached for PDF export

// ---------- 4. LIVE LABEL UPDATES ----------
function refreshLabels() {
  el.regularityValue.textContent = `${el.regularity.value}%`;
  el.tenureValue.textContent = `${el.tenure.value} months`;
  el.ratingsValue.textContent = `${parseFloat(el.ratings.value).toFixed(1)} / 5`;
  el.billsValue.textContent = `${el.bills.value}%`;
}
[el.regularity, el.tenure, el.ratings, el.bills].forEach((input) =>
  input.addEventListener("input", refreshLabels)
);

// ---------- 5. SUB-SCORING RULES (0–100 each) ----------
function tenureSubScore(months) {
  if (months <= 6) return (months / 6) * 40;
  if (months <= 18) return 40 + ((months - 6) / 12) * 30;
  return 70 + Math.min((months - 18) / 24, 1) * 30;
}
function ratingsSubScore(rating) {
  return (rating / 5) * 100;
}

// ---------- 6. MAIN SCORING FUNCTION ----------
function calculateScore(inputs) {
  const regularitySub = inputs.regularity;      // already 0–100
  const tenureSub = tenureSubScore(inputs.tenure);
  const ratingsSub = ratingsSubScore(inputs.ratings);
  const billsSub = inputs.bills;                // already 0–100

  const breakdown = [
    {
      signal: "UPI Transaction Regularity",
      raw: `${inputs.regularity}%`,
      subScore: regularitySub,
      weight: WEIGHTS.regularity,
      points: regularitySub * WEIGHTS.regularity,
      maxPoints: 100 * WEIGHTS.regularity,
      reason:
        regularitySub >= 75
          ? "Very consistent digital payment activity"
          : regularitySub >= 50
          ? "Moderately regular UPI usage"
          : "Irregular UPI transaction history",
    },
    {
      signal: "Work Tenure",
      raw: `${inputs.tenure} months`,
      subScore: tenureSub,
      weight: WEIGHTS.tenure,
      points: tenureSub * WEIGHTS.tenure,
      maxPoints: 100 * WEIGHTS.tenure,
      reason:
        inputs.tenure >= 18
          ? "Long, stable work tenure (18+ months)"
          : inputs.tenure >= 6
          ? "Building steady work history"
          : "Early-stage work tenure",
    },
    {
      signal: "App / Customer Ratings",
      raw: `${parseFloat(inputs.ratings).toFixed(1)} / 5`,
      subScore: ratingsSub,
      weight: WEIGHTS.ratings,
      points: ratingsSub * WEIGHTS.ratings,
      maxPoints: 100 * WEIGHTS.ratings,
      reason:
        inputs.ratings >= 4.5
          ? "Excellent customer/service ratings"
          : inputs.ratings >= 3.5
          ? "Good, reliable service ratings"
          : "Ratings below platform average",
    },
    {
      signal: "Utility Bill Payment History",
      raw: `${inputs.bills}%`,
      subScore: billsSub,
      weight: WEIGHTS.bills,
      points: billsSub * WEIGHTS.bills,
      maxPoints: 100 * WEIGHTS.bills,
      reason:
        billsSub >= 80
          ? "Consistent, on-time bill payments"
          : billsSub >= 55
          ? "Mostly on-time with occasional delays"
          : "Frequent missed or late payments",
    },
  ];

  const weightedTotal = breakdown.reduce((sum, item) => sum + item.points, 0); // 0–100
  const score850 = Math.round(300 + (weightedTotal / 100) * 550);             // 300–850

  let tier;
  if (score850 >= 700) tier = "good";
  else if (score850 >= 500) tier = "mid";
  else tier = "low";

  return { score850, weightedTotal, tier, breakdown };
}

// ---------- 7. TIER COPY ----------
const TIER_COPY = {
  good: {
    label: "Credit Ready",
    desc: "Strong, explainable signals of financial reliability. Ready to be shared with a lender or NBFC.",
  },
  mid: {
    label: "Building Readiness",
    desc: "Solid foundation with room to grow — a few more months of consistent activity will strengthen this score.",
  },
  low: {
    label: "Needs More History",
    desc: "Early signals only. Keep building UPI regularity and on-time payments to improve readiness.",
  },
};

// ---------- 8. RENDER RESULTS ----------
const GAUGE_ARC_LENGTH = 283; // approx. circumference of the semicircle path in the SVG

function renderResults(result) {
  lastResult = result;

  el.results.hidden = false;
  el.results.scrollIntoView({ behavior: "smooth", block: "start" });

  // Score number
  el.scoreValue.textContent = result.score850;

  // Gauge fill
  const fraction = (result.score850 - 300) / 550; // 0–1
  const offset = GAUGE_ARC_LENGTH - GAUGE_ARC_LENGTH * fraction;
  el.gaugeFill.style.strokeDashoffset = offset;

  const tierColor = { good: "#34D399", mid: "#FBBF24", low: "#F472B6" };
  el.gaugeFill.style.stroke = tierColor[result.tier];

  // Tier badge
  const tierInfo = TIER_COPY[result.tier];
  el.tierBadge.textContent = tierInfo.label;
  el.tierBadge.className = `tier-badge tier-${result.tier}`;
  el.tierDesc.textContent = tierInfo.desc;

  // Breakdown list
  el.breakdownList.innerHTML = "";
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
    el.breakdownList.appendChild(li);
  });
}

// ---------- 9. CALCULATE BUTTON ----------
el.calculateBtn.addEventListener("click", () => {
  const inputs = {
    regularity: Number(el.regularity.value),
    tenure: Number(el.tenure.value),
    ratings: Number(el.ratings.value),
    bills: Number(el.bills.value),
  };
  const result = calculateScore(inputs);
  renderResults(result);
});

// ---------- 10. PRESET PROFILE CHIPS ----------
document.querySelectorAll(".preset-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    document.querySelectorAll(".preset-chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");

    const preset = PRESETS[chip.dataset.preset];
    el.regularity.value = preset.regularity;
    el.tenure.value = preset.tenure;
    el.ratings.value = preset.ratings;
    el.bills.value = preset.bills;
    refreshLabels();

    // Auto-calculate for a snappy live demo
    el.calculateBtn.click();
  });
});

// ---------- 11. PDF EXPORT ----------
el.exportBtn.addEventListener("click", () => {
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
  doc.text(
    "Generated by Kadan — Alternative Credit-Readiness Platform. Prototype for HackInTym'26 2.0.",
    20,
    y + 10
  );

  doc.save("Kadan_Credit_Readiness_Report.pdf");
});

// ---------- 12. INIT ----------
refreshLabels();
if (window.lucide) lucide.createIcons();
