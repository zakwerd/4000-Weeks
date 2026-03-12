# Figma Export Package

This folder contains separated HTML and CSS references for reconstructing the current UI in Figma.

Files:
- `layout.html`: static structural map of the UI (header, counter, icons, quote, week grid, journal panel)
- `styles.css`: design tokens (colors/typography) plus class styles used by `layout.html`

Notes:
- This is a handoff/reference export for design reconstruction, not the production React runtime.
- The real app uses dynamic rendering for 4000 dots and interactive states.
- In Figma, duplicate `.dot-square` into a 100-column grid to represent full density.
