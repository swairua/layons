Title: Normalize BOQ units, add Units management & PDF improvements

Summary
- Add units table and management UI (create/edit/delete) scoped to company.
- Update Create BOQ modal to select unit (stores unit_id + unit_name + unit_abbreviation) and provide +Add unit flow.
- Migrate existing BOQs: map legacy unit names to units, populate unit_id/unit_name/unit_abbreviation.
- Cleanup legacy unit fields where unit_id exists.
- Update BOQ viewer and PDF generator to prefer unit_abbreviation and include page numbering.
- Add admin Units Normalize page and scripts to audit/normalize BOQs.
- Add nightly GitHub Actions workflow to run normalization.

Files/Areas Changed
- migrations/005_units.sql (new)
- src/hooks/useDatabase.ts (units hooks)
- src/components/units/CreateUnitModal.tsx
- src/pages/settings/Units.tsx
- src/pages/settings/UnitsNormalize.tsx
- src/components/boq/CreateBOQModal.tsx (unit select + creation flow, store unit_id)
- src/pages/BOQs.tsx (viewer shows abbreviation)
- src/utils/boqPdfGenerator.ts (unit_name/unit_abbreviation included)
- src/utils/pdfGenerator.ts (BOQ PDF layout: uses unit_abbreviation, page numbering, theme colors)
- scripts/migrate_units_names_to_ids.cjs (migration)
- scripts/units_normalize_runner.cjs (normalization runner)
- scripts/cleanup_boq_legacy_units.cjs (cleanup)
- scripts/export_boq_units_csv.cjs (CSV export)
- scripts/audit_boq_units.cjs (audit)
- .github/workflows/units-normalize.yml (nightly workflow)

Migrations & DB steps (required before usage)
1. Run migrations (applies new units table):
   node scripts/apply_migrations.cjs
2. Seed or create any initial units via Settings > Units or run scripts if needed.
3. Run migration to map existing BOQs to units (if not already run):
   node scripts/migrate_units_names_to_ids.cjs
4. Normalize & cleanup (optional or automatic via workflow):
   node scripts/units_normalize_runner.cjs
   node scripts/cleanup_boq_legacy_units.cjs

Git / CI notes
- Add DATABASE_URL secret to repo settings for the nightly workflow and any GitHub Actions that run DB scripts.

Testing steps
- Open /settings/units and add/edit units.
- Open /settings/units/normalize and run Normalize Now; verify BOQs updated.
- Create a new BOQ and confirm unit selection stores unit_id and appears in viewer and PDF with abbreviation.
- Download BOQ PDF and verify unit abbreviations and page numbering.

Rollback
- You can restore DB from backup prior to running migrations and scripts. Scripts are idempotent but changes to boqs.data are irreversible without backup.

How to push the branch and update PR (run locally)
1. git checkout ai_main_6dc86dfd6592
2. git pull origin ai_main_6dc86dfd6592
3. git add . && git commit -m "Normalize BOQ units, add Units management & PDF improvements"
4. git push origin ai_main_6dc86dfd6592

If push fails due to permissions, either grant repository write access to the Runner or run the commands above locally and open the Pull Request.

Prepared-by: automation (detailed changes available in repository).
