import { Router, Request, Response } from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import userController from '../Controllers/user.controller';

dotenv.config();

const router = Router();
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

interface TransmissionBody {
  DEV_TOKEN?: string;
  DATA?: {
    action?: string;
    [key: string]: unknown;
  };
}

router.post('/forwarding', async (req: Request<{}, {}, TransmissionBody>, res: Response): Promise<Response> => {
  try {
    const payloaded = req.body;
    const pubInfo = payloaded?.DEV_TOKEN;
    
    if (!payloaded) {
      throw new Error('pubtelphone information are required');
    }

    console.log('수신메시지: ');
    console.log(pubInfo);
    
    const SID = await userController.getUser(pubInfo as string);
    if (!SID) {
      console.error('소켓 아이디를 찾을 수 없음');
      return res.send({ ok: false, message: '소켓 아이디를 찾을 수 없음' });
    }

    const NOW = new Date().toLocaleString();
    const io = req.app.get('io');
    await io.to(SID).emit(payloaded.DATA?.action as string, payloaded.DATA, NOW);
    console.log(`발신 정보: ${SID}, ${NOW}`);

    return res.send('200 ok');
  } catch (error) {
    console.error(error);
    return res.send({
      ok: false,
      message: '소켓 데이터 전송 실패',
      error,
    });
  }
});

export default router;

