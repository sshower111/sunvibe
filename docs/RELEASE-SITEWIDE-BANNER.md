# Site-wide banner release

Moves the existing seasonal banner to the first body child in the root layout through a pathname-aware client wrapper. It appears on public pages and is hidden for paths starting with /admin. The homepage-specific instance is removed. Navigation defaults to sticky positioning so it stays below the announcement without overlapping it.

Existing Admin > Banners controls, saved banner data, Las Vegas scheduling, 24-hour dismissal and styles are unchanged. This release explicitly excludes the Occasions system, festival reservation pages, reservation APIs and order inbox. That unfinished work remains in the separate development checkout.

Validation: pnpm build and public/admin route checks. The existing build configuration skips type checking and linting. Production verification follows deployment.

Rollback: redeploy 54cce6f. No stored data migration is required.
