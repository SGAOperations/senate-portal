-- CreateTable
CREATE TABLE "VotingRecord" (
    "votingRecordId" TEXT NOT NULL,
    "votingEventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "updatedBy" TEXT,

    CONSTRAINT "VotingRecord_pkey" PRIMARY KEY ("votingRecordId")
);

-- AddForeignKey
ALTER TABLE "VotingRecord" ADD CONSTRAINT "VotingRecord_votingEventId_fkey" FOREIGN KEY ("votingEventId") REFERENCES "VotingEvent"("votingEventId") ON DELETE RESTRICT ON UPDATE CASCADE;
