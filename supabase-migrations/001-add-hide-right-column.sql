-- Migration: add hide_right_column flag to logical_pairs_questions
-- Used for sequence/chronology questions where the right column is just
-- placeholder numbers (1,2,3,4) and should not be rendered in the test UI.
--
-- Apply in Supabase SQL editor (nmt-prep-dev / nmt-prep-staging / nmt-prep-prod).

ALTER TABLE logical_pairs_questions
  ADD COLUMN IF NOT EXISTS hide_right_column BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN logical_pairs_questions.hide_right_column IS
  'If true, the test UI hides the right-column legend (for sequence-only questions). right_items is still populated with placeholder labels 1/2/3/4 so the matrix can render.';
