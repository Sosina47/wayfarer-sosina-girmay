import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/userService.js';

export class UserController {
  async getUsers(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await userService.listUsers();
      res.status(200).json({ users });
    } catch (err) {
      next(err);
    }
  }
}

export const userController = new UserController();
