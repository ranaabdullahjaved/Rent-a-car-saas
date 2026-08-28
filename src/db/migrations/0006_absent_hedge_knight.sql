CREATE TABLE "notification_rules" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tenant_id" bigint NOT NULL,
	"rule_key" text NOT NULL,
	"enabled" text DEFAULT 'true' NOT NULL,
	"offset_minutes" integer DEFAULT 0 NOT NULL,
	"channels" jsonb DEFAULT '["in_app"]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notification_rules" ADD CONSTRAINT "notification_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "notification_rules_tenant_rule_unique" ON "notification_rules" USING btree ("tenant_id","rule_key");--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_dedup_unique" ON "notifications" USING btree ("tenant_id","rule_key","source_type","source_id","channel","scheduled_for");