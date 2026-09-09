/*
# Revoke Trigger Function API Access

## Overview
The updated_at trigger function is an internal database trigger and is not an
application API. This migration removes all direct execution privileges while
keeping the trigger itself functional.

## Security
No browser role can call the trigger helper through the Data API.
*/

REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
