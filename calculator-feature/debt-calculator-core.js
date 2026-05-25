(function calculatorCore(global) {
  "use strict";

  const MAX_MONTHS = 600;

  function toMoneyNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(number, 0) : 0;
  }

  function normaliseDebt(debt, index) {
    return {
      id: debt.id || `debt-${index + 1}`,
      name: String(debt.name || `Debt ${index + 1}`).trim(),
      balance: toMoneyNumber(debt.balance),
      annualRate: toMoneyNumber(debt.annualRate),
      minimumPayment: toMoneyNumber(debt.minimumPayment),
    };
  }

  function getActiveDebts(debts) {
    return (debts || [])
      .map(normaliseDebt)
      .filter((debt) => debt.balance > 0 && debt.minimumPayment > 0);
  }

  function sortDebts(debts, strategy) {
    return [...debts].sort((a, b) => {
      if (strategy === "snowball") {
        return a.balance - b.balance || b.annualRate - a.annualRate;
      }

      return b.annualRate - a.annualRate || a.balance - b.balance;
    });
  }

  function simulatePayoff(debts, strategy, extraDebtPayment) {
    const workingDebts = debts.map((debt) => ({
      ...debt,
      monthlyRate: debt.annualRate / 100 / 12,
    }));
    const minimumPaymentTotal = workingDebts.reduce(
      (sum, debt) => sum + debt.minimumPayment,
      0,
    );
    const monthlyBudget = minimumPaymentTotal + extraDebtPayment;
    const startingBalance = workingDebts.reduce((sum, debt) => sum + debt.balance, 0);
    const snapshots = [{ month: 0, balance: startingBalance }];

    let month = 0;
    let interestPaid = 0;
    let stalled = false;

    while (month < MAX_MONTHS && workingDebts.some((debt) => debt.balance > 0.5)) {
      month += 1;
      let remainingBudget = monthlyBudget;

      for (const debt of workingDebts) {
        if (debt.balance <= 0.5) continue;
        const interest = debt.balance * debt.monthlyRate;
        debt.balance += interest;
        interestPaid += interest;
      }

      for (const debt of workingDebts) {
        if (debt.balance <= 0.5 || remainingBudget <= 0) continue;
        const payment = Math.min(debt.minimumPayment, debt.balance, remainingBudget);
        debt.balance -= payment;
        remainingBudget -= payment;
      }

      const priorityDebts = sortDebts(
        workingDebts.filter((debt) => debt.balance > 0.5),
        strategy,
      );

      for (const debt of priorityDebts) {
        if (remainingBudget <= 0) break;
        const payment = Math.min(debt.balance, remainingBudget);
        debt.balance -= payment;
        remainingBudget -= payment;
      }

      const remainingBalance = workingDebts.reduce(
        (sum, debt) => sum + Math.max(debt.balance, 0),
        0,
      );

      if (month === 1 || month % 6 === 0 || remainingBalance <= 0.5) {
        snapshots.push({ month, balance: remainingBalance });
      }

      const previousSnapshot = snapshots[Math.max(0, snapshots.length - 2)];
      if (month > 3 && previousSnapshot && remainingBalance >= previousSnapshot.balance) {
        stalled = true;
        break;
      }
    }

    if (month >= MAX_MONTHS && workingDebts.some((debt) => debt.balance > 0.5)) {
      stalled = true;
    }

    return {
      months: month,
      interestPaid,
      snapshots,
      stalled,
    };
  }

  function calculateHealthScore({
    monthlyIncome,
    essentialExpenses,
    minimumPaymentTotal,
    totalDebt,
    highInterestDebtTotal,
    debtCount,
  }) {
    if (monthlyIncome <= 0 || totalDebt <= 0) return 0;

    const debtCommitmentRatio = minimumPaymentTotal / monthlyIncome;
    const totalDebtToIncomeMonths = totalDebt / monthlyIncome;
    const cashAfterMinimums = monthlyIncome - essentialExpenses - minimumPaymentTotal;

    let score = 100;
    score -= Math.min(38, debtCommitmentRatio * 76);
    score -= Math.min(24, Math.max(0, totalDebtToIncomeMonths - 2) * 3.5);
    score -= Math.min(16, (highInterestDebtTotal / totalDebt) * 18);
    score -= cashAfterMinimums < 0 ? 18 : cashAfterMinimums < monthlyIncome * 0.08 ? 8 : 0;
    score -= debtCount >= 5 ? 5 : 0;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  function getStatus(score) {
    if (score >= 75) {
      return {
        level: "manageable",
        label: "Manageable",
        copy: "The plan has room to work if spending stays controlled.",
      };
    }

    if (score >= 55) {
      return {
        level: "watch",
        label: "Needs attention",
        copy: "The debt load is starting to squeeze monthly cash flow.",
      };
    }

    if (score >= 35) {
      return {
        level: "high-pressure",
        label: "High pressure",
        copy: "The repayment plan needs stricter action or lender discussion.",
      };
    }

    return {
      level: "critical",
      label: "Critical",
      copy: "Monthly debt pressure is too high for a normal payoff plan.",
    };
  }

  function roundedExtra(value) {
    return Math.max(0, Math.floor(value / 10) * 10);
  }

  function getRepaymentOptions(availableAfterMinimums) {
    const available = Math.max(0, availableAfterMinimums);
    const conservative = roundedExtra(available * 0.3);
    const balanced = roundedExtra(available * 0.5);
    const aggressive = roundedExtra(available * 0.7);

    return {
      conservative: {
        extraPayment: conservative,
        buffer: available - conservative,
      },
      balanced: {
        extraPayment: balanced,
        buffer: available - balanced,
      },
      aggressive: {
        extraPayment: aggressive,
        buffer: available - aggressive,
      },
    };
  }

  function buildDiagnosis({
    strategy,
    debtCommitmentRatio,
    availableAfterMinimums,
    payoff,
    highInterestDebtTotal,
  }) {
    if (payoff.stalled) {
      return "Minimum payments may not reduce the balances meaningfully. Review the plan, reduce expenses, increase income, or speak to lenders early.";
    }

    if (availableAfterMinimums < 0) {
      return "Cash flow is negative after essential expenses and minimum debt payments. Reduce fixed costs or seek repayment support before relying on extra payments.";
    }

    if (debtCommitmentRatio > 0.45) {
      return "Debt commitments are above a comfortable level. Avoid new instalments and direct any safe surplus to the priority debt.";
    }

    if (strategy === "snowball") {
      return "The snowball route gives quicker visible wins by clearing smaller balances first. It may cost more interest than avalanche.";
    }

    if (highInterestDebtTotal > 0) {
      return "The avalanche route is suitable because high-interest balances are present. Clearing those first usually reduces total interest faster.";
    }

    return "This plan is workable if the extra payment is consistent and no new debt is added.";
  }

  function calculateDebtPlan(input) {
    const monthlyIncome = toMoneyNumber(input.monthlyIncome);
    const essentialExpenses = toMoneyNumber(input.essentialExpenses);
    const extraDebtPayment = toMoneyNumber(input.extraDebtPayment);
    const strategy = input.strategy === "snowball" ? "snowball" : "avalanche";
    const debts = getActiveDebts(input.debts);
    const priorityOrder = sortDebts(debts, strategy);
    const totalDebt = debts.reduce((sum, debt) => sum + debt.balance, 0);
    const minimumPaymentTotal = debts.reduce((sum, debt) => sum + debt.minimumPayment, 0);
    const highInterestDebtTotal = debts
      .filter((debt) => debt.annualRate >= 12)
      .reduce((sum, debt) => sum + debt.balance, 0);
    const availableAfterMinimums = monthlyIncome - essentialExpenses - minimumPaymentTotal;
    const repaymentOptions = getRepaymentOptions(availableAfterMinimums);
    const suggestedExtraPayment = repaymentOptions.balanced.extraPayment;
    const payoff = simulatePayoff(debts, strategy, extraDebtPayment);
    const debtCommitmentRatio = monthlyIncome > 0 ? minimumPaymentTotal / monthlyIncome : 0;
    const healthScore = calculateHealthScore({
      monthlyIncome,
      essentialExpenses,
      minimumPaymentTotal,
      totalDebt,
      highInterestDebtTotal,
      debtCount: debts.length,
    });
    const status = getStatus(healthScore);

    return {
      inputs: {
        monthlyIncome,
        essentialExpenses,
        extraDebtPayment,
        strategy,
      },
      debts,
      priorityOrder,
      metrics: {
        totalDebt,
        minimumPaymentTotal,
        debtCommitmentRatio,
        availableAfterMinimums,
        suggestedExtraPayment,
        repaymentOptions,
        payoffMonths: payoff.months,
        interestPaid: payoff.interestPaid,
        healthScore,
      },
      payoff,
      status,
      diagnosis: buildDiagnosis({
        strategy,
        debtCommitmentRatio,
        availableAfterMinimums,
        payoff,
        highInterestDebtTotal,
      }),
    };
  }

  const api = {
    calculateDebtPlan,
    getRepaymentOptions,
    sortDebts,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  global.MIDDebtCalculator = api;
})(typeof window !== "undefined" ? window : globalThis);
