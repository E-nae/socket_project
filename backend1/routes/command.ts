import { Router, Request, Response } from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import userController from '../Controllers/user.controller';

dotenv.config();

const router = Router();
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

interface CommandBody {
  data1?: string;
}

router.post('/forwarding', async (req: Request<{}, {}, CommandBody>, res: Response): Promise<Response> => {
  try {
    const { data1 } = req.body;
    if (!data1) {
      console.error('data1 is required');
      return res.status(400).send({ ok: false, message: 'data1 is required' });
    }

    const SID = await userController.getUser(data1);

    return res.send({ ok: true, payload: SID });
  } catch (error) {
    console.log(error);
    return res.send({
      ok: false,
      message: error,
    });
  }
});

export default router;

