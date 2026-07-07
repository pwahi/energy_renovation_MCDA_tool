# AHP + TOPSIS Decision Methodology
## Renovation Decision Support Tool
**Source:** Wahi (2025), *Preparing Dutch Homes for Energy Transition*, TU Delft  
**Methods:** Analytic Hierarchy Process (Saaty, 1980) + TOPSIS (Hwang & Yoon, 1981)

---

## Part 1 — Analytic Hierarchy Process (AHP)
### Purpose: Derive criteria weights from pairwise stakeholder comparisons

---

### Step 1 — Build the Pairwise Comparison Matrix

For `n` active criteria, construct an `n × n` matrix **A** where each cell `a_ij` represents how much more important criterion `i` is compared to criterion `j`, using the Saaty 1–9 scale.

**Saaty scale:**

| Value | Meaning |
|---|---|
| 1 | Equally important |
| 3 | Moderately more important |
| 5 | Strongly more important |
| 7 | Very strongly more important |
| 9 | Absolutely more important |
| 2, 4, 6, 8 | Intermediate values |
| 1/3, 1/5 … 1/9 | Reciprocal (j is more important than i) |

**Matrix structure:**

```
        C1      C2      C3
C1  [  1      a_12    a_13  ]
A = [  1/a_12  1      a_23  ]
C3  [  1/a_13  1/a_23  1    ]
```

**Rules:**
- Diagonal is always `1` (a criterion compared to itself)
- `a_ji = 1 / a_ij` (reciprocal property)
- Total number of comparisons = `n(n−1) / 2`

---

### Step 2 — Normalise the Matrix

For each column `j`, sum all values:

```
col_sum_j = Σ a_ij   for i = 1 to n
```

Then divide each cell by its column sum to get the normalised matrix **N**:

```
n_ij = a_ij / col_sum_j
```

---

### Step 3 — Compute Criteria Weights

For each row `i`, compute the row average across all columns. This is the priority weight `w_i`:

```
w_i = (1/n) × Σ n_ij   for j = 1 to n
```

The weight vector **w** = [w_1, w_2, … w_n] must satisfy:

```
Σ w_i = 1
```

---

### Step 4 — Compute the Consistency Ratio (CR)

Inconsistent judgements lead to unreliable weights. AHP checks this via the Consistency Ratio.

**Step 4a — Compute the weighted sum vector:**

```
WS_i = Σ (a_ij × w_j)   for j = 1 to n
```

**Step 4b — Compute λ_max (principal eigenvalue):**

```
λ_max = (1/n) × Σ (WS_i / w_i)
```

**Step 4c — Compute the Consistency Index (CI):**

```
CI = (λ_max − n) / (n − 1)
```

**Step 4d — Compute the Consistency Ratio (CR):**

```
CR = CI / RI
```

Where **RI** is the Random Consistency Index for a matrix of size `n`:

| n  | 1    | 2    | 3    | 4    | 5    | 6    | 7    | 8    | 9    | 10   |
|----|------|------|------|------|------|------|------|------|------|------|
| RI | 0.00 | 0.00 | 0.58 | 0.90 | 1.12 | 1.24 | 1.32 | 1.41 | 1.45 | 1.49 |

**Interpretation:**

| CR | Decision |
|---|---|
| CR ≤ 0.10 | ✅ Consistent — weights are accepted |
| CR > 0.10 | ⚠️ Inconsistent — pairwise comparisons should be revised |

> **Practical note:** With n = 13 criteria, there are 78 pairs to compare, which is cognitively excessive for a workshop setting. It is recommended to limit active criteria to 6–7 per session, giving 15–21 comparisons.

---

## Part 2 — TOPSIS
### Purpose: Rank alternatives by distance from ideal and anti-ideal solutions

---

### Step 1 — Build the Decision Matrix

Construct an `m × n` matrix **X** where:
- `m` = number of renovation alternatives
- `n` = number of active criteria
- `x_ij` = performance score of alternative `i` on criterion `j`

```
         C1      C2      C3
A1  [  x_11    x_12    x_13  ]
X = A2  [  x_21    x_22    x_23  ]
A3  [  x_31    x_32    x_33  ]
```

---

### Step 2 — Normalise the Decision Matrix

Compute the column norm for each criterion `j`:

```
norm_j = √( Σ x_ij²)   for i = 1 to m
```

Divide each value by its column norm to get the normalised matrix **R**:

```
r_ij = x_ij / norm_j
```

This makes all criteria dimensionless and comparable.

---

### Step 3 — Apply Criteria Weights

Multiply each normalised value by the AHP-derived weight `w_j` for that criterion:

```
v_ij = w_j × r_ij
```

This produces the weighted normalised decision matrix **V**.

---

### Step 4 — Determine the Positive and Negative Ideal Solutions

**Positive Ideal Solution (PIS) A⁺** — the best possible value for each criterion:

```
A⁺_j = max(v_ij)   if criterion j is "higher is better" (max)
A⁺_j = min(v_ij)   if criterion j is "lower is better" (min)
```

**Negative Ideal Solution (NIS) A⁻** — the worst possible value for each criterion:

```
A⁻_j = min(v_ij)   if criterion j is "higher is better" (max)
A⁻_j = max(v_ij)   if criterion j is "lower is better" (min)
```

---

### Step 5 — Compute Euclidean Distances

For each alternative `i`, compute the distance to the Positive Ideal Solution **(D⁺)**:

```
D⁺_i = √( Σ (v_ij − A⁺_j)² )   for j = 1 to n
```

And the distance to the Negative Ideal Solution **(D⁻)**:

```
D⁻_i = √( Σ (v_ij − A⁻_j)² )   for j = 1 to n
```

---

### Step 6 — Compute the Closeness Index

For each alternative `i`, compute the relative closeness to the ideal solution **(CI)**:

```
CI_i = D⁻_i / (D⁺_i + D⁻_i)
```

**Interpretation:**

| CI value | Meaning |
|---|---|
| CI → 1 | Alternative is close to the ideal, far from the worst |
| CI → 0 | Alternative is far from the ideal, close to the worst |
| CI = 0.5 | Alternative is equidistant from both |

---

### Step 7 — Rank the Alternatives

Sort alternatives in **descending order** of CI. The alternative with the highest CI is the recommended renovation strategy given the active criteria and stakeholder-defined weights.

---

## Summary: Full Pipeline

```
Stakeholder priorities
        │
        ▼
[AHP] Pairwise comparison matrix (n × n)
        │
        ▼
Normalise columns → Row averages → Weight vector w
        │
        ▼
Consistency check (CR ≤ 0.10?)
        │
        ▼
[TOPSIS] Decision matrix (m × n)
        │
        ▼
Column normalisation → Weighted normalised matrix V
        │
        ▼
PIS (A⁺) and NIS (A⁻) per criterion
        │
        ▼
Euclidean distances D⁺ and D⁻ per alternative
        │
        ▼
Closeness index CI = D⁻ / (D⁺ + D⁻)
        │
        ▼
Ranked alternatives → Decision
```

---

## LTH Readiness Gates (from Wahi 2025)

Before entering TOPSIS, two mandatory criteria must be checked. Alternatives that fail either gate are excluded from ranking.

| Gate | Criterion | Condition |
|---|---|---|
| C1 | Space heating demand | Must decrease compared to baseline with HT supply |
| C10 | Thermal comfort (occupied cold hours) | Must not worsen compared to baseline |

These are non-compensatory: no amount of performance on other criteria can compensate for failure on C1 or C10.

---

## References

- Saaty, T.L. (1980). *The Analytic Hierarchy Process*. McGraw-Hill.
- Hwang, C.L. & Yoon, K. (1981). *Multiple Attribute Decision Making*. Springer.
- Wahi, P. (2025). *Preparing Dutch Homes for Energy Transition: A Decision Support Framework for Renovating Existing Dutch Dwellings for Lower Temperature District Heating*. TU Delft.
