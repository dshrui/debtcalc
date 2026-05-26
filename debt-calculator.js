const demoDebts = [
  { type: "creditCard", name: "Credit card", balance: 8200, rate: 18, minPayment: 410, status: "current" },
  { type: "personalLoan", name: "Personal loan", balance: 14500, rate: 9.8, minPayment: 530, status: "current" },
  { type: "bnpl", name: "BNPL / PayLater", balance: 1650, rate: 0, minPayment: 210, status: "dueSoon" },
  { type: "ptptn", name: "PTPTN", balance: 7800, rate: 1, minPayment: 150, status: "current" },
];

const debtTypeConfigs = {
  creditCard: {
    label: "Credit card",
    defaultName: "Credit card",
    structure: "Revolving interest",
    helper: "Use statement balance, minimum due, and annual finance charge if known.",
    rateHint: "Rate matters here. Use the annual finance charge if known.",
    defaultRate: 18,
  },
  bnpl: {
    label: "BNPL / PayLater",
    defaultName: "BNPL / PayLater",
    structure: "Scheduled payment",
    helper: "No rate needed for most BNPL. Enter total outstanding and the monthly amount due.",
    rateHint: "Keep 0 unless the provider shows a finance charge.",
    defaultRate: 0,
  },
  personalLoan: {
    label: "Personal loan / financing",
    defaultName: "Personal loan",
    structure: "Fixed instalment",
    helper: "Use monthly instalment and outstanding balance or settlement amount if known.",
    rateHint: "Use effective annual rate if known. Otherwise leave current estimate.",
    defaultRate: 8,
  },
  carLoan: {
    label: "Car loan / hire purchase",
    defaultName: "Car loan",
    structure: "Secured instalment",
    helper: "Use monthly instalment, outstanding amount, and mark overdue if the car may be at risk.",
    rateHint: "Use effective rate if known. Flat-rate loans may not match this estimate exactly.",
    defaultRate: 5,
  },
  housingLoan: {
    label: "Housing loan",
    defaultName: "Housing loan",
    structure: "Secured long-term loan",
    helper: "Use monthly instalment and outstanding balance. Overdue status matters more than snowball size.",
    rateHint: "Use current annual rate if known.",
    defaultRate: 4,
  },
  ptptn: {
    label: "PTPTN",
    defaultName: "PTPTN",
    structure: "Education repayment",
    helper: "Use scheduled monthly repayment, salary deduction amount, or arrears amount if applicable.",
    rateHint: "Usually low-cost. Use 1% if unsure.",
    defaultRate: 1,
  },
  salaryDeduction: {
    label: "Koperasi / salary deduction",
    defaultName: "Koperasi loan",
    structure: "Salary deduction",
    helper: "Use the monthly deduction because it directly reduces take-home cash flow.",
    rateHint: "Use contract rate if known. Otherwise leave 0.",
    defaultRate: 0,
  },
  moneylender: {
    label: "Licensed moneylender / Kredit Komuniti",
    defaultName: "Kredit Komuniti",
    structure: "High-risk repayment",
    helper: "Use outstanding amount and monthly due. If overdue or under pressure, mark the status clearly.",
    rateHint: "Use contract rate if known. This needs human review if collection pressure exists.",
    defaultRate: 12,
  },
  familyFriend: {
    label: "Family / friend debt",
    defaultName: "Family / friend",
    structure: "Relationship commitment",
    helper: "Use promised monthly amount and urgency. Interest may not be the main issue.",
    rateHint: "Usually 0 unless agreed otherwise.",
    defaultRate: 0,
  },
  arrears: {
    label: "Telco / utility / rent arrears",
    defaultName: "Arrears",
    structure: "Urgency-based arrears",
    helper: "Use the overdue amount and monthly catch-up payment. Disconnection or eviction risk matters.",
    rateHint: "Usually 0. Priority comes from urgency, not rate.",
    defaultRate: 0,
  },
  other: {
    label: "Other debt",
    defaultName: "Other debt",
    structure: "Custom repayment",
    helper: "Use amount owed, monthly amount due, and status.",
    rateHint: "Use annual rate if relevant. Otherwise leave 0.",
    defaultRate: 0,
  },
};

const debtStatuses = [
  { value: "current", label: "Current", note: "Payment is up to date." },
  { value: "dueSoon", label: "Due soon", note: "Watch the next due date before adding extra elsewhere." },
  { value: "overdue1", label: "1 month overdue", note: "Clear arrears before chasing long-term optimisation." },
  { value: "overdue2", label: "2+ months overdue", note: "High priority. Speak to lender and prevent escalation." },
  { value: "restructured", label: "Restructured / AKPK", note: "Follow the agreed plan before extra payments." },
  { value: "collection", label: "Collection pressure", note: "Urgent. Get human review before promising new terms." },
  { value: "notSure", label: "Not sure", note: "Check statement, app, CCRIS/eCCRIS, or provider portal." },
];

const rowsEl = document.querySelector("#debt-rows");
const formEl = document.querySelector("#calculator-form");
const addDebtButton = document.querySelector("#add-debt");
const resetButton = document.querySelector("#reset-demo");
const expenseInputs = Array.from(document.querySelectorAll("[data-expense-item]"));
const expenseBreakdownTotalEl = document.querySelector("#expense-breakdown-total");
const useExpenseBreakdownButton = document.querySelector("#use-expense-breakdown");
const availableAfterMinimumsEl = document.querySelector("#available-after-minimums");
const selectedExtraPaymentEl = document.querySelector("#selected-extra-payment");
const selectedBufferLeftEl = document.querySelector("#selected-buffer-left");
const extraPaymentGuidanceEl = document.querySelector("#extra-payment-guidance");
const extraGuidanceEl = document.querySelector(".extra-guidance");
const bufferRecommendationEl = document.querySelector("#buffer-recommendation");
const scoreEl = document.querySelector("#health-score");
const scoreRingEl = document.querySelector(".score-ring");
const statusLineEl = document.querySelector("#status-line");
const statusLabelEl = document.querySelector("#status-label");
const statusCopyEl = document.querySelector("#status-copy");
const totalDebtEl = document.querySelector("#total-debt");
const dtiEl = document.querySelector("#debt-commitment");
const payoffMonthsEl = document.querySelector("#payoff-months");
const interestPaidEl = document.querySelector("#interest-paid");
const diagnosisEl = document.querySelector("#diagnosis-copy");
const priorityListEl = document.querySelector("#priority-list");
const payoffBarsEl = document.querySelector("#payoff-bars");
const breathingRoomEl = document.querySelector("#breathing-room");
const breathingCopyEl = document.querySelector("#breathing-copy");

let debts = demoDebts.map((debt) => ({ ...debt, id: crypto.randomUUID() }));

const formatter = new Intl.NumberFormat("en-MY", {
  style: "currency",
  currency: "MYR",
  maximumFractionDigits: 0,
});

function formatRM(value) {
  return formatter.format(Number.isFinite(value) ? value : 0).replace("MYR", "RM");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function debtTypeConfig(type) {
  return debtTypeConfigs[type] ?? debtTypeConfigs.other;
}

function statusConfig(status) {
  return debtStatuses.find((item) => item.value === status) ?? debtStatuses[0];
}

function renderDebtTypeOptions(selectedType) {
  return Object.entries(debtTypeConfigs)
    .map(([value, config]) => {
      const selected = value === selectedType ? "selected" : "";
      return `<option value="${value}" ${selected}>${escapeHtml(config.label)}</option>`;
    })
    .join("");
}

function renderStatusOptions(selectedStatus) {
  return debtStatuses
    .map((status) => {
      const selected = status.value === selectedStatus ? "selected" : "";
      return `<option value="${status.value}" ${selected}>${escapeHtml(status.label)}</option>`;
    })
    .join("");
}

function formatMonths(months, stalled) {
  if (stalled) return "Over 50 years";
  if (months <= 0) return "0 months";
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (years === 0) return `${remainingMonths} months`;
  if (remainingMonths === 0) return `${years} yr`;
  return `${years} yr ${remainingMonths} mo`;
}

function numberValue(selector) {
  const value = Number(document.querySelector(selector).value);
  return Number.isFinite(value) ? Math.max(value, 0) : 0;
}

function numberFromInput(input) {
  const value = Number(input.value);
  return Number.isFinite(value) ? Math.max(value, 0) : 0;
}

function expenseBreakdownTotal() {
  return expenseInputs.reduce((sum, input) => sum + numberFromInput(input), 0);
}

function updateExpenseBreakdownTotal() {
  expenseBreakdownTotalEl.textContent = formatRM(expenseBreakdownTotal());
}

function strategyValue() {
  return document.querySelector('input[name="strategy"]:checked')?.value ?? "avalanche";
}

function repaymentModeValue() {
  return document.querySelector('input[name="repayment-mode"]:checked')?.value ?? "balanced";
}

function roundedExtra(value) {
  return Math.max(0, Math.floor(value / 10) * 10);
}

function repaymentOptions(availableAfterMinimums) {
  const available = Math.max(0, availableAfterMinimums);
  return {
    conservative: {
      extra: roundedExtra(available * 0.3),
      label: "keeps bigger buffer",
    },
    balanced: {
      extra: roundedExtra(available * 0.5),
      label: "keeps half as buffer",
    },
    aggressive: {
      extra: roundedExtra(available * 0.7),
      label: "fastest, less buffer",
    },
  };
}

function getBufferRecommendation(availableAfterMinimums, income) {
  if (availableAfterMinimums <= 0) {
    return {
      mode: "conservative",
      label: "No extra payment yet",
      copy: "Your minimum commitments already use up the available cash. Keep extra repayment at RM0 until cash flow is positive.",
    };
  }

  const availableRatio = income > 0 ? availableAfterMinimums / income : 0;
  if (availableAfterMinimums < 300 || availableRatio < 0.08) {
    return {
      mode: "conservative",
      label: "Conservative recommended",
      copy: "Your spare cash is thin, so keep a bigger buffer and avoid creating new debt from one unexpected bill.",
    };
  }

  return {
    mode: "balanced",
    label: "Balanced recommended",
    copy: "This gives steady debt progress while still keeping a monthly buffer for normal surprises.",
  };
}

function updateComfortOptions(options, availableAfterMinimums) {
  const available = Math.max(0, availableAfterMinimums);
  [
    ["conservative", "Conservative"],
    ["balanced", "Balanced"],
    ["aggressive", "Aggressive"],
  ].forEach(([key]) => {
    const extra = options[key].extra;
    const buffer = Math.max(0, available - extra);
    document.querySelector(`#${key}-extra`).textContent = `${formatRM(extra)} extra`;
    document.querySelector(`#${key}-buffer`).textContent = `Keeps ${formatRM(buffer)} buffer left`;
  });
}

function updateBufferRecommendation(recommendation) {
  bufferRecommendationEl.textContent = `${recommendation.label}: ${recommendation.copy}`;
  document.querySelectorAll("[data-recommendation]").forEach((badge) => {
    badge.hidden = badge.dataset.recommendation !== recommendation.mode;
  });
}

function renderRows() {
  rowsEl.innerHTML = debts
    .map((debt) => {
      const config = debtTypeConfig(debt.type);
      const status = statusConfig(debt.status);
      const safeName = escapeHtml(debt.name);
      return `
        <tr data-id="${debt.id}">
          <td data-label="Debt type">
            <select class="debt-type-select" data-field="type" aria-label="${safeName} debt type">
              ${renderDebtTypeOptions(debt.type)}
            </select>
            <input class="debt-name" data-field="name" type="text" value="${safeName}" aria-label="Debt name or provider" />
            <div class="debt-status-inline">
              <select class="status-select" data-field="status" aria-label="${safeName} payment status">
                ${renderStatusOptions(debt.status)}
              </select>
              <small class="field-hint">${escapeHtml(status.note)}</small>
            </div>
            <small class="debt-helper">
              <strong>${escapeHtml(config.structure)}</strong>
              ${escapeHtml(config.helper)}
            </small>
          </td>
          <td data-label="Balance">
            <div class="table-input money-field">
              <span>RM</span>
              <input data-field="balance" type="number" min="0" step="50" value="${debt.balance}" aria-label="${safeName} balance" />
            </div>
          </td>
          <td data-label="Rate / fee">
            <div class="rate-field">
              <input data-field="rate" type="number" min="0" step="0.1" value="${debt.rate}" aria-label="${safeName} interest rate or fee" />
              <span>%</span>
            </div>
            <small class="field-hint">${escapeHtml(config.rateHint)}</small>
          </td>
          <td data-label="Monthly pay">
            <div class="table-input money-field">
              <span>RM</span>
              <input data-field="minPayment" type="number" min="0" step="10" value="${debt.minPayment}" aria-label="${safeName} minimum or scheduled monthly payment" />
            </div>
          </td>
          <td data-label="Action">
            <button class="remove-debt" type="button" aria-label="Remove ${safeName}">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function syncDebtFromInput(input) {
  const row = input.closest("tr");
  if (!row) return;

  const debt = debts.find((item) => item.id === row.dataset.id);
  if (!debt) return;

  const field = input.dataset.field;
  if (field === "type") {
    const previousConfig = debtTypeConfig(debt.type);
    const oldDefaultNames = new Set([previousConfig.defaultName, previousConfig.label, "New debt"]);
    debt.type = input.value;
    const nextConfig = debtTypeConfig(debt.type);
    if (!debt.name || oldDefaultNames.has(debt.name)) {
      debt.name = nextConfig.defaultName;
    }
    if (debt.rate === previousConfig.defaultRate) {
      debt.rate = nextConfig.defaultRate;
    }
    return true;
  }

  if (field === "name") {
    debt.name = input.value.trim() || "Unnamed debt";
    return;
  }

  if (field === "status") {
    debt.status = input.value;
    return true;
  }

  const value = Number(input.value);
  debt[field] = Number.isFinite(value) ? Math.max(value, 0) : 0;
  return false;
}

function sortForStrategy(items, strategy) {
  return [...items].sort((a, b) => {
    if (strategy === "snowball") {
      return a.balance - b.balance || b.rate - a.rate;
    }
    return b.rate - a.rate || a.balance - b.balance;
  });
}

function simulatePayoff(items, strategy, extraPayment) {
  const working = items.map((debt) => ({
    ...debt,
    balance: debt.balance,
    monthlyRate: debt.rate / 100 / 12,
  }));
  const monthlyBudget = working.reduce((sum, debt) => sum + debt.minPayment, 0) + extraPayment;
  const initialBalance = working.reduce((sum, debt) => sum + debt.balance, 0);
  const snapshots = [{ month: 0, balance: initialBalance }];
  let totalInterest = 0;
  let totalPaid = 0;
  let month = 0;
  let stalled = false;

  while (month < 600 && working.some((debt) => debt.balance > 0.5)) {
    month += 1;
    let remainingBudget = monthlyBudget;

    for (const debt of working) {
      if (debt.balance <= 0.5) continue;
      const interest = debt.balance * debt.monthlyRate;
      debt.balance += interest;
      totalInterest += interest;
    }

    for (const debt of working) {
      if (debt.balance <= 0.5 || remainingBudget <= 0) continue;
      const payment = Math.min(debt.minPayment, debt.balance, remainingBudget);
      debt.balance -= payment;
      remainingBudget -= payment;
      totalPaid += payment;
    }

    const order = sortForStrategy(
      working.filter((debt) => debt.balance > 0.5),
      strategy,
    );

    for (const debt of order) {
      if (remainingBudget <= 0) break;
      const payment = Math.min(debt.balance, remainingBudget);
      debt.balance -= payment;
      remainingBudget -= payment;
      totalPaid += payment;
    }

    const remainingBalance = working.reduce((sum, debt) => sum + Math.max(debt.balance, 0), 0);
    if (month === 1 || month % 6 === 0 || remainingBalance <= 0.5) {
      snapshots.push({ month, balance: remainingBalance });
    }

    if (month > 3 && remainingBalance >= snapshots[Math.max(0, snapshots.length - 2)].balance) {
      stalled = true;
      break;
    }
  }

  if (month >= 600 && working.some((debt) => debt.balance > 0.5)) {
    stalled = true;
  }

  return {
    months: month,
    totalInterest,
    totalPaid,
    snapshots,
    stalled,
  };
}

function getHealthStatus(score) {
  if (score >= 75) {
    return {
      label: "Manageable",
      copy: "The plan has room to work if spending stays controlled.",
      tone: "good",
    };
  }
  if (score >= 55) {
    return {
      label: "Needs attention",
      copy: "Your commitments are starting to squeeze monthly cash flow.",
      tone: "warning",
    };
  }
  if (score >= 35) {
    return {
      label: "High pressure",
      copy: "The repayment plan needs stricter action or lender discussion.",
      tone: "danger",
    };
  }
  return {
    label: "Critical",
    copy: "Monthly debt pressure is too high for a normal payoff plan.",
    tone: "danger",
  };
}

function calculateScore({ income, expenses, minPayments, totalDebt, highInterestTotal, debtCount }) {
  if (income <= 0 || totalDebt <= 0) return 0;

  const dti = minPayments / income;
  const debtMonths = totalDebt / income;
  const cashLeft = income - expenses - minPayments;
  let score = 100;

  score -= Math.min(38, dti * 76);
  score -= Math.min(24, Math.max(0, debtMonths - 2) * 3.5);
  score -= Math.min(16, (highInterestTotal / totalDebt) * 18);
  score -= cashLeft < 0 ? 18 : cashLeft < income * 0.08 ? 8 : 0;
  score -= debtCount >= 5 ? 5 : 0;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function buildDiagnosis({ dti, breathingRoom, strategy, payoff, highInterestTotal }) {
  if (payoff.stalled) {
    return "Minimum payments may not be enough to reduce the balances meaningfully. Prioritise a lender discussion, expense reduction, or a reviewed restructuring plan before relying on this schedule.";
  }

  if (breathingRoom < 0) {
    return "Your monthly cash flow is negative after commitments. The first move is to stop new debt, reduce fixed costs where possible, and speak to lenders early before arrears become harder to manage.";
  }

  if (dti > 0.45) {
    return "Debt commitments are above a comfortable level. Use this plan as a pressure map: protect essentials, avoid new instalments, and direct every extra ringgit to the priority debt.";
  }

  if (highInterestTotal > 0 && strategy === "avalanche") {
    return "The avalanche route is suitable because high-interest balances are present. Clearing those first should reduce total interest faster than spreading extra payments evenly.";
  }

  if (strategy === "snowball") {
    return "The snowball route gives faster visible wins by clearing smaller debts first. It may cost more interest, but it can help if motivation and payment consistency are the bigger risk.";
  }

  return "This looks workable as long as the extra payment is consistent and no new instalments are added. Review the plan monthly against actual balances, not estimates.";
}

function updatePriorityList(activeDebts, strategy) {
  const ordered = sortForStrategy(activeDebts, strategy);
  priorityListEl.innerHTML = ordered
    .map((debt) => {
      const config = debtTypeConfig(debt.type);
      const status = statusConfig(debt.status);
      const rateText = debt.rate > 0 ? `${debt.rate}% rate` : config.structure;
      return `
        <li>
          ${escapeHtml(debt.name)}
          <span>${escapeHtml(config.label)} · ${formatRM(debt.balance)} balance · ${escapeHtml(rateText)} · ${formatRM(debt.minPayment)} monthly · ${escapeHtml(status.label)}</span>
          <small>${escapeHtml(status.note)}</small>
        </li>
      `;
    })
    .join("");

  if (!ordered.length) {
    priorityListEl.innerHTML = "<li>No active debts entered.<span>Add at least one debt to build the route.</span></li>";
  }
}

function updateBars(snapshots, initialBalance) {
  const selected = snapshots.slice(0, 8);
  payoffBarsEl.innerHTML = selected
    .map((item) => {
      const width = initialBalance > 0 ? Math.max(2, (item.balance / initialBalance) * 100) : 0;
      return `
        <div class="bar-row">
          <span>Month ${item.month}</span>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${width}%"></div>
          </div>
          <strong>${formatRM(item.balance)}</strong>
        </div>
      `;
    })
    .join("");
}

function updateCalculator() {
  const income = numberValue("#monthly-income");
  const expenses = numberValue("#monthly-expenses");
  const strategy = strategyValue();
  const repaymentMode = repaymentModeValue();
  const activeDebts = debts.filter((debt) => debt.balance > 0 && debt.minPayment > 0);
  const totalDebt = activeDebts.reduce((sum, debt) => sum + debt.balance, 0);
  const minPayments = activeDebts.reduce((sum, debt) => sum + debt.minPayment, 0);
  const highInterestTotal = activeDebts
    .filter((debt) => debt.rate >= 12)
    .reduce((sum, debt) => sum + debt.balance, 0);
  const dti = income > 0 ? minPayments / income : 0;
  const availableAfterMinimums = income - expenses - minPayments;
  const options = repaymentOptions(availableAfterMinimums);
  updateComfortOptions(options, availableAfterMinimums);
  updateBufferRecommendation(getBufferRecommendation(availableAfterMinimums, income));
  let extraPayment = numberValue("#extra-payment");
  if (repaymentMode !== "custom") {
    extraPayment = options[repaymentMode].extra;
    document.querySelector("#extra-payment").value = extraPayment;
  }
  const breathingRoom = availableAfterMinimums - extraPayment;
  const payoff = simulatePayoff(activeDebts, strategy, extraPayment);
  const score = calculateScore({
    income,
    expenses,
    minPayments,
    totalDebt,
    highInterestTotal,
    debtCount: activeDebts.length,
  });
  const status = getHealthStatus(score);

  scoreEl.textContent = score;
  scoreRingEl.style.setProperty("--score", score);
  statusLineEl.classList.toggle("warning", status.tone === "warning");
  statusLineEl.classList.toggle("danger", status.tone === "danger");
  statusLabelEl.textContent = status.label;
  statusCopyEl.textContent = status.copy;
  totalDebtEl.textContent = formatRM(totalDebt);
  dtiEl.textContent = income > 0 ? `${Math.round(dti * 100)}%` : "0%";
  payoffMonthsEl.textContent = formatMonths(payoff.months, payoff.stalled);
  interestPaidEl.textContent = payoff.stalled ? "Review needed" : formatRM(payoff.totalInterest);
  availableAfterMinimumsEl.textContent = formatRM(availableAfterMinimums);
  selectedExtraPaymentEl.textContent = formatRM(extraPayment);
  selectedBufferLeftEl.textContent = formatRM(breathingRoom);
  extraGuidanceEl.classList.toggle("warning", availableAfterMinimums >= 0 && breathingRoom < 0);
  extraGuidanceEl.classList.toggle("danger", availableAfterMinimums < 0);
  if (availableAfterMinimums < 0) {
    extraPaymentGuidanceEl.textContent =
      "Your essentials and minimum debt payments are already higher than your take-home income. Do not add extra repayment yet.";
  } else if (extraPayment > availableAfterMinimums) {
    extraPaymentGuidanceEl.textContent =
      "Your extra payment is higher than the cash available after essentials and minimum debt payments. Reduce it or review your expenses.";
  } else if (repaymentMode === "custom" && extraPayment === 0) {
    extraPaymentGuidanceEl.textContent =
      "Custom is set to RM0. That is acceptable if you are unsure or need to protect your monthly buffer.";
  } else if (repaymentMode === "aggressive") {
    extraPaymentGuidanceEl.textContent =
      "Aggressive repayment clears debt faster but leaves less monthly buffer. Use this only if income is stable and no urgent bills are coming.";
  } else if (repaymentMode === "conservative") {
    extraPaymentGuidanceEl.textContent =
      "Conservative repayment keeps a bigger monthly buffer and lowers the chance of needing new debt.";
  } else {
    extraPaymentGuidanceEl.textContent =
      "Balanced repayment uses about half of your available cash for debt and keeps the rest as breathing room.";
  }
  diagnosisEl.textContent = buildDiagnosis({
    dti,
    breathingRoom,
    strategy,
    payoff,
    highInterestTotal,
  });

  breathingRoomEl.textContent = formatRM(breathingRoom);
  breathingCopyEl.textContent =
    breathingRoom >= 0
      ? "Estimated cash left after essential expenses, minimum debt payments, and planned extra payment."
      : "This plan is not affordable yet. Reduce the extra payment, cut fixed costs, or seek repayment support.";

  updateExpenseBreakdownTotal();
  updatePriorityList(activeDebts, strategy);
  updateBars(payoff.snapshots, totalDebt);
}

function addDebt() {
  debts.push({
    id: crypto.randomUUID(),
    type: "other",
    name: "New debt",
    balance: 0,
    rate: 0,
    minPayment: 0,
    status: "notSure",
  });
  renderRows();
  updateCalculator();
}

function handleFormFieldChange(event) {
  if (event.target.id === "extra-payment") {
    document.querySelector('input[name="repayment-mode"][value="custom"]').checked = true;
  }
  if (event.target.matches("[data-field]")) {
    const shouldRenderRows = syncDebtFromInput(event.target);
    if (shouldRenderRows) renderRows();
  }
  updateCalculator();
}

formEl.addEventListener("input", handleFormFieldChange);
formEl.addEventListener("change", handleFormFieldChange);

rowsEl.addEventListener("click", (event) => {
  const button = event.target.closest(".remove-debt");
  if (!button) return;

  const row = button.closest("tr");
  debts = debts.filter((debt) => debt.id !== row.dataset.id);
  renderRows();
  updateCalculator();
});

addDebtButton.addEventListener("click", addDebt);

useExpenseBreakdownButton.addEventListener("click", () => {
  document.querySelector("#monthly-expenses").value = expenseBreakdownTotal();
  updateCalculator();
});

resetButton.addEventListener("click", () => {
  debts = demoDebts.map((debt) => ({ ...debt, id: crypto.randomUUID() }));
  document.querySelector("#monthly-income").value = 4200;
  document.querySelector("#monthly-expenses").value = 2100;
  document.querySelector("#extra-payment").value = 0;
  [700, 650, 300, 120, 100, 160, 0, 70].forEach((value, index) => {
    if (expenseInputs[index]) expenseInputs[index].value = value;
  });
  document.querySelector('input[name="strategy"][value="avalanche"]').checked = true;
  document.querySelector('input[name="repayment-mode"][value="balanced"]').checked = true;
  renderRows();
  updateCalculator();
});

renderRows();
updateCalculator();
