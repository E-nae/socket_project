import dotenv from 'dotenv';
dotenv.config();
import { amqpConfig } from '../config/rabbitmq_config';
import { EventEmitter } from 'events';
import pm2io from '@pm2/io';
import userController from '../Controllers/user.controller';
import path from 'path';
import fs from 'fs';
import { Server as SocketIOServer, Socket } from 'socket.io';

// 전역적으로 최대 리스너 수를 설정(MaxListenersExceededWarning 에러 방지)
EventEmitter.defaultMaxListeners = 1000;
const emitter = new EventEmitter();
emitter.setMaxListeners(Infinity);

pm2io.init({
  metrics: {
    eventLoop: true,
    http: true,
    network: true,
  },
});

interface ResponseData {
  DATA: unknown;
}

const initSocketIO = (io: SocketIOServer, SID?: string): SocketIOServer => {
  // 실시간 소켓 연결 수를 메트릭으로 추가
  const connections = pm2io.metric({
    name: 'Socket Connections',
  });
  // 메트릭 값 업데이트 함수
  const updateConnectionCount = (): void => {
    connections.set(Object.keys(io.sockets.sockets).length);
  };

  const logSocketState = (socket: Socket, event: string): void => {
    console.log(`\n[${event}] ${new Date().toISOString()}`);
    console.log(`Socket ID: ${socket.id}`);
    console.log(`In adapter.sids: ${io.of('/').adapter.sids.has(socket.id)}`);
    console.log(`Socket connected: ${socket.connected}`);
    console.log(`Handshake issued at: ${socket.handshake.issued}`);
    console.log(`Current rooms: ${Array.from(socket.rooms || []).join(', ')}`);
  };

  const readResponses = async (socket: Socket): Promise<unknown> => {
    const paths = path.join(__dirname, 'jsons/response.json');
    let responses: unknown = 'fail';
    fs.readFile(paths, 'utf8', async (err: NodeJS.ErrnoException | null, data: string) => {
      if (err) {
        console.error(err);
        return;
      }

      // JSON 문자열을 JavaScript 객체로 변환
      const jsonData: ResponseData = JSON.parse(data);
      responses = jsonData.DATA;
      console.log('responses111: ');
      console.log(responses);
      await socket.emit('response', responses);
      return responses;
    });
    return responses;
  };

  try {
    /**************************************** 소켓.IO 서버 생성 **************************************/
    io.setMaxListeners(1000); // 서버 전체 리스너 제한 설정

    io.on('connection', (socket: Socket) => {
      console.log('client connected', socket.id);
      updateConnectionCount();
      console.log(
        'A user connected to Socket.IO, current listeners: ',
        io.listenerCount('connection')
      );

      socket.on('Register', async (EInfo: string) => {
        try {
          console.log('장비 정보: ', EInfo);
          await userController.saveEquip(EInfo, socket.id);
          
          io.to(socket.id).emit(
            'response',
            `Registration successful ${socket.id}`
          );

          console.log('registered ok: ', socket.id);
        } catch (error) {
          console.error('error occured ', error);
          socket.emit('response', { message: 'Internal server error' });
        }
      });

      socket.on('transmission', async ({ pubphone, commands }: { pubphone: string; commands: unknown }, cb: (response: { ok: boolean; payload?: string; message?: unknown }) => void) => {
        try {
          const SID = await userController.getUser(pubphone);
          if (!SID) {
            throw new Error('There is not SID');
          }

          const NOW = new Date().toLocaleString();
          console.log(
            'Is the socket connected?: ',
            io.sockets.sockets.has(SID)
          );

          if (io.sockets.sockets.has(SID)) {
            await io.to(SID).emit('invite_room', commands, NOW, pubphone);
            console.log('transmission data: ');
            console.log(SID, ' ', commands, ' ', NOW);

            cb({ ok: true, payload: SID });
          } else {
            console.log('소켓이 연결되어있지 않음');
          }
        } catch (error) {
          console.log('error: ', error);
          cb({ ok: false, message: error });
        }
      });

      socket.on('Result', async (EInfo: unknown) => {
        try {
          console.log('수신 완료: ', EInfo);
        } catch (error) {
          console.error('error occured ', error);
        }
      });

      /************************************ 소켓 재연결 시 *************************************/
      socket.on('reconnect', () => {
        console.log('재연결된 socket.id:', socket.id);
      });
      socket.on('reconnect_attempt', (attempt: number) => {
        logSocketState(socket, `Reconnect Attempt ${attempt}`);
      });

      /************************************ 소켓 연결 해제 시 *************************************/
      socket.on('disconnect', (reason: string) => {
        updateConnectionCount();
        console.log(`Client disconnected: ${socket.id}`);
        logSocketState(socket, `Disconnect - ${reason}`);

        socket.removeAllListeners();
      });
      socket.on('close', () => {
        socket.removeAllListeners();
      });
      /************************************** 소켓 에러 시 ***************************************/
      socket.on('error', (err: Error) => {
        console.error(`Socket error: ${err.message}`);
      });
      /************************ 소켓 리스너 제한 수 초과하면 리스너 제거 ************************/
      if (socket.listeners('error').length >= socket.getMaxListeners()) {
        socket.removeListener('error');
      }
      /************************ WebSocket이 닫혔을 때 rabbitmq 연결 종료 ************************/
      io.on('close', async () => {
        console.log('io disconnected:');
        // channel과 connections 변수가 정의되지 않았으므로 주석 처리
        // if (channel) await channel.close();
        // if (connections) await connections.close();
      });
    });
    return io;
  } catch (error) {
    console.log(error);
    return io;
  }
};

export default initSocketIO;

