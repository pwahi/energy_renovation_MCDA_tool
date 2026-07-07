# Chat Handoff

## Repository

GitHub: https://github.com/pwahi/energy_renovation_MCDA_tool.git

Branch: `main`

Latest local/remote commit at handoff: `a5d673a Add base case benchmark comparison`

## Current App State

The app is a static browser tool using:

- `index.html`
- `styles.css`
- `app.js`

It implements:

- KPI/criteria management with Environmental, Economic, and Social grouping.
- Custom KPI creation.
- Alternative scoring.
- One alternative can be marked as the existing condition / base case.
- Participant weighting profiles.
- Per-participant Saaty AHP sliders.
- Per-participant consistency ratio.
- Group aggregation using geometric mean for completed profiles with `CR <= 0.1`.
- TOPSIS ranking with weight source selector:
  - Aggregated group weights
  - Selected participant
  - Equal fallback
- Benchmark filtering with include/exclude toggle.
- Failed benchmark alternatives are color-coded when included.

## Benchmark Behavior Implemented

Benchmarks are currently free-text rules stored on each criterion.

Machine-readable examples:

- Numeric minimum: `> 0`, `>= 10`, `≥ 50`
- Numeric maximum: `<20`, `<= 1.40`, `≤ 1,40`, `<€7.000`
- Direction-based numeric: `20`, `1,40`, `7000`
- Energy label threshold: `Label B or better`, `B or better`, `A++`
- Relative to base case: `Lower than existing HT supply`, `Lower than baseline`, `Higher than base case`
- No benchmark: blank or `-`

Energy label ordering:

`A++ > A+ > A > B > C > D > E > F > G`

Relative/base-case rules compare against the alternative marked as base case. The base case itself is excluded from TOPSIS ranking.

## User's Next Design Preference

The user wants benchmark typology to be more structured:

1. For the fixed thesis criteria `C1-C13`, benchmark type should be fixed/preconfigured rather than arbitrary.
2. For custom criteria, the user should choose benchmark type from a dropdown list.
3. The dropdown should likely include:
   - No benchmark
   - Numeric minimum
   - Numeric maximum
   - Direction-based numeric
   - Energy label threshold
   - Lower than base case
   - Higher than base case
   - Manual/descriptive only
4. The benchmark value field should adapt to the chosen type:
   - Numeric value for numeric rules
   - Label dropdown for energy label threshold
   - No numeric value needed for base-case relative rules
   - Free text for manual/descriptive only

## Recommended Next Development Cycle

Implement structured benchmark typology:

- Add fields to criteria:
  - `benchmarkType`
  - `benchmarkValue`
  - keep `benchmark` only as display/backward-compatibility if needed
- Migrate existing benchmark strings into structured types during `normalizeCriteria()`.
- Preconfigure C1-C13:
  - C1: lower-than-base-case
  - C2: energy-label-threshold, value `B`
  - C3: numeric-maximum, value `1.40`
  - C4: numeric-minimum, value `0`, strict `>`
  - C5: numeric-minimum, value `0`, strict `>`
  - C6: no benchmark
  - C7: numeric-maximum, value `7000`
  - C8: no benchmark
  - C9: numeric-maximum, value `20`
  - C10: lower-than-base-case
  - C11: no benchmark/manual
  - C12: no benchmark
  - C13: numeric-maximum, value `26.50`
- For custom KPIs, show a benchmark type dropdown and value input.
- Update `evaluateBenchmark()` to use structured benchmark fields first, falling back to the current free-text parser for older saved state.
- Update the criteria UI so fixed C1-C13 show their benchmark type clearly and custom KPIs expose editable benchmark type/value controls.

## Validation To Run After Next Cycle

- `node --check app.js`
- `git diff --check`
- Manual/browser verification:
  - C1/C10 compare against selected base case.
  - C2 label threshold treats A++, A+, A, B as passing and C-G as failing.
  - Numeric thresholds parse European decimal/currency formats correctly.
  - Include/exclude benchmark failures changes TOPSIS ranking membership.
  - Custom KPI benchmark type dropdown controls evaluation.
