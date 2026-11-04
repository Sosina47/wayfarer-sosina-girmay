import { Router } from 'express';
import { userController } from '../controllers/userController.js';

export const usersRouter = Router();

usersRouter.get('/users', (req, res, next) => userController.getUsers(req, res, next));
