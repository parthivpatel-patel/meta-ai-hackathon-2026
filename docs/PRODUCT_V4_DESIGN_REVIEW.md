# FORGE 4.0 design exploration

## Three distinct concepts, before implementation

### A. Scientific notebook

A single document with a left margin index, inline figures and numbered observation/test/result entries. Selecting a case opens a notebook; experiments append to the document. Advanced evidence opens in margin notes. On mobile, a chapter picker jumps within the notebook.

Strengths: readable narrative, strong reproducibility story, low visual decoration. Weaknesses: sequential actions become hard to find in a long record; mobile scrolling recreates the central problem in v3. Complexity: medium.

### B. Guided investigation application — selected

A case-selection lobby leads into a six-stage investigation. Horizontal stage navigation replaces the fixed sidebar. Each stage has one dominant purpose; a narrow contextual guide explains the next action and current verification state. Evidence has a dedicated instrument with one selected signal and modality at a time. Tests show the proposed intervention before execution. Results and export are separate destinations. Mobile replaces the desktop stage rail with a native stage selector and uses a compact current-step action bar.

Strengths: clear first action, progressive disclosure, comfortably readable type, short primary screens, strong desktop/mobile continuity. A first-time user can read the introductory journey and select a case without seeing hashes, statistical policy or raw status codes. Weaknesses: fewer simultaneous plots; additional navigation for expert comparison. Complexity: medium; API orchestration is reusable and no backend change is necessary.

### C. Industrial instrument console

A three-column console: equipment/case strip on the left, synchronized multi-signal instruments in the center, and a continuously updating test queue and verdict on the right. Keyboard shortcuts switch instruments. Mobile becomes a full-screen instrument with a bottom sheet for tests and results.

Strengths: high information density and fast expert operation. Weaknesses: more cognitive load for judges/new users, complex mobile sheets/focus management, risk of implying live industrial monitoring. Complexity: high.

## Visual concept records

The conceptual structures above were selected before coding. These original schematic wireframes record the three directions; they are not screenshots or functional prototypes.

- [A: Scientific notebook](design/concept-a.svg)
- [B: Guided investigation](design/concept-b.svg)
- [C: Instrument console](design/concept-c.svg)

## Comparative assessment

Scores are design judgments from 1 (weak) to 5 (strong), not research results or measured usability outcomes.

| Criterion | A | B | C |
| --- | ---: | ---: | ---: |
| Readability | 5 | 5 | 3 |
| Workflow clarity | 3 | 5 | 3 |
| Professional appearance | 4 | 5 | 4 |
| Originality | 4 | 4 | 4 |
| Appropriate information density | 3 | 5 | 4 |
| Mobile usability | 3 | 5 | 2 |
| Accessibility implementation simplicity | 4 | 5 | 2 |
| Implementation simplicity | 4 | 4 | 2 |

Choose **B** because the user's priority is understanding and completing an investigation, rather than monitoring many instruments. This is a hypothesis about usability; no first-time-user study has been conducted and no claim of measured 30-second comprehension is made.

## Structural differences from v3

- A case lobby replaces the dashboard empty state and repeated case selector.
- A horizontal journey replaces permanent dark sidebar navigation.
- Overview, evidence, causes, tests, results and report each render a dedicated screen; the overview no longer duplicates charts, ranking, event history and result cards.
- One large selected signal replaces three small side-by-side charts. The evidence inspector owns modality selection and detailed provenance.
- A contextual next-step guide replaces repeated global action buttons.
- Test proposals are presented before execution; the audit history moves behind disclosure.
- Results lead with a plain-language interpretation, with numerical references and policy behind expandable controls.
- Mobile uses its own stage selector and single-signal instrument, not a stack of desktop panels.

## Release boundary

Work starts from `feature/forge-design-system-v3` at ee7015b6e3e4f284e6ab5deb3cfa590017087a8c on `feature/forge-product-v4`. No main/deployment branch changes, automatic deployment, real inference activation or numerical-engine changes are part of this redesign.
