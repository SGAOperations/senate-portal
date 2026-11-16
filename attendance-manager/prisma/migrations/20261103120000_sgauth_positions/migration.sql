-- Sign-in moves from Supabase Auth to SGAuth, and authority moves from the
-- portal's own roles (EBOARD/MEMBER) to SGAuth positions (src/lib/permissions.ts).
--
-- Portal users are keyed by their SGAuth user id. Existing rows are linked on
-- first SGAuth sign-in by email (src/server/auth/sgauth.ts), so the old Supabase ids
-- are no longer needed. The password column was never used for Supabase
-- sign-in. positionKeys records each user's SGAuth positions as of their last
-- sign-in, to know who is on the roster.
DROP INDEX IF EXISTS "User_supabaseAuthId_key";

ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_roleId_fkey";

ALTER TABLE "User"
DROP COLUMN "supabaseAuthId",
DROP COLUMN "password",
DROP COLUMN "roleId",
ADD COLUMN "sgauthUserId" TEXT,
ADD COLUMN "positionKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "positionsSyncedAt" TIMESTAMP(3);

DROP TABLE "Role";

DROP TYPE "RoleType";

-- CreateIndex
CREATE UNIQUE INDEX "User_sgauthUserId_key" ON "User"("sgauthUserId");
