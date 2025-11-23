import { Router, Request, Response } from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { sendMsg } from '../utils/rabbitmq';

dotenv.config();

const router = Router();
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

router.post('/outgoing', async (req: Request, res: Response): Promise<Response> => {
  try {
    const payload = req?.body;

    if (!payload) {
      return res.status(400).send({ ok: false, message: '데이터 없음' });
    }

    await sendMsg(payload);

    return res.send({ ok: true, message: '메시지 전송 완료' });
  } catch (error) {
    console.log('메시지 전송 실패: ', error);
    return res.send({ ok: false, message: error });
  }
});

export default router;

