export enum VoteType {
  rollCall = 'ROLL_CALL',
  secretBallot = 'SECRET_BALLOT',
  unanimousConsent = 'UNANIMOUS_CONSENT',
  placard = 'PLACARD',
}

export function getVoteTypeLabel(voteType: VoteType): string {
  return {
    [VoteType.rollCall]: 'Roll Call',
    [VoteType.secretBallot]: 'Secret Ballot',
    [VoteType.unanimousConsent]: 'Unanimous Consent',
    [VoteType.placard]: 'Placard',
  }[voteType];
}

export const yesNoOptions = {
  yes: 'Yes',
  no: 'No',
  abstain: 'Abstain',
};
