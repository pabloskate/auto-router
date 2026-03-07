# Open-Core Boundary

CustomRouter uses an open-core packaging model where the router product itself is public and self-hostable, while commercial distribution and operations remain private.

## Public Repo

The public repo includes:

- the web app and admin UI
- the routing engine and catalog adapters
- BYOK credential flows, API keys, and routing explanations
- the D1 schema, migrations, and Cloudflare deployment path

Recommended repo name: `custom-router`

## Private Systems

The private commercial surface includes:

- marketing site and pricing pages
- billing and entitlements
- hosted customer provisioning
- backups, monitoring, alerts, and runbooks
- support workflows and future commercial add-ons

Recommended repo name: `custom-router-cloud`

## How Hosted Uses Public Releases

- publish product releases from the public repo
- pin the private hosted repo to a public tag or commit SHA
- build and deploy that pinned public release with private infrastructure config
- upstream any product fixes back into the public repo instead of maintaining a private fork

## Managed BYOK

The first commercial offer is a managed BYOK service:

- customers bring their own provider credentials
- the hosted service runs public product releases from this repo
- self-hosted and hosted customers use the same public API contract

## Assisted Self-Hosting

Assisted self-hosting is a separate service layer:

- the customer owns the infrastructure account
- CustomRouter is deployed from the public repo
- operational help is sold as setup and maintenance, not as closed router code
