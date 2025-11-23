import dotenv from 'dotenv';
import pm2io from '@pm2/io';
import { EventEmitter } from 'events';
import userController from '../Controllers/user.controller';
import { listenMsg, broadcastingListen } from './rabbitmq';
import { Server as SocketIOServer, Socket } from 'socket.io';

dotenv.config();

// 전역적으로 최대 리스너 수를 설정(MaxListenersExceededWarning 에러 방지)
EventEmitter.defaultMaxListeners = 500;
const emitter = new EventEmitter();
emitter.removeAllListeners();

/** @PM2/io 초기화 */
pm2io.init({
  metrics: {
    network: false, // 네트워크 모니터링 활성화
    eventLoop: true,
    http: true, // HTTP 모니터링 활성화
    errors: true, // 에러 모니터링 활성화
    runtime: true,
  },
  tracing: {
    enabled: true,
    actions: true,
    profiling: true,
  },
  catchExceptions: false,
});

export default async (io: SocketIOServer): Promise<void> => {
  //최대 리스너 수 제한
  io.removeAllListeners();
  io.setMaxListeners(100);

  //매개변수 io
  try {

    /** 전체 연결 해제 시 실행 */
    pm2io.action('disconnect_all', (cb: (result: { success: boolean; message: string }) => void) => {
      io.sockets.sockets.forEach((socket: Socket) => {
        socket.disconnect(true);
      });
      cb({ success: true, message: 'All sockets disconnected' });
    });

    // 실시간 소켓 연결 수를 메트릭으로 추가
    const connections = pm2io.metric({
      name: 'Socket Connections',
    });
    // 메트릭 값 업데이트 함수
    const updateConnectionCount = (): void => {
      connections.set(Object.keys(io.sockets.sockets).length);
    };

    /************************************** 소켓.IO 서버 생성 *******************************/
    io.on('connection', async (socket: Socket) => {
      // id = 전체 유저 대상, socket = 특정 유저 대상
      let channel: unknown;
      let connection: unknown;
      updateConnectionCount();
      socket.setMaxListeners(20); //소켓 리스너 제한
      console.log(
        'A user connected to Socket.IO, current listeners: ',
        io.listenerCount('connection')
      );
      /** io 리스너 제한 수 초과하면 리스너 제거 */
      if (io.listeners('connection').length >= io.getMaxListeners()) {
        io.removeListener('connection', io.listeners('connection')[0] as () => void);
      }

      /************************ 에러 추적: 특정 클라이언트에게 공지 ************************/
      socket.on('error', (error: Error) => {
        pm2io.notifyError(error, {
          custom: {
            socketId: socket.id,
          },
        });
      });
      /** 소켓 리스너 제한 수 초과하면 리스너 제거 */
      if (socket.listeners('error').length >= socket.getMaxListeners()) {
        socket.removeListener('error');
      }


      socket.on('test', (msg: unknown) => {
        console.log('Received from Server B:', msg);
        socket.emit('response', 'Hello from Server A!');
      });

      socket.on('login', async (userID: string, msg: string, cb: (response: { ok: boolean; user?: string | null; message?: unknown }) => void) => {
        try {
          console.log('user logged in: ', userID, ': ', msg);
          const user = await userController.saveUser(userID, socket.id);
          console.log('user: ');
          console.log(user);

          /** 로그인하면 rabbitmq exchange에 queue 자동 바인딩처리 (메인 대시보드 매출 통계 차트 데이터 받기) */
          await broadcastingListen(socket, userID);

          const message = {
            user: `Hello ${userID}`,
            date: new Date(),
            system: `${userID} login comfirmed`,
          };
          socket.emit('message', message);
          cb({ ok: true, user: user || undefined });
        } catch (error) {
          cb({ ok: false, message: error });
        }
      });

      const reconnectMsg = "a user reconnected, server need the user's id";
      socket.emit('reconnect', reconnectMsg);
      socket.on('reconnect', async (userID: string, cb: (response: { ok: boolean; user?: string | null; message?: unknown }) => void) => {
        try {
          console.log('user relogged in: ', userID);
          const user = await userController.saveUser(userID, socket.id);
          console.log('user: ');
          console.log(user);
          cb({ ok: true, user: user || undefined });
        } catch (error) {
          cb({ ok: false, message: error });
        }
      });

      await listenMsg(socket);

      /***************** 특정 클라이언트 연결 해제 시 모든 리스너 연결 해제 *****************/
      socket.on('disconnect', () => {
        updateConnectionCount();
        console.log('disconnected: ', socket.id);
        socket.removeAllListeners();
      });
      socket.on('close', () => {
        socket.removeAllListeners();
      });
      /********************* WebSocket이 닫혔을 때 rabbitmq 연결 종료 *********************/
      io.on('close', async () => {
        console.log('Client disconnected:');
        if (channel) await (channel as { close: () => Promise<void> }).close();
        if (connection) await (connection as { close: () => Promise<void> }).close();
      });
    });
  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error);
  }
};

