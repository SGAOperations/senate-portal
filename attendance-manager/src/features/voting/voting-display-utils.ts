// labels for vote result strings
export function formatResultLabel(result: string): string {
  switch (result) {
    case 'YES':
      return 'Yes';
    case 'NO':
      return 'No';
    case 'ABSTAIN':
      return 'Abstain';
    default:
      return result.charAt(0) + result.slice(1).toLowerCase();
  }
}
