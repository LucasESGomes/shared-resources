-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "booking";

-- CreateEnum
CREATE TYPE "booking"."user_status" AS ENUM ('pending', 'approved', 'reproved');

-- CreateEnum
CREATE TYPE "booking"."user_is_active" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "booking"."user_role" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "booking"."resources_type" AS ENUM ('room', 'equipment');

-- CreateEnum
CREATE TYPE "booking"."reservation_status" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "booking"."resource_status" AS ENUM ('active', 'inactive');

-- CreateTable
CREATE TABLE "booking"."refresh_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking"."reservations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "resource_id" UUID,
    "start_time" TIMESTAMPTZ(6) NOT NULL,
    "end_time" TIMESTAMPTZ(6) NOT NULL,
    "status" "booking"."reservation_status" NOT NULL DEFAULT 'active',
    "quantity_reserved" INTEGER DEFAULT 1,
    "idempotency_key" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking"."resources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "type" "booking"."resources_type" NOT NULL DEFAULT 'room',
    "location" TEXT,
    "status" "booking"."resource_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking"."users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "booking"."user_role" NOT NULL DEFAULT 'user',
    "photo_url" TEXT,
    "status" "booking"."user_status" NOT NULL DEFAULT 'pending',
    "isactive" "booking"."user_is_active" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "booking"."refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "idx_refresh_tokens" ON "booking"."refresh_tokens"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "reservations_idempotency_key_key" ON "booking"."reservations"("idempotency_key");

-- CreateIndex
CREATE INDEX "idx_reservations_resource_time" ON "booking"."reservations"("resource_id", "start_time", "end_time");

-- CreateIndex
CREATE INDEX "idx_reservations_user" ON "booking"."reservations"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "booking"."users"("email");

-- AddForeignKey
ALTER TABLE "booking"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "booking"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "booking"."reservations" ADD CONSTRAINT "reservations_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "booking"."resources"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "booking"."reservations" ADD CONSTRAINT "reservations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "booking"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
