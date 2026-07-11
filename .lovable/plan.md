# Deep CRUD Coverage — Phase 2 Tests

Goal: prove every module actually works end-to-end (create → verify → delete), not just that pages render.

## What gets tested

For each entity, a single test does: sign in → open module → click "Add / New" → fill form → save → assert row appears → open row → delete → assert gone.

Modules covered:
1. Categories — create, rename, delete
2. Suppliers — create, delete
3. Customers — create, delete
4. Products — create with category + supplier, delete
5. Inventory — adjust stock on the created product, verify quantity
6. Purchase Order — draft → add line → receive → verify inventory increment
7. Sales Order — draft → add line → fulfill → verify inventory decrement
8. Reports — assert KPI numbers reflect the created activity
9. Settings — update organization name, verify persisted after reload

Plus one org-isolation test: create a second org, confirm data from org 1 is not visible.

## Technical details

- New file `tests/test_crud.py` using existing `_sign_in` helper and Allure decorators.
- Each test seeds a unique suffix (`uuid.uuid4().hex[:6]`) so parallel/repeat runs don't collide.
- Selectors: prefer `get_by_role("button", name=...)`, `get_by_label(...)`, and `get_by_text(..., exact=False)`. Fall back to `data-testid` only if a control has no accessible name — in that case I'll add the testid to the component.
- Screenshots for each CRUD flow saved as `40_<module>_created.png`, `41_<module>_deleted.png`, etc., embedded into Allure.
- Cleanup: tests delete their own rows in a `finally` so a failed run doesn't leave orphans.
- Test run order: session-scoped sign-in fixture, module tests run in dependency order (product before inventory before orders).
- After the suite passes, regenerate Allure report + refresh `allure_01..07` screenshots and bump the README badge to the new total.

## Risk / caveats I'll flag before starting

Some current module UIs may not expose all controls yet (e.g. "Receive PO" button). If a test can't find the control, I won't fake a pass — I'll mark it xfail with a note and list the missing UI in the summary so we know exactly what's not shippable.
