export interface SemesterApiData {
  semesterId: string;
  term: 'FALL' | 'SPRING';
  year: number;
  startsOn: string;
  endsOn: string;
}
