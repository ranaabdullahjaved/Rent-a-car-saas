# Migration rules

1. Never edit a migration file after it has been applied to any environment.
2. Always run `npm run db:generate` then review the SQL before `npm run db:migrate`.
3. After generating the bookings migration, MANUALLY ADD this SQL to it before running migrate:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE OR REPLACE FUNCTION fn_set_booking_block_range()
RETURNS trigger AS $$
BEGIN
  NEW.block_range := tstzrange(
    NEW.start_at,
    NEW.end_at + make_interval(mins => COALESCE(NEW.buffer_minutes, 0)),
    '[)'
  );
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_booking_block_range
  BEFORE INSERT OR UPDATE OF start_at, end_at, buffer_minutes ON bookings
  FOR EACH ROW EXECUTE FUNCTION fn_set_booking_block_range();

ALTER TABLE bookings
  ADD CONSTRAINT no_double_booking
  EXCLUDE USING gist (
    tenant_id   WITH =,
    vehicle_id  WITH =,
    block_range WITH &&
  ) WHERE (vehicle_id IS NOT NULL AND status IN ('confirmed','dispatched','active'));
```

4. For production, run migrations via: `npm run migrate`
5. Use `DATABASE_URL_UNPOOLED` for migrations (bypasses PgBouncer if using Neon).

## `balance_due`

`bookings.balance_due` is a DB-generated column (`total_charges - total_paid`),
not written by Drizzle. Add it in the same migration as the table:

```sql
ALTER TABLE bookings
  ADD COLUMN balance_due numeric(14, 2)
  GENERATED ALWAYS AS (total_charges - total_paid) STORED;
```
