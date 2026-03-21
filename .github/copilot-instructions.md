# Copilot Coding Agent — Squad Instructions

You are working on a project that uses **Squad**, an AI agent team framework. When picking up issues autonomously, you MUST follow these guidelines without exception.

## ⚠️ Mandatory: Operating Protocol

**BEFORE doing anything else**, read and comply with the full operating protocol:

```
.squad/protocols/operating-protocol.md
```

This is non-negotiable. It covers:
- Session start ritual (what to read before any work)
- Scope discipline (do only what is assigned)
- Anti-hallucination rules (read before you write, cite evidence, no fabricated APIs)
- Quality gates (compile, type-check, lint before opening a PR)
- Prohibited actions (no direct commits to main, no hardcoded secrets, no scope creep)
- Branch and PR protocol
- Decision logging requirements

**If you have not read the operating protocol, stop and read it now.**

---

## Team Context

After reading the operating protocol, complete the session start ritual:

1. Read `.squad/team.md` for the team roster, member roles, and your capability profile.
2. Read `.squad/routing.md` for work routing rules.
3. Read `.squad/decisions.md` for standing architectural decisions.
4. If the issue has a `squad:{member}` label, read that member's charter at `.squad/agents/{member}/charter.md` to understand their domain expertise and coding style — work in their voice.

## Capability Self-Check

Before starting work, check your capability profile in `.squad/team.md` under the **Coding Agent → Capabilities** section.

- **🟢 Good fit** — proceed autonomously.
- **🟡 Needs review** — proceed, but note in the PR description that a squad member should review.
- **🔴 Not suitable** — do NOT start work. Instead, comment on the issue:
  ```
  🤖 This issue doesn't match my capability profile (reason: {why}). Suggesting reassignment to a squad member.
  ```

## Branch Naming

Use the squad branch convention:
```
squad/{issue-number}-{kebab-case-slug}
```
Example: `squad/42-fix-login-validation`

## PR Guidelines

When opening a PR:
- Reference the issue: `Closes #{issue-number}`
- If the issue had a `squad:{member}` label, mention the member: `Working as {member} ({role})`
- If this is a 🟡 needs-review task, add to the PR description: `⚠️ This task was flagged as "needs review" — please have a squad member review before merging.`
- Follow any project conventions in `.squad/decisions.md`
- Confirm all quality gates are met before opening: `npm run build` passes, no new TypeScript errors, `npm run lint` passes

## Decisions

If you make a decision that affects other team members, write it to:
```
.squad/decisions/inbox/copilot-{brief-slug}.md
```
The Scribe will merge it into the shared decisions file.
