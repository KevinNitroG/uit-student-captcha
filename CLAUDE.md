<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan at
`specs/004-old-safari-ocr/plan.md` (with research.md, data-model.md,
contracts/, and quickstart.md alongside it).
<!-- SPECKIT END -->

## Workflow Rules

- **Always commit spec files with the feature**: when implementing a feature, the `specs/<NNN>-<name>/` directory (spec.md, plan.md, research.md, data-model.md, quickstart.md, contracts/, tasks.md, checklists/), plus `.specify/feature.json` and `CLAUDE.md`, must be committed in the same PR / push as the implementation. Use a separate `chore:` commit in the same push if needed.
