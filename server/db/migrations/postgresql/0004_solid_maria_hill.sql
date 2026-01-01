ALTER TABLE "companies" ADD COLUMN "_update_token" text;--> statement-breakpoint
ALTER TABLE "company_invites" ADD COLUMN "_update_token" text;--> statement-breakpoint
ALTER TABLE "company_members" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "company_members" ADD COLUMN "_update_token" text;--> statement-breakpoint
ALTER TABLE "data_table_columns" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "data_table_columns" ADD COLUMN "_update_token" text;--> statement-breakpoint
ALTER TABLE "data_tables" ADD COLUMN "_update_token" text;--> statement-breakpoint
ALTER TABLE "table_migrations" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "table_migrations" ADD COLUMN "_update_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "_update_token" text;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "_update_token" text;--> statement-breakpoint
ALTER TABLE "company_members" ADD CONSTRAINT "company_members_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_table_columns" ADD CONSTRAINT "data_table_columns_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_migrations" ADD CONSTRAINT "table_migrations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;