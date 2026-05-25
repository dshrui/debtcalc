const demoDebts = [
  { name: "Credit card", balance: 8200, rate: 18, minPayment: 410 },
  { name: "Personal loan", balance: 14500, rate: 9.8, minPayment: 530 },
  { name: "BNPL / PayLater", balance: 1650, rate: 0, minPayment: 210 },
  { name: "PTPTN", balance: 7800, rate: 1, minPayment: 150 },
];

const rowsEl = document.querySelector("#debt-rows");
const formEl = document.querySelector("#calculator-form");
const addDebtButton = document.querySelector("#add-debt");
const resetButton = document.querySelector("#reset-demo");
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

function strategyValue() {
  return document.querySelector('input[name="strategy"]:checked')?.value ?? "avalanche";
}

function renderRows() {
  rowsEl.innerHTML = debts
    .map(
      (debt) => `
        <tr data-id="${debt.id}">
          <td data-label="Debt">
            <input class="debt-name" data-field="name" type="text" value="${debt.name}" aria-label="Debt name" />
          </td>
          <td data-label="Balance">
            <div class="table-input money-field">
              <span>RM</span>
              <input data-field="balance" type="number" min="0" step="50" value="${debt.balance}" aria-label="${debt.name} balance" />
            </div>
          </td>
          <td data-label="Rate">
            <div class="rate-field">
              <input data-field="rate" type="number" min="0" step="0.1" value="${debt.rate}" aria-label="${debt.name} interest rate" />
              <span>%</span>
            </div>
          </td>
          <td data-label="Minimum pay">
            <div class="table-input money-field">
              <span>RM</span>
              <input data-field="minPayment" type="number" min="0" step="10" value="${debt.minPayment}" aria-label="${debt.name} minimum payment" />
            </div>
          </td>
          <td data-label="Action">
            <button class="remove-debt" type="button" aria-label="Remove ${debt.name}">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </td>
        </tr>
      `,
    )
    .join("");
}

function syncDebtFromInput(input) {
  const row = input.closest("tr");
  if (!row) return;

  const debt = debts.find((item) => item.id === row.dataset.id);
  if (!debt) return;

  const field = input.dataset.field;
  if (field === "name") {
    debt.name = input.value.trim() || "Unnamed debt";
    return;
  }

  const value = Number(input.value);
  debt[field] = Number.isFinite(value) ? Math.max(value, 0) : 0;
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
    .map(
      (debt) => `
        <li>
          ${debt.name}
          <span>${formatRM(debt.balance)} balance · ${debt.rate}% rate · ${formatRM(debt.minPayment)} minimum</span>
        </li>
      `,
    )
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
  const extraPayment = numberValue("#extra-payment");
  const strategy = strategyValue();
  const activeDebts = debts.filter((debt) => debt.balance > 0 && debt.minPayment > 0);
  const totalDebt = activeDebts.reduce((sum, debt) => sum + debt.balance, 0);
  const minPayments = activeDebts.reduce((sum, debt) => sum + debt.minPayment, 0);
  const highInterestTotal = activeDebts
    .filter((debt) => debt.rate >= 12)
    .reduce((sum, debt) => sum + debt.balance, 0);
  const dti = income > 0 ? minPayments / income : 0;
  const breathingRoom = income - expenses - minPayments - extraPayment;
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
      ? "Estimated cash left after living costs, minimum debt payments, and planned extra payment."
      : "This plan is not affordable yet. Reduce the extra payment, cut fixed costs, or seek repayment support.";

  updatePriorityList(activeDebts, strategy);
  updateBars(payoff.snapshots, totalDebt);
}

function addDebt() {
  debts.push({
    id: crypto.randomUUID(),
    name: "New debt",
    balance: 0,
    rate: 0,
    minPayment: 0,
  });
  renderRows();
  updateCalculator();
}

formEl.addEventListener("input", (event) => {
  if (event.target.matches("[data-field]")) {
    syncDebtFromInput(event.target);
  }
  updateCalculator();
});

rowsEl.addEventListener("click", (event) => {
  const button = event.target.closest(".remove-debt");
  if (!button) return;

  const row = button.closest("tr");
  debts = debts.filter((debt) => debt.id !== row.dataset.id);
  renderRows();
  updateCalculator();
});

addDebtButton.addEventListener("click", addDebt);

resetButton.addEventListener("click", () => {
  debts = demoDebts.map((debt) => ({ ...debt, id: crypto.randomUUID() }));
  document.querySelector("#monthly-income").value = 4200;
  document.querySelector("#monthly-expenses").value = 2100;
  document.querySelector("#extra-payment").value = 350;
  document.querySelector('input[name="strategy"][value="avalanche"]').checked = true;
  renderRows();
  updateCalculator();
});

renderRows();
updateCalculator();
