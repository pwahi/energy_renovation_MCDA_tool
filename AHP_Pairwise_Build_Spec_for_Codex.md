# Build Spec: AHP Pairwise Comparison Weighting Engine

Hand this directly to a coding agent. It specifies exact logic, formulas, and data flow — no product framing, just what to build. Written so each section can be implemented and tested independently.

---

## 0. Vocabulary used throughout

- **Category** = a pillar/group of criteria that are compared only against each other (e.g. Environmental, Economic, Social). Comparisons never cross categories.
- **Criterion** = one decision criterion inside a category (e.g. "Space Heating Demand").
- **Participant** = one person providing a full set of pairwise judgements for one or more categories.
- **Judgement** = one participant's answer to one pairwise question (one pair of criteria, one category).

---

## 1. Setup data (input, not built by this engine)

The engine receives, per project:

```
categories: [
  {
    id: "environmental",
    name: "Environmental",
    criteria: [
      { id: "C1", name: "Space Heating Demand" },
      { id: "C2", name: "Energy Label" },
      { id: "C3", name: "Energy Index" },
      { id: "C4", name: "Share of Renewable Energy Generation" },
      { id: "C5", name: "Energy Savings (gas)" }
    ]
  },
  {
    id: "economic",
    name: "Economic",
    criteria: [ ... C6..C9 ... ]
  },
  {
    id: "social",
    name: "Social",
    criteria: [ ... C10..C13 ... ]
  }
]
participants: [ { id: "p1", name: "..." }, { id: "p2", name: "..." }, ... ]
```

Number of categories and number of criteria per category are **not fixed** — build for arbitrary `n` per category (source spreadsheet hardcoded 5/4/4, don't reproduce that constraint).

---

## 2. STEP 1 — Pairwise comparison instructions, per category

For **each category independently**, and **for each participant independently**:

1. Take that category's criteria list of length `n`.
2. Generate every unique unordered pair: `n*(n-1)/2` pairs. (For n=5 → 10 pairs; n=4 → 6 pairs.) Do this with a simple double loop `for i in 0..n-1: for j in i+1..n-1: pair(criteria[i], criteria[j])`. Never generate a criterion against itself, never generate both `(A,B)` and `(B,A)`.
3. For every generated pair `(left, right)`, present one question:
   > "How important is **{left.name}** compared to **{right.name}**?"
4. Capture the answer as a single integer **position** in range `1–17` from a bidirectional control, where:
   - `1` = left is extremely more important
   - `9` = equal importance (center)
   - `17` = right is extremely more important
   - Values move symmetrically outward from 9 in both directions (see table below).
5. Store the raw `position` (not just a derived score) — this is the source of truth per judgement. Never let the UI or storage skip straight to the Saaty score; always keep the 1–17 position so judgements can be re-displayed/edited later.

### Position → Saaty score lookup table (build as a static lookup, not nested conditionals)

```
POSITION_TO_SCORE = {
   1: 9,     2: 8,     3: 7,     4: 6,     5: 5,
   6: 4,     7: 3,     8: 2,     9: 1,
  10: 1/2,  11: 1/3,  12: 1/4,  13: 1/5,
  14: 1/6,  15: 1/7,  16: 1/8,  17: 1/9
}
```

`score = POSITION_TO_SCORE[position]`. A score `> 1` means **left** criterion wins; a score `< 1` means **right** criterion wins; `1` means equal.

### Output of Step 1 (per participant, per category)

```
Judgement {
  category_id: string
  participant_id: string
  left_id: string
  right_id: string
  position: int (1-17)
  score: float          // derived via lookup, store for convenience but always derivable from position
}
```

A participant must supply exactly `n*(n-1)/2` judgements to consider a category "complete" for that participant. Validate this before moving to Step 2 for that participant/category.

---

## 3. STEP 2 — Build the comparison matrix, per category, per participant

For **each category**, **for each participant** who has completed that category:

1. Create an `n x n` matrix `A`, indexed in the same order as `category.criteria`.
2. Diagonal: `A[i][i] = 1` for all `i`.
3. For every judgement `(left_id, right_id, score)`:
   - Let `i = index_of(left_id)`, `j = index_of(right_id)`.
   - `A[i][j] = score`
   - `A[j][i] = 1 / score`   ← reciprocal, computed automatically. Never ask the user for this value directly.
4. Result: one fully populated reciprocal matrix per (category, participant).

This matrix is scoped to **one participant, one category**. Do not mix participants at this step.

---

## 4. STEP 3 — Compute weights + consistency from a matrix, per category, per participant

This is a pure function: `compute_ahp(matrix A, n) -> { weights, lambda_max, CI, RI, CR, consistent }`. Use it identically whether `A` came from a single participant (Step 2) or from an aggregated matrix (Step 5, combining participants). Implement it once, reuse everywhere.

```
function compute_ahp(A, n):
    # 1. Column sums
    col_sum[j] = sum(A[i][j] for i in 0..n-1)   for each j

    # 2. Normalize
    A_norm[i][j] = A[i][j] / col_sum[j]

    # 3. Priority vector (criteria weights) = row average of normalized matrix
    weights[i] = average(A_norm[i][j] for j in 0..n-1)
    # weights sum to 1 across the category

    # 4. Weighted sum vector
    weighted_sum[i] = sum(A[i][j] * weights[j] for j in 0..n-1)

    # 5. Consistency vector
    consistency_vector[i] = weighted_sum[i] / weights[i]

    # 6. Lambda max
    lambda_max = average(consistency_vector[i] for i in 0..n-1)

    # 7. Consistency Index
    CI = (lambda_max - n) / (n - 1)     # if n == 1, CI = 0, skip consistency (trivial category)

    # 8. Random Index (lookup table, fixed values from Saaty)
    RI = RANDOM_INDEX[n]

    # 9. Consistency Ratio
    CR = CI / RI if RI > 0 else 0

    consistent = (CR <= 0.10)

    return { weights, lambda_max, CI, RI, CR, consistent, consistency_vector }
```

### Random Index lookup table (fixed constants — do not compute, hardcode exactly)

```
RANDOM_INDEX = {
  1: 0.00, 2: 0.00, 3: 0.58, 4: 0.90, 5: 1.12,
  6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49
}
```
If `n > 10` is ever needed, flag as unsupported rather than guessing an RI value.

### Per-participant, per-category result

Run `compute_ahp` on each participant's own matrix from Step 2 → this gives you **individual weights and CR per participant per category**. Store these; they're needed for Step 6 (participant comparison), even though the "official" weight used downstream comes from the combined matrix in Step 5.

If a participant's `CR > 0.10` for a category: flag it. Identify the worst-offending criterion by finding the `i` whose `consistency_vector[i]` deviates furthest from `lambda_max` — surface that criterion's judgements back to the participant as the ones most worth revisiting.

---

## 5. STEP 4 — What the per-category weights are used for

Once you have `weights[]` for a category from Step 3 (per participant), or the final `balanced_weight[]` from Step 5 (flat across every category), that's the relative importance of each criterion. The `balanced_weight[]` output is what feeds directly into a downstream ranking method (e.g. the TOPSIS decision matrix seen in `4. TOPSIS_ranking`) as the "Criteria weights" row — used as-is, unmodified, one weight per criterion across the whole flat list. Downstream, these weights are used to combine multiple performance criteria within a category into a single category score for a design alternative — i.e. `category_score(alternative) = Σ weights[i] * normalized_criterion_score(alternative, criterion_i)`. This engine's responsibility stops at producing `weights[]`; it does not compute alternative scores. Keep the weights output as a flat, clean interface:

```
CategoryWeights {
  category_id: string
  weights: { criterion_id: float }   // sums to 1.0
  CR: float
  consistent: boolean
}
```

Note: this spreadsheet's logic does not weigh categories against each other (Environmental vs Economic vs Social) — only criteria within a category. If a global cross-category weight is later needed, that requires a **separate top-level AHP pass** where "criteria" = the categories themselves, using the exact same `compute_ahp` function with `n = number of categories`. Build `compute_ahp` generically enough that it can be reused for this without modification.

---

## 6. STEP 5 — Combine weights across participants (as actually built in `2. Combined_criteria_weights`)

This is confirmed against the real spreadsheet tab, so build to this exactly rather than the geometric-mean version originally drafted here.

### 6.1 Layout

One row per participant, one column per criterion — **all criteria from all categories laid out flat in a single row**, grouped under category headers only for readability (the headers are cosmetic; the math below doesn't treat categories specially at all):

```
                C1    C2    C3    C4    C5   | C6   C7   C8   C9  | C10  C11  C12  C13
Participant 1   0.34  0.18  0.14  0.10  0.25 | 0.46 0.23 0.16 0.16| 0.42 0.10 0.41 0.07
Participant 2   0.31  0.03  0.03  0.22  0.40 | 0.29 0.10 0.56 0.05| 0.26 0.10 0.58 0.06
Participant 3   ...
Participant 4   ...
```

Each participant's row is their own **per-category AHP output from Step 3** — i.e. within a given participant's row, `C1..C5` (Environmental) sum to 1, `C6..C9` (Economic) sum to 1, `C10..C13` (Social) sum to 1. That structure comes from Step 3 upstream; this step doesn't enforce or recompute it.

### 6.2 Average Criteria Weights (flat arithmetic mean per column)

```
average_weight[criterion.id] = AVERAGE( participant_weight[p][criterion.id] for p in 1..K )
```

One value per criterion, computed independently per column — no per-category grouping in the formula itself. Because each participant's own category slice already summed to 1, each category's slice of `average_weight[]` will also sum to ~1 (small deviations only from rounding in the source data).

### 6.3 Balanced Criteria Weights (single global re-normalization, NOT per category)

```
grand_total = SUM( average_weight[c.id] for c in all_criteria_across_all_categories )
balanced_weight[c.id] = average_weight[c.id] / grand_total     for every criterion, across every category
```

This is the important part to get right: **the divisor is the sum of all 13 (or however many) criteria across every category combined — not a per-category sum.** The result is one flat vector across every criterion in every category, summing to 1 overall. This is exactly what's fed as "Criteria weights" straight into the TOPSIS ranking sheet (`4. TOPSIS_ranking`), unchanged.

### 6.4 Category weighting: confirmed equal, by design

Confirmed: the three categories (Environmental, Economic, Social) are intended to be **equally important**, so the implicit behavior described above is correct and should be preserved, not "fixed":

- Each category's `average_weight[]` slice sums to ~1 on its own (since each participant's per-category AHP weights sum to 1, per §6.2).
- The grand-total divisor in §6.3 is the sum across all categories combined (≈ number of categories, ≈3 here), so dividing by it gives each category roughly `1/3` of the final balanced weight.
- This is the correct behavior for this build. **Do not add an explicit category-importance weighting step** (e.g. a top-level AHP pass comparing categories against each other) — that would only be needed if categories were meant to carry unequal importance, which they aren't here.

Build note for Codex: implement §6.2–6.3 as-is (flat mean, single global re-normalization) with no category weighting factor anywhere in the code. If the number of categories or criteria-per-category changes later, the equal-weighting behavior falls out automatically from the same formula — no special-casing needed as long as each participant's per-category weights still sum to 1 (guaranteed by Step 3).

### 6.5 What NOT to build (a correction to the earlier draft of this spec)

An earlier version of this document specified combining participants via **geometric mean of each participant's weight vector, re-normalized per category** (a method called Aggregation of Individual Priorities). That is a legitimate alternative AHP method, but **it is not what the actual spreadsheet does**, and should not be built unless you deliberately want to diverge from the existing tool's behavior. Build to §6.2–6.3 (flat arithmetic mean, single global re-normalization) to match the existing `Combined_criteria_weights` tab exactly.

---

## 7. STEP 6 — Compare across participants

Build a comparison view, using the per-participant results already computed in Step 3 and the balanced result from Step 5 (nothing here needs recomputing from scratch):

```
ParticipantComparison {
  criteria: [criterion_id, ...]        // all criteria, all categories, flat — matches the sheet layout
  rows: [
    {
      participant_id: string,
      weights: { criterion_id: float },   // from Step 3, this participant's own per-category AHP result
      per_category_CR: { category_id: float },
    },
    ...
  ],
  average: { criterion_id: float },     // Step 5, §6.2 — flat arithmetic mean per criterion
  balanced: { criterion_id: float },    // Step 5, §6.3 — average / grand_total, sums to 1 across everything
}
```

Rendering rule: one row per participant (all criteria in one row, grouped visually under category headers), then an "Average" row and a "Balanced" row underneath — this matches the actual sheet layout in `2. Combined_criteria_weights` exactly. CR is a per-participant, per-category consistency signal (from Step 3) and does not apply to the Average or Balanced rows — don't compute or display a CR for those.

---

## 8. Full pipeline, in order (pseudocode)

```
all_criteria = flatten(category.criteria for category in categories)   # e.g. C1..C13, flat, order preserved

participant_results = {}   # participant_id -> { weights: {criterion_id: weight}, per_category_CR: {...} }

for category in categories:
    for participant in participants_who_completed(category):
        judgements = get_judgements(participant, category)       # Step 1
        A = build_matrix(judgements, category.criteria)          # Step 2
        result = compute_ahp(A, n=len(category.criteria))        # Step 3, per participant, per category
        participant_results[participant.id].weights.update(result.weights)   # merge into that participant's flat row
        participant_results[participant.id].per_category_CR[category.id] = result.CR

        if not result.consistent:
            flag_for_review(participant.id, category.id, result)  # CR > 0.10

# Step 5 — only once every participant's flat weight row is assembled across ALL categories
average_weight = {}
for criterion in all_criteria:
    average_weight[criterion.id] = average(
        participant_results[p].weights[criterion.id] for p in participant_results
    )

grand_total = sum(average_weight[c.id] for c in all_criteria)     # sum across ALL categories together
balanced_weight = {
    c.id: average_weight[c.id] / grand_total for c in all_criteria
}

store_category_weights(balanced_weight)                            # flat vector, fed directly downstream (e.g. TOPSIS)
store_participant_comparison(participant_results, average_weight, balanced_weight)  # Step 6
```

Note the order this enforces: **pairwise comparison per category → per-participant weights per category (Step 3) → assemble each participant's full flat row across all categories → flat arithmetic mean per criterion → single global re-normalization → balanced weights.** The per-category structure only matters up through Step 3; Steps 5–6 treat all criteria as one flat list.

---

## 9. Validation rules to implement

- Reject a matrix if any participant is missing a judgement for a required pair (don't silently default to 1/equal).
- Every score in `POSITION_TO_SCORE` must only ever be one of the 17 fixed values — never allow a free-text or unbounded numeric override elsewhere in the pipeline; the reciprocal structure depends on this being closed and symmetric.
- `weights[]` for any category must sum to `1.0 ± 1e-9` after Step 3 (per participant) — assert this in tests.
- `average_weight[]` per category slice should sum to ~1 (small deviation only from source rounding) — not asserted exactly, but worth a sanity-check warning if a category's slice drifts far from 1 (could indicate a participant didn't actually complete that category).
- `balanced_weight[]` (the full flat vector, all categories combined) must sum to `1.0 ± 1e-9` after the grand-total re-normalization in §6.3 — assert this in tests.
- `n=1` (a category with a single criterion): weight = 1, CR = 0, skip consistency entirely — don't divide by zero (`RI[1] = 0`).
- `n=2`: `RI[2] = 0`, so `CR` is always `0` regardless of `CI` — this is expected AHP behavior (2-criterion comparisons are always "consistent" by definition), not a bug.

---

## 10. What NOT to reproduce from the source spreadsheet

- Fixed cell ranges assuming exactly 5/4/4 criteria per category — build for arbitrary `n`.
- Manually copy-pasted `INDEX/MATCH` reciprocal lookups against a hardcoded assigned-value table — just take the reciprocal (`1/score`) directly, it's mathematically identical and can't drift out of sync.
- Any hardcoded cross-sheet cell reference to a criterion by row position — always reference by `criterion_id`.
