CREATE TABLE "file_conversions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_file_id" text NOT NULL,
	"source_file_version" integer DEFAULT 1 NOT NULL,
	"name" text NOT NULL,
	"bucket" text,
	"object_key" text,
	"file_name" text,
	"mime_type" text NOT NULL,
	"size" integer,
	"etag" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"error" text,
	"retry_count" integer DEFAULT 0,
	"max_retries" integer DEFAULT 3,
	"parameters" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "document_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "file_conversions" ADD CONSTRAINT "file_conversions_source_file_id_files_id_fk" FOREIGN KEY ("source_file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "file_conversions_source_idx" ON "file_conversions" USING btree ("source_file_id");--> statement-breakpoint
CREATE INDEX "file_conversions_status_idx" ON "file_conversions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "file_conversions_unique_idx" ON "file_conversions" USING btree ("source_file_id","name","source_file_version");--> statement-breakpoint
CREATE INDEX "file_conversions_location_idx" ON "file_conversions" USING btree ("bucket","object_key");