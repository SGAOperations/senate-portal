-- AlterTable
ALTER TABLE "VotingEvent" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "options" TEXT[] DEFAULT ARRAY[]::TEXT[];
