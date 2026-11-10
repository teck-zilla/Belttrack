-- AlterTable
ALTER TABLE "User" ADD COLUMN "email_verified" BOOLEAN NOT NULL DEFAULT false;

-- Update existing demo/headcoach user to verified
UPDATE "User" SET "email_verified" = true WHERE "email" = 'headcoach@kaizenbjj.org';

