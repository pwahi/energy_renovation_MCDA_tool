# Cloud Handoff

## Repository

GitHub: https://github.com/pwahi/energy_renovation_MCDA_tool.git

Branch: `main`

## Current State

The project is a static browser app using `index.html`, `styles.css`, and `app.js`.

The latest local development cycle added the first implementation of the multi-participant weighting workflow:

- Participant profiles in the Weights tab.
- Add, duplicate, rename, delete, and select participant profiles.
- Per-participant Saaty comparison matrices.
- Per-participant Socratic input storage.
- Per-participant AHP weights and consistency ratio.
- Group aggregation using the geometric mean of completed participant profiles with `CR <= 0.1`.
- Ranking weight-source selector:
  - Aggregated group weights
  - Selected participant weights
  - Equal fallback weights
- TOPSIS now filters alternatives that fail C1/C10 gate checks before ranking.

## Verification Completed Locally

- `node --check app.js` passes.

Browser verification was started but interrupted before a full interaction pass was completed.

## Recommended Cloud Continuation

1. Pull latest `main`.
2. Open `index.html` in a browser.
3. Verify the participant workflow:
   - Add a participant.
   - Duplicate a participant.
   - Rename a participant.
   - Adjust Saaty sliders for each participant.
   - Confirm participant CR and included/review/pending status.
   - Confirm group weights update only from completed profiles with `CR <= 0.1`.
4. Verify ranking behavior:
   - Switch weight source between group, selected participant, and equal fallback.
   - Confirm the ranking source notice updates.
   - Confirm C1/C10 failed alternatives are excluded from TOPSIS.
5. Fix any UI/runtime issues found during browser testing.

## Next Feature After Verification

Upgrade Socratic mode from the current local heuristic into a real participant-facing conversation workflow that asks one question at a time and produces a draft Saaty matrix for review.
