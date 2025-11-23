import dotenv from 'dotenv';
import express, { Express } from 'express';
import cors from 'cors';
import https from 'https';
import bodyParser from 'body-parser';
import { Server as SocketIOServer } from 'socket.io';
import initSocketIO from './utils/io';

dotenv.config();

const app: Express = express();
app.use(bodyParser.urlencoded({ extended: true })); 
app.use(bodyParser.json());

/** ssl 인증서 */
// privateKey, certificate, ca는 환경 변수나 다른 소스에서 가져와야 합니다
const privateKey: string = process.env.PRIVATE_KEY || '';
const certificate: string = process.env.CERTIFICATE || '';
const ca: string = process.env.CA || '';

const credentials = {
  key: privateKey,
  cert: certificate,
  ca: ca,
};

const httpsServer = https.createServer(credentials, app);

app.set('trust proxy', 1);

/******************* 소켓I/O 연결결 *********************/
const socketIO = new SocketIOServer(httpsServer, {
  cors: {
    origin: '*',
    withCredentials: true,
  },
  pingInterval: 5000, 
  pingTimeout: 50000, 
  logger: (level: string, message: string) => {
    console.log(`[Socket.IO ${level}] ${message}`);
  },
  debug: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});
app.set('io', socketIO);

/***** 미들웨어 *****/
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'X-Access-Token',
      'Authorization',
    ],
  })
);

// post 요청 시 값을 객체로 바꿔줌
app.use(express.urlencoded({ extended: true }));

/***** 라우팅 *****/
import msgQueueRouter from './routes/msgQueue';
import searchSidRouter from './routes/searchSid';
import transmissionRouter from './routes/transmission';

app.use('/msgQueue', msgQueueRouter);
app.use('/search-sid', searchSidRouter);
app.use('/transmission', transmissionRouter);

/******************* 소켓 I/O 모듈 ***************/
initSocketIO(socketIO); 

httpsServer.listen(3001, function () {
  console.log('listening on 3001');
});

export default socketIO;

