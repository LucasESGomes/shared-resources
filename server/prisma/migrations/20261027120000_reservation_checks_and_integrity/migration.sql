-- Backfill NULLs so the NOT NULL changes below don't fail on existing rows
UPDATE "booking"."refresh_tokens" SET "revoked" = false WHERE "revoked" IS NULL;
UPDATE "booking"."refresh_tokens" SET "created_at" = CURRENT_TIMESTAMP WHERE "created_at" IS NULL;
UPDATE "booking"."reservations" SET "quantity_reserved" = 1 WHERE "quantity_reserved" IS NULL;
UPDATE "booking"."reservations" SET "created_at" = CURRENT_TIMESTAMP WHERE "created_at" IS NULL;
UPDATE "booking"."reservations" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;
UPDATE "booking"."resources" SET "created_at" = CURRENT_TIMESTAMP WHERE "created_at" IS NULL;
UPDATE "booking"."resources" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;
UPDATE "booking"."users" SET "created_at" = CURRENT_TIMESTAMP WHERE "created_at" IS NULL;
UPDATE "booking"."users" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;

-- DropForeignKey
ALTER TABLE "booking"."refresh_tokens" DROP CONSTRAINT "refresh_tokens_user_id_fkey";

-- DropIndex (redundant: token_hash already has a UNIQUE index)
DROP INDEX "booking"."idx_refresh_tokens";

-- AlterTable
ALTER TABLE "booking"."refresh_tokens" ALTER COLUMN "revoked" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "booking"."reservations" ALTER COLUMN "user_id" SET NOT NULL,
ALTER COLUMN "resource_id" SET NOT NULL,
ALTER COLUMN "quantity_reserved" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "booking"."resources" ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "booking"."users" ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL;

-- CreateIndex
CREATE INDEX "idx_refresh_tokens_user" ON "booking"."refresh_tokens"("user_id");

-- AddForeignKey
ALTER TABLE "booking"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "booking"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Check constraints (not representable in schema.prisma, managed here)
ALTER TABLE "booking"."reservations" ADD CONSTRAINT "reservations_time_range_check" CHECK ("end_time" > "start_time");
ALTER TABLE "booking"."reservations" ADD CONSTRAINT "reservations_quantity_reserved_check" CHECK ("quantity_reserved" > 0);
ALTER TABLE "booking"."resources" ADD CONSTRAINT "resources_quantity_check" CHECK ("quantity" >= 0);
