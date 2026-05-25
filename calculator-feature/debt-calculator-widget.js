(function calculatorWidget(global) {
  "use strict";

  const calculator = global.MIDDebtCalculator;
  if (!calculator) {
    throw new Error("MIDDebtCalculator core is required before debt-calculator-widget.js");
  }

  function money(value) {
    return new Intl.NumberFormat("en-MY", {
      style: "currency",
      currency: "MYR",
      maximumFractionDigits: 0,
    })
      .format(Number.isFinite(value) ? value : 0)
      .replace("MYR", "RM");
  }

  function percentage(value) {
    return `${Math.round((Number.isFinite(value) ? value : 0) * 100)}%`;
  }

  function payoffTime(months, stalled) {
    if (stalled) return "Review needed";
    if (!months) return "0 months";

    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;

    if (years === 0) return `${remainingMonths} months`;
    if (remainingMonths === 0) return `${years} yr`;
    return `${years} yr ${remainingMonths} mo`;
  }

  function numberValue(root, selector) {
    const element = root.querySelector(selector);
    const value = Number(element && element.value);
    return Number.isFinite(value) ? Math.max(value, 0) : 0;
  }

  function numberFromInput(input) {
    const value = Number(input.value);
    return Number.isFinite(value) ? Math.max(value, 0) : 0;
  }

  function expenseBreakdownTotal(root) {
    return Array.from(root.querySelectorAll("[data-expense-item]")).reduce(
      (sum, input) => sum + numberFromInput(input),
      0,
    );
  }

  function textValue(root, selector, fallback) {
    const element = root.querySelector(selector);
    return element && element.value ? element.value.trim() : fallback;
  }

  function getStrategy(root) {
    return root.querySelector('[data-field="strategy"]:checked')?.value || "avalanche";
  }

  function getRepaymentMode(root) {
    return root.querySelector('[data-field="repaymentMode"]:checked')?.value || "balanced";
  }

  function getDebts(root) {
    return Array.from(root.querySelectorAll("[data-debt-row]")).map((row, index) => ({
      id: row.dataset.debtId || `debt-${index + 1}`,
      name: textValue(row, '[data-field="debtName"]', `Debt ${index + 1}`),
      balance: numberValue(row, '[data-field="balance"]'),
      annualRate: numberValue(row, '[data-field="annualRate"]'),
      minimumPayment: numberValue(row, '[data-field="minimumPayment"]'),
    }));
  }

  function setOutput(root, key, value) {
    root.querySelectorAll(`[data-output="${key}"]`).forEach((element) => {
      element.textContent = value;
    });
  }

  function renderPriorityList(root, priorityOrder) {
    const list = root.querySelector('[data-output="priorityList"]');
    if (!list) return;

    list.innerHTML = "";

    if (!priorityOrder.length) {
      const item = document.createElement("li");
      item.textContent = "Add at least one debt to build the route.";
      list.appendChild(item);
      return;
    }

    priorityOrder.forEach((debt) => {
      const item = document.createElement("li");
      item.textContent = `${debt.name} - ${money(debt.balance)} balance, ${debt.annualRate}% rate, ${money(debt.minimumPayment)} minimum`;
      list.appendChild(item);
    });
  }

  function renderSnapshots(root, result) {
    const list = root.querySelector('[data-output="balancePath"]');
    if (!list) return;

    list.innerHTML = "";

    result.payoff.snapshots.forEach((snapshot) => {
      const item = document.createElement("li");
      item.textContent = `Month ${snapshot.month}: ${money(snapshot.balance)}`;
      list.appendChild(item);
    });
  }

  function renderRepaymentOptions(root, options) {
    ["conservative", "balanced", "aggressive"].forEach((key) => {
      setOutput(root, `${key}Extra`, money(options[key].extraPayment));
      setOutput(root, `${key}Buffer`, money(options[key].buffer));
    });
  }

  function render(root) {
    const baseInput = {
      monthlyIncome: numberValue(root, '[data-field="monthlyIncome"]'),
      essentialExpenses: numberValue(root, '[data-field="essentialExpenses"]'),
      extraDebtPayment: numberValue(root, '[data-field="extraDebtPayment"]'),
      strategy: getStrategy(root),
      debts: getDebts(root),
    };

    const baseResult = calculator.calculateDebtPlan(baseInput);
    const repaymentMode = getRepaymentMode(root);
    let extraDebtPayment = baseInput.extraDebtPayment;

    if (repaymentMode !== "custom") {
      extraDebtPayment = baseResult.metrics.repaymentOptions[repaymentMode].extraPayment;
      const field = root.querySelector('[data-field="extraDebtPayment"]');
      if (field) field.value = extraDebtPayment;
    }

    const result = calculator.calculateDebtPlan({
      ...baseInput,
      extraDebtPayment,
    });

    setOutput(root, "totalDebt", money(result.metrics.totalDebt));
    setOutput(root, "minimumPaymentTotal", money(result.metrics.minimumPaymentTotal));
    setOutput(root, "debtCommitmentRatio", percentage(result.metrics.debtCommitmentRatio));
    setOutput(root, "expenseBreakdownTotal", money(expenseBreakdownTotal(root)));
    setOutput(root, "availableAfterMinimums", money(result.metrics.availableAfterMinimums));
    setOutput(root, "suggestedExtraPayment", money(result.metrics.suggestedExtraPayment));
    setOutput(root, "payoffTime", payoffTime(result.metrics.payoffMonths, result.payoff.stalled));
    setOutput(root, "interestPaid", result.payoff.stalled ? "Review needed" : money(result.metrics.interestPaid));
    setOutput(root, "healthScore", String(result.metrics.healthScore));
    setOutput(root, "statusLabel", result.status.label);
    setOutput(root, "statusCopy", result.status.copy);
    setOutput(root, "diagnosis", result.diagnosis);

    root.dataset.status = result.status.level;
    renderRepaymentOptions(root, result.metrics.repaymentOptions);
    renderPriorityList(root, result.priorityOrder);
    renderSnapshots(root, result);
  }

  function createDebtRow(root) {
    const template = root.querySelector("[data-debt-row-template]");
    const list = root.querySelector("[data-debt-list]");
    if (!template || !list) return;

    const fragment = template.content.cloneNode(true);
    const row = fragment.querySelector("[data-debt-row]");
    row.dataset.debtId = crypto.randomUUID();
    list.appendChild(fragment);
  }

  function bind(root) {
    root.addEventListener("input", (event) => {
      if (event.target.matches('[data-field="extraDebtPayment"]')) {
        const custom = root.querySelector('[data-field="repaymentMode"][value="custom"]');
        if (custom) custom.checked = true;
      }
      render(root);
    });
    root.addEventListener("change", () => render(root));
    root.addEventListener("click", (event) => {
      const addButton = event.target.closest("[data-action='addDebt']");
      const removeButton = event.target.closest("[data-action='removeDebt']");

      if (addButton) {
        createDebtRow(root);
        render(root);
      }

      if (event.target.closest("[data-action='useExpenseBreakdown']")) {
        const field = root.querySelector('[data-field="essentialExpenses"]');
        if (field) field.value = expenseBreakdownTotal(root);
        render(root);
      }

      if (event.target.closest("[data-action='useSuggestedExtra']")) {
        const balanced = root.querySelector('[data-field="repaymentMode"][value="balanced"]');
        if (balanced) balanced.checked = true;
        const result = calculator.calculateDebtPlan({
          monthlyIncome: numberValue(root, '[data-field="monthlyIncome"]'),
          essentialExpenses: numberValue(root, '[data-field="essentialExpenses"]'),
          extraDebtPayment: numberValue(root, '[data-field="extraDebtPayment"]'),
          strategy: getStrategy(root),
          debts: getDebts(root),
        });
        const field = root.querySelector('[data-field="extraDebtPayment"]');
        if (field) field.value = result.metrics.suggestedExtraPayment;
        render(root);
      }

      if (removeButton) {
        removeButton.closest("[data-debt-row]")?.remove();
        render(root);
      }
    });

    render(root);
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-debt-calculator]").forEach(bind);
  });
})(window);
