-- Migration: Add show_model_in_response to users table
-- Run this if you deployed the "show model in response" feature before migrating.
-- Safe to run multiple times: will error with "duplicate column" if already applied (ignore that).
ALTER TABLE users ADD COLUMN show_model_in_response INTEGER DEFAULT 0;
