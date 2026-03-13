# Config Agent Deprecation

## What It Was

Config Agent was an optional conversational settings assistant that used `$$config` / `#endconfig` commands to edit router configuration from chat.

## Current Status

As of March 13, 2026, Config Agent is removed from active runtime paths and admin UX:

- No UI controls in the admin routing panel
- No `$$config` interception in `/api/v1/chat/completions` or `/api/v1/responses`
- No user-level read/write plumbing for `config_agent_*` fields
- No routing module exports or endpoint hooks for Config Agent handlers

This keeps routing behavior deterministic and prevents config-chat flows from affecting normal request handling.

## Legacy Database Columns

The following `users` table columns are retained for backward-compatible schema history, but are no longer read or written by application code:

- `config_agent_enabled`
- `config_agent_orchestrator_model`
- `config_agent_search_model`

You can leave these columns in place safely; they are inert.
