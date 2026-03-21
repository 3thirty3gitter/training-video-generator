# Ceremonies

> Team meetings that happen before or after work. Each squad configures their own.

## Session Start (Mandatory)

| Field | Value |
|-------|-------|
| **Trigger** | auto |
| **When** | before — every session, every agent |
| **Condition** | always |
| **Facilitator** | each agent individually |
| **Participants** | all |
| **Time budget** | immediate |
| **Enabled** | ✅ yes |

**Agenda (non-negotiable, complete in order):**
1. Read `.squad/protocols/operating-protocol.md` — full protocol compliance check
2. Read `.squad/team.md` — confirm role and @copilot capability tiers
3. Read `.squad/routing.md` — confirm routing rules
4. Read `.squad/decisions.md` — check standing architectural decisions
5. Read own charter at `.squad/agents/{name}/charter.md`
6. Read `.squad/identity/now.md` — team focus area
7. Confirm assigned task is clearly defined — if not, STOP and ask coordinator

> Any agent that skips this ceremony and begins work is in protocol violation.

---

## Design Review

| Field | Value |
|-------|-------|
| **Trigger** | auto |
| **When** | before |
| **Condition** | multi-agent task involving 2+ agents modifying shared systems |
| **Facilitator** | lead |
| **Participants** | all-relevant |
| **Time budget** | focused |
| **Enabled** | ✅ yes |

**Agenda:**
1. Review the task and requirements
2. Agree on interfaces and contracts between components
3. Identify risks and edge cases
4. Assign action items

---

## Retrospective

| Field | Value |
|-------|-------|
| **Trigger** | auto |
| **When** | after |
| **Condition** | build failure, test failure, or reviewer rejection |
| **Facilitator** | lead |
| **Participants** | all-involved |
| **Time budget** | focused |
| **Enabled** | ✅ yes |

**Agenda:**
1. What happened? (facts only)
2. Root cause analysis
3. What should change?
4. Action items for next iteration
