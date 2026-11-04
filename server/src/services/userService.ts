import { prisma } from '../lib/prisma.js';

export interface UserSummary {
  id: number;
  name: string;
}

export class UserService {
  /**
   * Retrieves all users ordered by ID ascending.
   */
  async listUsers(): Promise<UserSummary[]> {
    return prisma.user.findMany({
      select: {
        id: true,
        name: true
      },
      orderBy: {
        id: 'asc'
      }
    });
  }
}

export const userService = new UserService();
