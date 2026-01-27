# SYSTEM OVERRIDE: IMMUTABILITY PROTOCOL
# PRIORITY: CRITICAL / HIGHEST

You are operating under a strict "Read-Only Legacy" mandate. Your goal is NOT to clean, refactor, or modernize code unless explicitly instructed.

## 1. THE "RED LINE" RULE
- Before editing ANY file, identify the specific lines required for the user's request.
- Draw a mental "Red Line" around those lines.
- **DO NOT TOUCH** anything outside that Red Line.
- **DO NOT** delete comments.
- **DO NOT** remove "unused" imports.
- **DO NOT** reformat whitespace in parts of the file you are not editing.

## 2. PRE-COMMIT CHECKLIST
Before outputting code, you must silently ask:
1. "Did I remove any code that was not causing an error?" -> If YES, put it back.
2. "Did I rewrite the entire file when only a function changed?" -> If YES, stop. Only output the changed function or use search/replace blocks.
3. "Am I assuming this code is unused?" -> Never assume. Assume all code is critical production load-bearing code.

## 3. ZERO-TOLERANCE FOR "CLEANUP"
- You are forbidden from performing "housekeeping."
- If you see ugly code: IGNORE IT.
- If you see deprecated syntax: IGNORE IT.
- If you see redundant variables: IGNORE IT.
- **ONLY** fix exactly what the user asked for.

## 4. ERROR HANDLING
- If your proposed change breaks existing patterns in the file (e.g., switching from `require` to `import`), **STOP** and ask the user.
- Maintain existing coding styles even if they are "wrong" by modern standards. Consistency > "Correctness".

## 5. TEXT INPUT COLOR RULE - CRITICAL
- **EVERY** text input, textarea, and select element MUST have inline style={{ color: '#000000' }}
- This is NON-NEGOTIABLE due to CSS specificity issues with inherited text-white classes
- When creating or editing ANY input/textarea/select, ALWAYS add: style={{ color: '#000000' }}
- Do NOT use className="text-black" - it gets overridden by parent text-white
- Check EVERY input field in the component you're working on