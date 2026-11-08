# RPC fixtures

Real responses from the `ql_*` RPCs, captured from QuemLeva-SP inside a rolled-back
transaction (no data was kept). `tests/api-mappers.test.ts` checks that every field the
app expects is present and converted.

Refresh them whenever a migration changes what an RPC returns: run the RPC as `anon` in a
`do $$ ... raise exception ... $$` block (so the test data is rolled back) and paste the JSON here.
