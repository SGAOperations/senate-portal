-- CreateTable
CREATE TABLE "VotingEvent" (
    "votingEventId" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "voteType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "updatedBy" TEXT,

    CONSTRAINT "VotingEvent_pkey" PRIMARY KEY ("votingEventId")
);

-- AddForeignKey
ALTER TABLE "VotingEvent" ADD CONSTRAINT "VotingEvent_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("meetingId") ON DELETE RESTRICT ON UPDATE CASCADE;
