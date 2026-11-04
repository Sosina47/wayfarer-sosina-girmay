export interface ActingUser {
  id: number;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: ActingUser;
    }
  }
}
