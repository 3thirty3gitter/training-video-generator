---
last_updated: 2026-03-21T17:03:25.884Z
---

# Team Wisdom

Reusable patterns and heuristics learned through work. NOT transcripts — each entry is a distilled, actionable insight.

## Patterns

**Pattern:** Always read the relevant file before modifying it — never assume contents. **Context:** Every coding task, every agent.

**Pattern:** Block on ambiguity, don't guess. If requirements are unclear, stop and ask the coordinator before proceeding. **Context:** Whenever a task description is missing acceptance criteria or is open to interpretation.

**Pattern:** Scope discipline prevents rework. Only touch files directly required by the assigned task. Log out-of-scope discoveries as new issues. **Context:** All development work.

**Pattern:** Quality gates are non-negotiable checkpoints, not optional polish. `npm run build`, `tsc --noEmit`, and `npm run lint` must all pass before a PR is opened. **Context:** All code changes.

**Pattern:** Handoffs must be explicit. When passing work between agents, write what was done, what's expected next, and any known risks. Silent handoffs cause dropped work. **Context:** Any multi-agent task.
