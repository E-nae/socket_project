import { Router, Request, Response } from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import userController from '../Controllers/user.controller';

dotenv.config();

const router = Router();
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

router.get('/search', (req: Request, res: Response): void => {
  res.render('search', { responseMessage: null });
});

router.post('/send-data', async (req: Request, res: Response): Promise<void> => {
  try {
    const userInput = req.body.userInput?.trim();
    const SID = await userController.getUser(userInput as string);

    const responseMessage = `${SID}`;
    res.render('search', { responseMessage });
  } catch (error) {
    console.log('error occured in search sid: ', error);
  }
});

export default router;

