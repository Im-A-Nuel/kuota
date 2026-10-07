CREATE TABLE "burns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"signature" text NOT NULL,
	"launch_id" uuid NOT NULL,
	"amount" bigint NOT NULL,
	"slot" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "burns_signature_unique" UNIQUE("signature")
);
--> statement-breakpoint
CREATE TABLE "launches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mint" text NOT NULL,
	"config" text NOT NULL,
	"pool" text NOT NULL,
	"damm_pool" text,
	"provider_pubkey" text NOT NULL,
	"name" text NOT NULL,
	"symbol" text NOT NULL,
	"endpoint_url" text NOT NULL,
	"usdc_price" bigint NOT NULL,
	"committed_calls" bigint NOT NULL,
	"migration_threshold" bigint NOT NULL,
	"migration_fee_bps" integer NOT NULL,
	"status" text DEFAULT 'curve' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"graduated_at" timestamp with time zone,
	CONSTRAINT "launches_mint_unique" UNIQUE("mint"),
	CONSTRAINT "launches_status_check" CHECK ("launches"."status" in ('curve','graduated'))
);
--> statement-breakpoint
CREATE TABLE "pending_launches" (
	"mint" text PRIMARY KEY NOT NULL,
	"config" text NOT NULL,
	"pool" text NOT NULL,
	"provider_pubkey" text NOT NULL,
	"payload" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"signature" text NOT NULL,
	"launch_id" uuid NOT NULL,
	"payer" text NOT NULL,
	"asset" text NOT NULL,
	"amount" bigint NOT NULL,
	"source" text NOT NULL,
	"slot" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settlements_signature_unique" UNIQUE("signature"),
	CONSTRAINT "settlements_asset_check" CHECK ("settlements"."asset" in ('kuota','usdc')),
	CONSTRAINT "settlements_source_check" CHECK ("settlements"."source" in ('chain','middleware'))
);
--> statement-breakpoint
CREATE TABLE "snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"launch_id" uuid NOT NULL,
	"price_kuota" bigint NOT NULL,
	"discount_bps" integer NOT NULL,
	"curve_progress_bps" integer NOT NULL,
	"holders" integer NOT NULL,
	"burned" bigint NOT NULL,
	"calls_paid" bigint NOT NULL,
	"taken_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_labels" (
	"pubkey" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"is_team" boolean NOT NULL
);
--> statement-breakpoint
ALTER TABLE "burns" ADD CONSTRAINT "burns_launch_id_launches_id_fk" FOREIGN KEY ("launch_id") REFERENCES "public"."launches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_launch_id_launches_id_fk" FOREIGN KEY ("launch_id") REFERENCES "public"."launches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshots" ADD CONSTRAINT "snapshots_launch_id_launches_id_fk" FOREIGN KEY ("launch_id") REFERENCES "public"."launches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "burns_launch_idx" ON "burns" USING btree ("launch_id","created_at");--> statement-breakpoint
CREATE INDEX "settlements_launch_idx" ON "settlements" USING btree ("launch_id","created_at");--> statement-breakpoint
CREATE INDEX "snapshots_launch_idx" ON "snapshots" USING btree ("launch_id","taken_at");