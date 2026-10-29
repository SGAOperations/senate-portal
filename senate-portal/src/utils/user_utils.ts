export interface UserId {
  id: string;
}

export interface UserEmailPass {
  email: string;
  password: string;
}

export function isUserId(obj: any): obj is UserId {
  return 'id' in obj;
}

export function isUserEmailPass(obj: any): obj is UserEmailPass {
  return 'email' in obj && 'pass' in obj;
}
