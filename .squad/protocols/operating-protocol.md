# Squad Operating Protocol

> **MANDATORY** — Every agent, including @copilot, MUST read and comply with this protocol at the start of every session before performing any work.

---

## 1. Session Start Ritual (Non-Negotiable)

Before touching any file, writing any code, or responding to any issue, every agent MUST complete the following in order:

1. **Read** `.squad/team.md` — confirm your role, your charter, and @copilot's capability tiers.
2. **Read** `.squad/routing.md` — confirm routing rules and issue assignment logic.
3. **Read** `.squad/decisions.md` — check for any standing architectural decisions that govern your work.
4. **Read** your own charter at `.squad/agents/{your-name}/charter.md` — confirm your domain and responsibilities.
5. **Read** `.squad/identity/now.md` — understand what the team is currently focused on.
6. **Identify your assigned task** — from the GitHub issue, label, or coordinator instruction. If no clear task exists, STOP and ask the coordinator before proceeding.

Skipping any step is a protocol violation. Proceeding without completing these steps is not allowed.

---

## 2. Scope Discipline — Do Only What Is Assigned

- **Work only on the task you were explicitly assigned.** Do not improve, refactor, or modify adjacent code unless it is directly required to complete your task.
- **No scope creep.** If you discover something that should be fixed but is outside your task, log it as a new issue or note it in a comment — do NOT fix it unilaterally.
- **One task at a time.** Do not start a second task until the first is complete and handed off.
- **If the task is ambiguous**, STOP. Comment on the issue asking for clarification. Do not guess at requirements and proceed.

---

## 3. Anti-Hallucination Rules

These rules exist to prevent confident but incorrect outputs.

### 3a. Read Before You Write
- **Always read the relevant file(s) in full** before modifying them. Never assume file contents.
- **Always read existing patterns** before introducing new ones. If `src/lib/tts-engine.ts` already handles a pattern, follow it — don't invent a parallel approach.
- **Never generate code for a file you haven't read.** No exceptions.

### 3b. Cite Evidence
- When making a claim about what the codebase does ("this function returns X", "this API accepts Y"), you must have read the relevant code in this session. Do not rely on memory from prior sessions.
- If you are unsure about a fact, say so explicitly rather than stating it confidently.

### 3c. No Fabricated APIs or Libraries
- Do not use npm packages, Next.js APIs, Firebase methods, or any external API you have not verified exists in `package.json` or the existing codebase.
- Do not invent method signatures. If you are unsure of a method's signature, read the source or type definitions first.

### 3d. Verify Before Marking Done
- Before marking any task complete, verify your changes actually compile (`npm run build` or `tsc --noEmit`).
- Before claiming a bug is fixed, confirm the fix addresses the root cause you identified — not just the symptom.

---

## 4. Quality Gates

Work is NOT done until all of the following are true:

| Gate | Owner | Requirement |
|------|-------|-------------|
| **Compiles** | Dev / @copilot | `npm run build` passes with no new errors |
| **Types check** | Dev / @copilot | No new TypeScript errors |
| **Lint passes** | Dev / @copilot | `npm run lint` passes |
| **Tested** | QA | Relevant behavior verified (manually or via test) |
| **Reviewed** | Reviewer | PR approved — no open change requests |
| **No secrets** | Reviewer | No API keys, tokens, or credentials in diff |
| **Decision logged** | Scribe | Any architectural choice written to `.squad/decisions/inbox/` |

@copilot must satisfy the first three gates before opening a PR. The remaining gates are enforced by the named agents.

---

## 5. Agent Boundary Rules

Each agent operates strictly within their domain. Do not cross into another agent's domain without a handoff.

| Agent | May touch | Must NOT touch without handoff |
|-------|-----------|-------------------------------|
| **Dev** | `src/`, `public/`, `package.json`, `next.config.js` | Dockerfile, GitHub Actions, Firebase config |
| **Reviewer** | Read-only review of any file | Writing production code |
| **QA** | Test files, bug reports, reproduction scripts | Production source code (`src/`) |
| **DevOps** | `Dockerfile`, `.github/workflows/`, Firebase config, `.env.example` | Application logic in `src/` |
| **Scribe** | `.squad/` log/history files, `decisions.md` | Any production code or workflows |
| **@copilot** | Tasks matching 🟢 profile in `team.md` | 🔴 tasks — decline and reassign |

If a task requires crossing a boundary, the agent must explicitly hand off to the correct agent and wait for a response.

---

## 6. Communication Protocol

- **Block, don't guess.** If you encounter an ambiguity, missing requirement, or unexpected condition that would require you to make an undocumented assumption — STOP and raise it with the coordinator before continuing.
- **Surface surprises immediately.** If you discover something unexpected (a security issue, a broken dependency, a conflicting decision) while working, report it before continuing.
- **No silent failures.** If you cannot complete a task, say so explicitly with a reason. Do not produce partial work and mark the task done.
- **Handoff explicitly.** When passing work to another agent, write a clear handoff note: what was done, what is expected next, and any known risks.

---

## 7. Branch and PR Protocol

All code changes go through a branch and PR — no direct commits to `main`.

- **Branch naming:** `squad/{issue-number}-{kebab-case-slug}`
- **PR must:** reference the issue (`Closes #N`), list what was changed, list what was tested
- **PR must NOT be merged** until Reviewer has approved and QA has signed off
- **🟡 needs-review PRs** must include: `⚠️ Flagged for squad member review before merge`

---

## 8. Decision Logging

Any decision that affects the team, architecture, or patterns must be logged. This is non-optional.

- **Where:** `.squad/decisions/inbox/copilot-{slug}.md` (for @copilot) or `.squad/decisions/inbox/{agent}-{slug}.md`
- **When:** Before or immediately after implementing a non-trivial architectural choice
- **Format:**
  ```
  # Decision: {title}
  Date: {date}
  Agent: {name}
  Context: {why this decision was needed}
  Decision: {what was decided}
  Alternatives considered: {what else was evaluated}
  Consequences: {what this affects going forward}
  ```

The Scribe merges inbox decisions into `.squad/decisions.md` after each session.

---

## 9. Prohibited Actions

The following are **absolutely prohibited** under any circumstances:

- ❌ Committing directly to `main`
- ❌ Hardcoding secrets, API keys, or credentials in any file
- ❌ Using `--force` push or `--no-verify` commit bypasses
- ❌ Deleting files not created in the current task without coordinator approval
- ❌ Installing new npm packages without coordinator approval
- ❌ Making changes outside your assigned task scope
- ❌ Marking a task done without meeting all quality gates
- ❌ Proceeding when requirements are ambiguous — always ask first

---

## 10. Session End

At the end of every session, every agent MUST:

1. Ensure all work is committed to a branch (not left as uncommitted changes)
2. Update `.squad/agents/{your-name}/history.md` with a brief session summary
3. Log any decisions made to `.squad/decisions/inbox/`
4. If the session ends mid-task, leave a clear note in the issue or PR describing current state and next steps

---

*This protocol is maintained by the Coordinator. Proposed changes must be submitted to `.squad/decisions/inbox/` for review.*
