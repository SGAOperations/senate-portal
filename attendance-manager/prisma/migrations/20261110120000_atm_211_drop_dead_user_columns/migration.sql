-- ATM-211: User table cleanup
--
-- Drops User columns that nothing reads:
--   password   always null, Supabase handles passwords
--   updatedAt  written by Prisma, never read
--
-- Also removes leftovers of the reverted ATM-147 migrations. They only exist on
-- the Preview database (production never got them), so every statement below is
-- guarded and does nothing on production.
--
-- User.roleId and User.deletedAt stay for now. They move to the Membership
-- table in a later step, because removing them changes every role check.

ALTER TABLE "User" DROP COLUMN "password";
ALTER TABLE "User" DROP COLUMN "updatedAt";

-- ATM-147 leftovers (Preview only)
ALTER TABLE "User" DROP COLUMN IF EXISTS "roleType";
ALTER TABLE "User" DROP COLUMN IF EXISTS "isVotingMember";

-- ATM-147 also added SUPER_ADMIN, ADMIN and SENATOR to "RoleType". Postgres
-- can't remove enum values, so if extra values exist, rebuild the type with
-- only EBOARD and MEMBER. If a Role row uses one of the extra values, stop
-- instead of guessing which real role it should become.
DO $$
DECLARE
  extra_labels text[];
  rows_using_extra integer;
BEGIN
  SELECT array_agg(e.enumlabel::text)
    INTO extra_labels
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
   WHERE t.typname = 'RoleType'
     AND e.enumlabel NOT IN ('EBOARD', 'MEMBER');

  IF extra_labels IS NULL THEN
    RETURN; -- production: nothing to clean up
  END IF;

  SELECT count(*) INTO rows_using_extra
    FROM "Role"
   WHERE "roleType"::text = ANY (extra_labels);

  IF rows_using_extra > 0 THEN
    RAISE EXCEPTION
      'ATM-211: % Role row(s) use RoleType values % that are being removed. Reassign them to EBOARD or MEMBER, then re-run.',
      rows_using_extra, extra_labels;
  END IF;

  ALTER TYPE "RoleType" RENAME TO "RoleType_old";
  CREATE TYPE "RoleType" AS ENUM ('EBOARD', 'MEMBER');
  ALTER TABLE "Role"
    ALTER COLUMN "roleType" TYPE "RoleType"
    USING ("roleType"::text::"RoleType");
  DROP TYPE "RoleType_old";
END $$;
