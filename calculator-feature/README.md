# Malaysian Debt Health Calculator - Feature Skeleton

This folder is the handoff version of the debt calculator feature.

It is intentionally plain. The UI/UX designer can change the layout, CSS, copy, and visual hierarchy, but should keep the `data-*` attributes because the JavaScript uses them to read inputs and update outputs.

Read `ARCHITECTURE.md` first. It explains the calculator's product logic, user flow, input definitions, outputs, edge cases, and handoff contract.

## Files

- `ARCHITECTURE.md` - product and calculation architecture.
- `index.html` - plain integration demo with all required hooks.
- `debt-calculator-core.js` - pure calculation logic. This is the important business logic file.
- `debt-calculator-widget.js` - browser binding layer. Reads the form and updates the page.
- `debt-calculator-skeleton.css` - minimal styling only for review.

## Recommended Website Integration

Copy these two JavaScript files into the website:

```html
<script src="/path/to/debt-calculator-core.js"></script>
<script src="/path/to/debt-calculator-widget.js" defer></script>
```

Then place the calculator markup where the feature should appear.

The designer can fully redesign the UI as long as these hooks remain:

```html
data-debt-calculator
data-field="monthlyIncome"
data-field="essentialExpenses"
data-field="extraDebtPayment"
data-field="strategy"
data-debt-list
data-debt-row
data-output="totalDebt"
data-output="debtCommitmentRatio"
data-output="payoffTime"
data-output="interestPaid"
data-output="healthScore"
data-output="statusLabel"
data-output="diagnosis"
data-output="availableAfterMinimums"
data-output="suggestedExtraPayment"
data-output="priorityList"
```

## Meaning Of The Main Fields

Monthly take-home income:
The user's monthly income after EPF, SOCSO, PCB, and other payroll deductions.

Essential monthly expenses:
Non-debt monthly expenses only. Examples: rent, food, petrol, toll, utilities, phone, insurance, family support, groceries, and basic personal spending.

Extra amount for debt payoff:
The amount the user can pay on top of all minimum debt payments. If the user is unsure, the calculator shows a suggested extra amount based on available monthly cash.

Debt minimum payment:
The required monthly payment for each debt. This should not be repeated inside essential monthly expenses.

## Basic Data Shape

```js
const result = window.MIDDebtCalculator.calculateDebtPlan({
  monthlyIncome: 4500,
  essentialExpenses: 1500,
  extraDebtPayment: 500,
  strategy: "avalanche",
  debts: [
    {
      name: "Credit card",
      balance: 8200,
      annualRate: 18,
      minimumPayment: 410
    }
  ]
});
```

## Output Notes

The calculator is an estimate, not financial advice. Keep final website copy careful:

- avoid guaranteeing savings;
- avoid telling users to restructure without review;
- encourage users to check actual statements;
- add AKPK or lender-support wording only after confirming the intended editorial/legal position.
