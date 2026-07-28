/*
# Add backend validation constraints to assets table

## Overview
Adds database-level CHECK constraints that enforce input validation at the
backend (Postgres) layer. The database is the last line of defense — even if
the frontend is bypassed, these constraints reject invalid data.

## Changes to `assets` table
1. `assets_name_length` — name must be between 1 and 200 characters (not empty)
2. `assets_code_format` — asset_code must match alphanumeric/hyphen/underscore
   pattern and be at most 50 chars
3. `assets_value_range` — acquisition_value must be non-negative and under 1B
4. `assets_string_lengths` — serial_number, responsible capped at 100 chars

These are additive constraints — no existing data is altered or deleted.
All use IF NOT EXISTS-style guards via DO blocks to be safely re-runnable.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assets_name_length') THEN
    ALTER TABLE assets ADD CONSTRAINT assets_name_length
      CHECK (length(name) >= 1 AND length(name) <= 200);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assets_code_format') THEN
    ALTER TABLE assets ADD CONSTRAINT assets_code_format
      CHECK (asset_code ~ '^[A-Za-z0-9_-]{1,50}$');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assets_value_range') THEN
    ALTER TABLE assets ADD CONSTRAINT assets_value_range
      CHECK (acquisition_value IS NULL OR (acquisition_value >= 0 AND acquisition_value < 1000000000));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assets_string_lengths') THEN
    ALTER TABLE assets ADD CONSTRAINT assets_string_lengths
      CHECK (
        (serial_number IS NULL OR length(serial_number) <= 100)
        AND (responsible IS NULL OR length(responsible) <= 100)
      );
  END IF;
END $$;
