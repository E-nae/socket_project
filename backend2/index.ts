import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.production' });
import express, { Express, Request, Response, NextFunction } from 'express';
import path from 'path';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import https from 'https';
import session from 'express-session';
import connectMemoryStore from 'memorystore';
import { v4 as uuidv4 } from 'uuid';
import helmet from 'helmet';
import routes from './routes';
import initSocketIO from './utils/io';

const MemoryStore = connectMemoryStore(session);

const app: Express = express();

let sess = {
  genid: (req: Request) => {
    return uuidv4(); // use UUIDs for session IDs
  },
  secret: process.env.SECRET_KEY as string,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true, maxAge: 60000 },
  store: new MemoryStore({
    checkPeriod: 86400000, // prune expired entries every 24h
  }),
};
app.set('trust proxy', 1);
app.use(session(sess));

/** ssl 인증서 */
// privateKey, certificate, ca는 환경 변수나 다른 소스에서 가져와야 합니다
const privateKey: string = process.env.PRIVATE_KEY || '';
const certificate: string = process.env.CERTIFICATE || '';
const ca: string = process.env.CA || '';
const ca2: string = process.env.CA2 || '';

const credentials = {
  key: privateKey,
  cert: certificate,
  ca: [ca, ca2],
};

const httpsServer = https.createServer(credentials, app);

const socketIO = new SocketIOServer(httpsServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    withCredentials: true,
  },
  logger: (level: string, message: string) => {
    console.log(`[Socket.IO ${level}] ${message}`);
  },
  // SSL 인증서 무시 옵션
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
});

/***** 미들웨어 *****/
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  next();
});

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: {
      policy: 'same-origin-allow-popups',
    },
    referrerPolicy: {
      policy: ['no-referrer-when-downgrade'],
    },
    xssFilter: true,
  })
);
app.use(
  cors({
    origin: ['http://localhost:3000'],
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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static('uploads'));

/***** 라우팅 *****/
app.use('', routes);

/***** 프론트(리액트)와 연결 *****/
app.set('view engine', 'html');
app.set('views', __dirname + '/views');
app.use(
  '/',
  express.static(path.join(__dirname, 'views/dist'), {
    setHeaders: function (res: Response, filePath: string) {
      if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      }
    },
  })
);
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'views/dist/index.html'));
});

/***** Client-Side-Rendering Routing 허용 *****/
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'views/dist/index.html'));
});

initSocketIO(socketIO); //매개변수로 io를 넘겨줌

httpsServer.listen(3000, () => {
  console.log('listening on 3000');
});

export default socketIO;

