# Debt Calculator Architecture

## Objective

Build a debt calculator that helps Malaysians understand:

1. how heavy their current debt load is;
2. how much cash is available after essential expenses and minimum debt payments;
3. which debt to prioritise first;
4. how long repayment may take;
5. what practical next action they should consider.

The calculator should feel practical and non-judgmental. It should not behave like a generic loan calculator or pretend to give formal financial advice.

## Design Boundary

This document defines the calculator structure and logic only.

It does not define:

- final layout;
- colours;
- typography;
- illustration style;
- card styling;
- animations;
- final visual hierarchy.

The UI/UX partner can design those separately. The only implementation constraint is that the final UI must preserve the data fields and output hooks required by the calculator logic.

## Target User

Primary user:

Malaysian working adults who are carrying several overlapping commitments such as credit card debt, personal loans, BNPL, car loans, PTPTN, family support, or informal debt.

Likely user state:

- not fully sure how bad the situation is;
- confused about what to pay first;
- may underestimate fixed expenses;
- may be scared to check statements;
- needs clarity without shame.

## Core User Flow

### Step 1 - Monthly Snapshot

The user enters their monthly income and non-debt expenses.

Required fields:

- Monthly take-home income
- Essential monthly expenses
- Extra amount for debt payoff

Recommended helper explanation:

Monthly take-home income:
Income after EPF, SOCSO, PCB, and other payroll deductions.

Essential monthly expenses:
Non-debt expenses only. Include rent, food, petrol, toll, utilities, phone, insurance, groceries, family support, and basic personal spending. Do not include debt payments that are already entered in the debt list.

Extra amount for debt payoff:
The amount the user can pay on top of all required minimum debt payments.

### Step 2 - Debt Inventory

The user enters each active debt.

Required fields per debt:

- Debt name
- Outstanding balance
- Annual interest/profit rate
- Minimum monthly payment

Recommended optional fields for future versions:

- Debt category
- Payment due date
- Account status
- Secured or unsecured debt
- Whether payment is overdue
- Whether the user is still using this credit line

Recommended debt categories:

- Credit card
- Personal loan
- Car loan
- PTPTN
- BNPL / PayLater
- Family or friend debt
- Business debt
- Moneylender
- Other

### Step 3 - Payoff Strategy

The user chooses a repayment strategy.

Supported strategies:

- Avalanche: prioritise highest interest/profit rate first.
- Snowball: prioritise smallest balance first.

Default strategy:

Avalanche, because it is usually more financially efficient when high-interest debts are present.

### Step 4 - Results

The calculator produces:

- Total debt
- Total minimum monthly debt payment
- Debt commitment ratio
- Available cash after essential expenses and minimum payments
- Suggested extra debt payment
- Debt health score
- Status label
- Payoff time estimate
- Interest estimate
- Priority payment order
- Balance path snapshots
- Diagnosis

### Step 5 - Action Guidance

The calculator should show a short action section based on the result.

Examples:

- If cash flow is positive: suggest setting a fixed extra payment and tracking balances monthly.
- If cash flow is tight: suggest reducing fixed costs or lowering extra payment.
- If cash flow is negative: suggest speaking to lenders early and not relying on extra payments.
- If high-interest debt exists: explain why high-interest balances should be prioritised.
- If minimum payments do not reduce balances: flag that the plan needs review.

## Data Model

### Input Shape

```js
{
  monthlyIncome: 4500,
  essentialExpenses: 1500,
  extraDebtPayment: 500,
  strategy: "avalanche",
  debts: [
    {
      id: "credit-card",
      name: "Credit card",
      balance: 8200,
      annualRate: 18,
      minimumPayment: 410
    }
  ]
}
```

### Output Shape

```js
{
  inputs: {},
  debts: [],
  priorityOrder: [],
  metrics: {
    totalDebt: 22700,
    minimumPaymentTotal: 940,
    debtCommitmentRatio: 0.21,
    availableAfterMinimums: 2060,
    suggestedExtraPayment: 1442,
    payoffMonths: 18,
    interestPaid: 1620,
    healthScore: 67
  },
  payoff: {
    months: 18,
    interestPaid: 1620,
    stalled: false,
    snapshots: [
      { month: 0, balance: 22700 },
      { month: 1, balance: 21300 }
    ]
  },
  status: {
    level: "watch",
    label: "Needs attention",
    copy: "The debt load is starting to squeeze monthly cash flow."
  },
  diagnosis: "The avalanche route is suitable because high-interest balances are present."
}
```

## Calculation Logic

### Total Debt

Sum of all active debt balances.

Only include debts where:

- balance is more than 0;
- minimum monthly payment is more than 0.

### Total Minimum Debt Payment

Sum of all minimum monthly payments.

### Debt Commitment Ratio

```txt
total minimum debt payments / monthly take-home income
```

This measures how much of income is already committed to debt before extra payments.

### Available After Minimums

```txt
monthly take-home income - essential monthly expenses - total minimum debt payments
```

This tells the user how much monthly breathing room exists before choosing any extra debt payoff amount.

### Suggested Extra Payment

Current skeleton logic:

```txt
70% of available cash after expenses and minimum debt payments
```

This keeps a small buffer instead of assuming the user should use every remaining ringgit.

This is a practical estimate, not a strict financial rule.

### Payoff Simulation

Each simulated month:

1. Apply monthly interest to active debts.
2. Pay minimum payment on each active debt.
3. Apply extra debt payment to the priority debt.
4. When a debt is cleared, redirect available payment to the next priority debt.
5. Store balance snapshots for timeline display.

Maximum simulation period:

600 months.

If the debt does not reduce meaningfully within the simulation period, return `stalled: true`.

### Avalanche Priority

Sort debts by:

1. highest annual interest/profit rate;
2. smallest balance as tie-breaker.

### Snowball Priority

Sort debts by:

1. smallest balance;
2. highest annual interest/profit rate as tie-breaker.

## Debt Health Score

The debt health score is an indicative score from 0 to 100.

It is affected by:

- debt commitment ratio;
- total debt compared to monthly income;
- high-interest debt exposure;
- whether cash flow is negative or tight;
- number of active debts.

Current score bands:

| Score | Label | Meaning |
|---:|---|---|
| 75 - 100 | Manageable | The repayment plan has room to work if spending stays controlled. |
| 55 - 74 | Needs attention | Debt load is starting to squeeze cash flow. |
| 35 - 54 | High pressure | Repayment plan needs stricter action or lender discussion. |
| 0 - 34 | Critical | Monthly debt pressure is too high for a normal payoff plan. |

Important:

The score should be presented as an educational indicator, not a bank-style credit score.

## Required UI States

The final design should support these states:

### Empty State

No debts entered yet.

Expected message:

Add at least one debt to build your repayment route.

### Normal State

Debts entered and monthly cash flow is positive.

Expected result:

Show payoff timeline, priority order, score, and practical diagnosis.

### Tight Cash Flow State

Available after minimum payments is low.

Expected result:

Warn user that extra payment should be conservative.

### Negative Cash Flow State

Available after minimum payments is below zero.

Expected result:

Do not encourage aggressive repayment. Show that the current plan is not affordable.

### Stalled Payoff State

Minimum payments and extra payment do not meaningfully reduce debt.

Expected result:

Show review-needed state instead of pretending there is a clear payoff date.

### Mobile State

The debt list must not rely only on a wide table. On mobile, each debt should be readable as a stacked card or step-by-step entry.

## Required UI Content Blocks

The final UI should include:

1. Calculator title
2. Short explanation
3. Monthly snapshot inputs
4. Debt list
5. Strategy selector
6. Available cash after minimum payments
7. Suggested extra payment
8. Debt health score
9. Payoff estimate
10. Priority order
11. Diagnosis
12. Action checklist

Optional but recommended:

- Expense breakdown drawer
- Tooltips for confusing fields
- Mobile stepper flow
- Save/share summary
- Download summary
- Anonymous story submission CTA

## Expense Breakdown Architecture

Essential monthly expenses can remain as one field for MVP.

However, the better UX is to let users expand an optional breakdown:

- rent / family contribution;
- food and groceries;
- transport;
- utilities;
- phone / internet;
- insurance / medical;
- family support;
- subscriptions;
- other essentials.

The total of the breakdown should populate `essentialExpenses`.

Do not force the user to complete the breakdown. It should help users who are unsure what to fill in.

## Handoff Contract For UI/UX Partner

The UI/UX partner can redesign the full interface.

They should preserve these hooks if working directly in HTML:

```html
data-debt-calculator
data-field="monthlyIncome"
data-field="essentialExpenses"
data-field="extraDebtPayment"
data-field="strategy"
data-debt-list
data-debt-row
data-output="totalDebt"
data-output="minimumPaymentTotal"
data-output="debtCommitmentRatio"
data-output="availableAfterMinimums"
data-output="suggestedExtraPayment"
data-output="payoffTime"
data-output="interestPaid"
data-output="healthScore"
data-output="statusLabel"
data-output="statusCopy"
data-output="diagnosis"
data-output="priorityList"
data-output="balancePath"
```

If the partner designs in Figma, they do not need to use these attributes. The attributes only matter when converting the final design into HTML/CSS.

## Files

Current architecture files:

- `ARCHITECTURE.md` - product and logic architecture.
- `README.md` - developer/designer handoff instructions.
- `index.html` - plain unstyled skeleton.
- `debt-calculator-core.js` - calculation logic.
- `debt-calculator-widget.js` - DOM binding layer.
- `debt-calculator-skeleton.css` - temporary skeleton styling.

## Final Handoff Plan

When the architecture is approved:

1. Keep `debt-calculator-core.js`.
2. Keep `debt-calculator-widget.js` unless the website framework needs a different binding layer.
3. Keep `ARCHITECTURE.md` and `README.md`.
4. Remove or ignore visual mockup styling.
5. Give partner the architecture, required fields, required outputs, and skeleton markup.
6. Partner designs the final UI in Figma or directly in HTML/CSS.
7. Final design is implemented while preserving the data contract.

