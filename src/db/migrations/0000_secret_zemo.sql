CREATE TABLE "tenants" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"owner_name" text,
	"phone" text,
	"email" text,
	"city" text,
	"country_code" text DEFAULT 'PK' NOT NULL,
	"timezone" text DEFAULT 'Asia/Karachi' NOT NULL,
	"currency" text DEFAULT 'PKR' NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"status" text DEFAULT 'trial' NOT NULL,
	"trial_ends_at" timestamp with time zone,
	"default_buffer_minutes" integer DEFAULT 0 NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" bigint NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"status" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"inviter_id" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" bigint NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"logo" text,
	"created_at" timestamp with time zone NOT NULL,
	"metadata" text,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" bigint NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tenant_id" bigint,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'staff' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tenant_id" bigint NOT NULL,
	"registration_no" text NOT NULL,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"variant" text,
	"model_year" integer,
	"colour" text,
	"chassis_no" text,
	"engine_no" text,
	"transmission" text,
	"fuel_type" text,
	"engine_cc" integer,
	"seating_capacity" integer,
	"tank_capacity_litres" numeric(6, 2),
	"ownership_type" text DEFAULT 'company' NOT NULL,
	"investor_id" bigint,
	"purchase_date" date,
	"purchase_price" numeric(14, 2),
	"is_financed" boolean DEFAULT false NOT NULL,
	"financier_name" text,
	"monthly_instalment" numeric(14, 2),
	"instalments_total" integer,
	"instalments_paid" integer DEFAULT 0 NOT NULL,
	"current_odometer" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"tracker_installed" boolean DEFAULT false NOT NULL,
	"tracker_provider" text,
	"tracker_device_id" text,
	"primary_photo_path" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tenant_id" bigint NOT NULL,
	"full_name" text NOT NULL,
	"father_name" text,
	"cnic" text,
	"phone" text NOT NULL,
	"alt_phone" text,
	"whatsapp" text,
	"email" text,
	"address" text,
	"city" text,
	"license_no" text,
	"license_expiry" date,
	"cnic_front_path" text,
	"cnic_back_path" text,
	"license_path" text,
	"reference_name" text,
	"reference_phone" text,
	"customer_type" text DEFAULT 'individual' NOT NULL,
	"risk_rating" text DEFAULT 'normal' NOT NULL,
	"blacklist_reason" text,
	"total_bookings" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "investors" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tenant_id" bigint NOT NULL,
	"name" text NOT NULL,
	"cnic" text,
	"phone" text,
	"email" text,
	"address" text,
	"bank_name" text,
	"bank_account_title" text,
	"bank_account_no" text,
	"iban" text,
	"settlement_cycle" text DEFAULT 'monthly' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tenant_id" bigint NOT NULL,
	"name" text NOT NULL,
	"company_name" text,
	"phone" text NOT NULL,
	"alt_phone" text,
	"city" text,
	"address" text,
	"vendor_type" text DEFAULT 'both' NOT NULL,
	"trust_rating" integer,
	"credit_limit" numeric(14, 2) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tenant_id" bigint NOT NULL,
	"name" text NOT NULL,
	"father_name" text,
	"cnic" text,
	"phone" text NOT NULL,
	"address" text,
	"employee_type" text NOT NULL,
	"designation" text,
	"joined_on" date,
	"left_on" date,
	"salary_type" text DEFAULT 'monthly' NOT NULL,
	"base_salary" numeric(14, 2) DEFAULT '0' NOT NULL,
	"per_trip_allowance" numeric(14, 2) DEFAULT '0' NOT NULL,
	"license_no" text,
	"license_expiry" date,
	"license_path" text,
	"cnic_path" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "booking_charges" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tenant_id" bigint NOT NULL,
	"booking_id" bigint NOT NULL,
	"charge_type" text NOT NULL,
	"description" text,
	"quantity" numeric(10, 2) DEFAULT '1' NOT NULL,
	"unit_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"is_waived" boolean DEFAULT false NOT NULL,
	"waived_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tenant_id" bigint NOT NULL,
	"booking_no" text NOT NULL,
	"customer_id" bigint NOT NULL,
	"vehicle_id" bigint,
	"driver_id" bigint,
	"booking_type" text DEFAULT 'self_drive' NOT NULL,
	"source" text DEFAULT 'direct' NOT NULL,
	"outsource_direction" text,
	"vendor_id" bigint,
	"vendor_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"actual_start_at" timestamp with time zone,
	"actual_end_at" timestamp with time zone,
	"buffer_minutes" integer DEFAULT 0 NOT NULL,
	"block_range" "tstzrange",
	"daily_rate" numeric(14, 2) DEFAULT '0' NOT NULL,
	"driver_charge_per_day" numeric(14, 2) DEFAULT '0' NOT NULL,
	"allowed_km_per_day" integer,
	"extra_km_rate" numeric(14, 2) DEFAULT '0' NOT NULL,
	"late_penalty_per_hour" numeric(14, 2) DEFAULT '0' NOT NULL,
	"late_grace_minutes" integer DEFAULT 60 NOT NULL,
	"quoted_days" numeric(6, 2) DEFAULT '1' NOT NULL,
	"security_deposit" numeric(14, 2) DEFAULT '0' NOT NULL,
	"deposit_refunded" numeric(14, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"estimated_total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_charges" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_paid" numeric(14, 2) DEFAULT '0' NOT NULL,
	"balance_due" numeric(14, 2),
	"status" text DEFAULT 'tentative' NOT NULL,
	"payment_status" text DEFAULT 'unpaid' NOT NULL,
	"cancellation_reason" text,
	"cancelled_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "handover_media" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tenant_id" bigint NOT NULL,
	"handover_id" bigint NOT NULL,
	"media_type" text NOT NULL,
	"angle" text NOT NULL,
	"file_path" text NOT NULL,
	"thumbnail_path" text,
	"mime_type" text,
	"size_bytes" bigint,
	"duration_secs" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_handovers" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tenant_id" bigint NOT NULL,
	"booking_id" bigint NOT NULL,
	"vehicle_id" bigint NOT NULL,
	"handover_type" text NOT NULL,
	"performed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"odometer" integer NOT NULL,
	"fuel_level_eighths" integer,
	"fuel_level_litres" numeric(6, 2),
	"exterior_condition" text,
	"interior_condition" text,
	"accessories" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"checklist" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"location" text,
	"customer_signature_path" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "damage_records" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tenant_id" bigint NOT NULL,
	"vehicle_id" bigint NOT NULL,
	"booking_id" bigint,
	"reported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"incident_at" timestamp with time zone,
	"severity" text DEFAULT 'minor' NOT NULL,
	"at_fault" text DEFAULT 'unknown' NOT NULL,
	"description" text NOT NULL,
	"location" text,
	"police_report_no" text,
	"estimated_cost" numeric(14, 2) DEFAULT '0' NOT NULL,
	"actual_repair_cost" numeric(14, 2) DEFAULT '0' NOT NULL,
	"amount_charged_to_customer" numeric(14, 2) DEFAULT '0' NOT NULL,
	"amount_recovered" numeric(14, 2) DEFAULT '0' NOT NULL,
	"insurance_claimed" boolean DEFAULT false NOT NULL,
	"insurance_claim_no" text,
	"insurance_amount_received" numeric(14, 2) DEFAULT '0' NOT NULL,
	"downtime_days" numeric(6, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"repaired_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "traffic_challans" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tenant_id" bigint NOT NULL,
	"vehicle_id" bigint NOT NULL,
	"booking_id" bigint,
	"challan_no" text,
	"violation_type" text,
	"violation_at" timestamp with time zone NOT NULL,
	"location" text,
	"amount" numeric(14, 2) NOT NULL,
	"late_surcharge" numeric(14, 2) DEFAULT '0' NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"liability" text DEFAULT 'customer' NOT NULL,
	"amount_recovered" numeric(14, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp with time zone,
	"evidence_path" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fuel_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tenant_id" bigint NOT NULL,
	"vehicle_id" bigint NOT NULL,
	"booking_id" bigint,
	"litres" numeric(8, 2) NOT NULL,
	"rate_per_litre" numeric(10, 2) NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"odometer" integer,
	"station_name" text,
	"filled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_by" text DEFAULT 'company' NOT NULL,
	"is_reimbursed" boolean DEFAULT false NOT NULL,
	"receipt_path" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_records" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tenant_id" bigint NOT NULL,
	"vehicle_id" bigint NOT NULL,
	"schedule_id" bigint,
	"service_type" text NOT NULL,
	"maintenance_kind" text DEFAULT 'scheduled' NOT NULL,
	"workshop_name" text,
	"odometer" integer,
	"performed_at" date NOT NULL,
	"labour_cost" numeric(14, 2) DEFAULT '0' NOT NULL,
	"parts_cost" numeric(14, 2) DEFAULT '0' NOT NULL,
	"other_cost" numeric(14, 2) DEFAULT '0' NOT NULL,
	"born_by" text DEFAULT 'company' NOT NULL,
	"investor_share" numeric(14, 2) DEFAULT '0' NOT NULL,
	"downtime_days" numeric(6, 2) DEFAULT '0' NOT NULL,
	"invoice_path" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "maintenance_schedules" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tenant_id" bigint NOT NULL,
	"vehicle_id" bigint NOT NULL,
	"service_type" text NOT NULL,
	"interval_km" integer,
	"interval_days" integer,
	"last_service_km" integer,
	"last_service_at" date,
	"next_due_km" integer,
	"next_due_at" date,
	"alert_before_km" integer DEFAULT 500 NOT NULL,
	"alert_before_days" integer DEFAULT 7 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tenant_id" bigint NOT NULL,
	"vehicle_id" bigint,
	"employee_id" bigint,
	"booking_id" bigint,
	"vendor_id" bigint,
	"category" text NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"expense_date" date NOT NULL,
	"payment_method" text DEFAULT 'cash' NOT NULL,
	"paid_to" text,
	"description" text,
	"receipt_path" text,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "investor_payouts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tenant_id" bigint NOT NULL,
	"investor_id" bigint NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"gross_revenue" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_deductions" numeric(14, 2) DEFAULT '0' NOT NULL,
	"investor_share" numeric(14, 2) DEFAULT '0' NOT NULL,
	"company_share" numeric(14, 2) DEFAULT '0' NOT NULL,
	"net_payable" numeric(14, 2) DEFAULT '0' NOT NULL,
	"amount_paid" numeric(14, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"statement_pdf_path" text,
	"paid_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_promises" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tenant_id" bigint NOT NULL,
	"booking_id" bigint,
	"customer_id" bigint NOT NULL,
	"promised_amount" numeric(14, 2) NOT NULL,
	"promised_date" date NOT NULL,
	"amount_collected" numeric(14, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"followup_count" integer DEFAULT 0 NOT NULL,
	"last_followup_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tenant_id" bigint NOT NULL,
	"direction" text NOT NULL,
	"party_type" text NOT NULL,
	"party_id" bigint,
	"booking_id" bigint,
	"amount" numeric(14, 2) NOT NULL,
	"method" text DEFAULT 'cash' NOT NULL,
	"reference_no" text,
	"purpose" text DEFAULT 'booking' NOT NULL,
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL,
	"receipt_path" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tenant_id" bigint NOT NULL,
	"entry_date" date NOT NULL,
	"direction" text NOT NULL,
	"category" text NOT NULL,
	"subcategory" text,
	"amount" numeric(14, 2) NOT NULL,
	"vehicle_id" bigint,
	"booking_id" bigint,
	"investor_id" bigint,
	"vendor_id" bigint,
	"customer_id" bigint,
	"employee_id" bigint,
	"source_type" text NOT NULL,
	"source_id" bigint NOT NULL,
	"is_cash" boolean DEFAULT true NOT NULL,
	"is_reversal" boolean DEFAULT false NOT NULL,
	"reverses_id" bigint,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tenant_id" bigint NOT NULL,
	"rule_key" text NOT NULL,
	"source_type" text NOT NULL,
	"source_id" bigint NOT NULL,
	"recipient_type" text NOT NULL,
	"recipient_id" bigint NOT NULL,
	"recipient_address" text,
	"channel" text NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"title" text,
	"body" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"provider_message_id" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"monthly_price" numeric(14, 2) NOT NULL,
	"yearly_price" numeric(14, 2),
	"currency" text DEFAULT 'PKR' NOT NULL,
	"max_vehicles" integer,
	"max_users" integer,
	"features" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plans_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tenant_id" bigint NOT NULL,
	"plan_id" bigint NOT NULL,
	"billing_cycle" text DEFAULT 'monthly' NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"starts_at" date NOT NULL,
	"current_period_end" date NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"cancelled_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_inviter_id_users_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investors" ADD CONSTRAINT "investors_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_charges" ADD CONSTRAINT "booking_charges_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_charges" ADD CONSTRAINT "booking_charges_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_driver_id_employees_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handover_media" ADD CONSTRAINT "handover_media_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handover_media" ADD CONSTRAINT "handover_media_handover_id_vehicle_handovers_id_fk" FOREIGN KEY ("handover_id") REFERENCES "public"."vehicle_handovers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_handovers" ADD CONSTRAINT "vehicle_handovers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_handovers" ADD CONSTRAINT "vehicle_handovers_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_handovers" ADD CONSTRAINT "vehicle_handovers_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "damage_records" ADD CONSTRAINT "damage_records_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "damage_records" ADD CONSTRAINT "damage_records_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "damage_records" ADD CONSTRAINT "damage_records_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traffic_challans" ADD CONSTRAINT "traffic_challans_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traffic_challans" ADD CONSTRAINT "traffic_challans_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traffic_challans" ADD CONSTRAINT "traffic_challans_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fuel_logs" ADD CONSTRAINT "fuel_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fuel_logs" ADD CONSTRAINT "fuel_logs_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_schedule_id_maintenance_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."maintenance_schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investor_payouts" ADD CONSTRAINT "investor_payouts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investor_payouts" ADD CONSTRAINT "investor_payouts_investor_id_investors_id_fk" FOREIGN KEY ("investor_id") REFERENCES "public"."investors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_promises" ADD CONSTRAINT "payment_promises_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_promises" ADD CONSTRAINT "payment_promises_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
CREATE OR REPLACE FUNCTION fn_set_booking_block_range()
RETURNS trigger AS $$
BEGIN
  NEW.block_range := tstzrange(
    NEW.start_at,
    NEW.end_at + make_interval(mins => COALESCE(NEW.buffer_minutes, 0)),
    '[)'
  );
  RETURN NEW;
END $$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER trg_booking_block_range
  BEFORE INSERT OR UPDATE OF start_at, end_at, buffer_minutes ON bookings
  FOR EACH ROW EXECUTE FUNCTION fn_set_booking_block_range();--> statement-breakpoint
ALTER TABLE bookings
  ADD CONSTRAINT no_double_booking
  EXCLUDE USING gist (
    tenant_id   WITH =,
    vehicle_id  WITH =,
    block_range WITH &&
  ) WHERE (vehicle_id IS NOT NULL AND status IN ('confirmed','dispatched','active'));--> statement-breakpoint
-- balance_due already exists as a plain column from the CREATE TABLE above
-- (it's an ordinary field in the Drizzle schema, not a generated one) —
-- Postgres can't ALTER an existing column into a generated column, so it
-- has to be dropped and re-added.
ALTER TABLE bookings DROP COLUMN balance_due;--> statement-breakpoint
ALTER TABLE bookings
  ADD COLUMN balance_due numeric(14, 2)
  GENERATED ALWAYS AS (total_charges - total_paid) STORED;
