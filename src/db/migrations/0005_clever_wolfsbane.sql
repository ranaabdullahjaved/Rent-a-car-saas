CREATE TABLE "investor_agreements" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tenant_id" bigint NOT NULL,
	"investor_id" bigint NOT NULL,
	"vehicle_id" bigint NOT NULL,
	"agreement_type" text DEFAULT 'revenue_share' NOT NULL,
	"share_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"fixed_monthly_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"settlement_cycle" text DEFAULT 'monthly' NOT NULL,
	"investor_absorbs_maintenance" boolean DEFAULT false NOT NULL,
	"investor_absorbs_damage" boolean DEFAULT false NOT NULL,
	"investor_absorbs_challans" boolean DEFAULT false NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"effective_range" daterange,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "investor_agreements" ADD CONSTRAINT "investor_agreements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investor_agreements" ADD CONSTRAINT "investor_agreements_investor_id_investors_id_fk" FOREIGN KEY ("investor_id") REFERENCES "public"."investors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investor_agreements" ADD CONSTRAINT "investor_agreements_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "investor_agreements_vehicle_idx" ON "investor_agreements" USING btree ("tenant_id","vehicle_id");--> statement-breakpoint
CREATE INDEX "investor_agreements_investor_idx" ON "investor_agreements" USING btree ("tenant_id","investor_id");--> statement-breakpoint
-- Drizzle cannot express a trigger or an EXCLUDE constraint, so both are
-- appended by hand — the same arrangement as bookings.block_range.
CREATE OR REPLACE FUNCTION fn_set_agreement_range() RETURNS trigger AS $$
BEGIN
  NEW.effective_range := daterange(NEW.effective_from, NEW.effective_to, '[)');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER trg_agreement_range
  BEFORE INSERT OR UPDATE OF effective_from, effective_to
  ON investor_agreements
  FOR EACH ROW EXECUTE FUNCTION fn_set_agreement_range();--> statement-breakpoint
-- One agreement per vehicle at any given date. Two overlapping agreements
-- would make a payout ambiguous, and the database is the only place that can
-- guarantee it under concurrent edits.
ALTER TABLE investor_agreements
  ADD CONSTRAINT no_overlapping_agreement
  EXCLUDE USING gist (
    tenant_id WITH =,
    vehicle_id WITH =,
    effective_range WITH &&
  ) WHERE (deleted_at IS NULL);
