# Implementation Guide — Patient Intake Questionnaire

This guide explains how to take `patient_questionnaire.json` and wire it into a form builder, CRM, or a tool like AntiGravity.

## 1. How the schema is structured

- The file has one top-level `questionnaire` object containing an array of `sections` (S1–S9, matching the 9 primary categories: personal details, chief complaint, medical history, medications, family history, lifestyle, diagnostics, appointment, insurance).
- Each section has a `questions` array. Every question has:
  - `id` — unique identifier (e.g. `Q2.2`), used to wire logic and store answers.
  - `text` — the label shown to the patient.
  - `type` — one of `text`, `textarea`, `number`, `date`, `single_select`, `multi_select`, `file_upload`, `scale`.
  - `required` — whether the field blocks submission if empty.
  - `validation` — format/length/range rules (regex patterns, min/max, file constraints).
  - `options` — for select/multi-select types.
  - `follow_up` — conditional logic: `{ "trigger": <answer value or list>, "show": [<question ids>] }`.
  - `parent` — on follow-up questions, points back to the question that triggers them (human-readable reference; use the `trigger` block on the parent as the source of truth for logic engines).

## 2. Rendering the branching logic

Treat this as a directed graph, not a flat list:

1. On load, render only questions with no `parent` field (the primary/root questions).
2. On each answer change, check that question's `follow_up` array:
   - If the given answer matches a `trigger` (exact match, or membership if `trigger` is a list, or the special value `"any_except_None"` used for multi-selects like chronic conditions), reveal the linked `show` question IDs.
   - If the answer no longer matches, hide those questions and clear their stored values (so stale answers aren't submitted).
3. Recursively repeat — a shown follow-up question can itself have its own `follow_up` block (none do in this schema, but the engine should support nesting for future sections).

Pseudocode:
```js
function onAnswer(questionId, value) {
  state.answers[questionId] = value;
  const question = findQuestion(questionId);
  if (question.follow_up) {
    for (const rule of question.follow_up) {
      const matches = Array.isArray(rule.trigger)
        ? rule.trigger.some(t => valueMatches(value, t))
        : valueMatches(value, rule.trigger);
      rule.show.forEach(id => setVisible(id, matches));
      if (!matches) rule.show.forEach(id => clearAnswer(id));
    }
  }
}
```

## 3. Validation

Apply `validation` at both field-blur and submit time:
- `pattern` — regex test (phone, email).
- `min_length` / `max_length` — string length checks.
- `min` / `max` — numeric/date/scale bounds.
- `min_date` / `max_date` — supports the literal `"today"`.
- `accepted_formats`, `max_file_size_mb`, `max_files` — for `file_upload` fields.

Block submission if any **visible** required question is unanswered or fails validation. Hidden (not-triggered) questions should never block submission.

## 4. Integrating with AntiGravity or a generic form builder / CRM

1. **Import the schema**: most form builders/CRMs accept a JSON field-definition import, or expose an API to create fields programmatically. Map each `section` to a form "page" or "group," and each `question` to a field using its `type`.
2. **Map types**: `single_select`→radio/dropdown, `multi_select`→checkbox group, `scale`→slider/number picker, `file_upload`→attachment field, `textarea`→multi-line text.
3. **Wire conditional visibility**: most builders support "show field X if field Y = Z" rules natively — translate each `follow_up.trigger` → `show` pair into one native conditional rule per target field.
4. **Store by `id`**: keep the question `id` as the field's internal key/name so submitted data maps 1:1 back onto this schema (useful for exports, analytics, and syncing to a CRM/EHR record).
5. **Submission payload**: submit as a flat `{ question_id: answer }` object plus metadata (timestamp, patient session ID). This makes it trivial to re-hydrate the form for edits or pre-fill on a returning patient.
6. **Webhook/API sync**: point the form's submit action at your backend endpoint (or CRM webhook) to create/update a patient record; use the `S1` (personal details) answers as the primary key match (phone/email) to avoid duplicate patient profiles.
7. **Data handling note**: this form collects health information. Confirm your hosting, storage, and transmission (HTTPS, encryption at rest, access controls, retention policy) meet the healthcare-data regulations that apply in your jurisdiction before going live.

## 5. Suggested UI flow

1. Section-by-section wizard (S1 → S9) rather than one long page — reduces abandonment.
2. Progress indicator per section.
3. Auto-save on each answer so partially completed intakes aren't lost.
4. A review screen before final submit, showing only the questions that were actually shown (respecting branching), so the patient can confirm what they entered.
