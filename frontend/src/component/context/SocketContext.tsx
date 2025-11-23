import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useUser } from 'context/UserContext';
import useSendPush from '../controller/WebPush';

interface SocketContextType {
  socketPro: Socket | null;
  socketDev: Socket | null;
  socketData?: Socket | null;
  socket1006?: Socket | null;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: ReactNode;
}

interface SocketData {
  [key: string]: unknown;
}

const SocketProvider = ({ children }: SocketProviderProps): JSX.Element => {
  const [socketPro, setSocketPro] = useState<Socket | null>(null);
  const [socketDev, setSocketDev] = useState<Socket | null>(null);
  const [socketData, setSocketData] = useState<Socket | null>(null);
  const { UID } = useUser();
  const sendNotification = useSendPush();

  useEffect(() => {
    const socket = io(process.env.REACT_APP_DOMAIN2 as string, {
      transports: ['websocket'],
      upgrade: false
    });
    const socket_dev = io(process.env.REACT_APP_DOMAIN1 as string, {
      transports: ['websocket'],
      upgrade: false
    });
    setSocketPro(socket);
    setSocketDev(socket_dev);

    return () => {
      socketPro?.disconnect();
      socketDev?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (UID) {
      if (process.env.IS_DEV) {
        /** 유저 아이디가 갱신되면(아이디로그인 시?) 소켓으로 로그인 알림  */
        socketDev?.emit('login', UID, 'logged in', (res: unknown) => {
          console.log('socketDev Response: ', res);
        });

        socketDev?.on('reconnect', (message: unknown) => {
          console.log('socketDev Response: ', message);

          socketDev?.emit('reconnect', UID, (res: unknown) => {
            console.log('socketDev Response: ', res);
          });
        });
      }
      if (!process.env.IS_DEV) {
        socketPro?.emit('login', UID, 'logged in', (res: unknown) => {
          console.log('socketPro Response', res);
        });

        socketPro?.on('reconnect', (message: unknown) => {
          console.log('socketPro Response: ', message);

          socketPro?.emit('reconnect', UID, (res: unknown) => {
            console.log('socketPro Response: ', res);
          });
        });
      }
    }

    if (process.env.IS_DEV) {
      socketDev?.on('notification', (data: SocketData) => {
        console.log(data);
        sendNotification(data);
      });
    }

    if (!process.env.IS_DEV) {
      socketPro?.on('notification', (data: SocketData) => {
        console.log(data);
        sendNotification(data);
      });
    }

    return () => {
      // 컴포넌트 언마운트 시 이벤트 핸들러 정리
      if (socketPro?.connected) {
        socketPro?.off('login');

        socketPro?.off('reconnect');
        socketPro?.off('notification');
      }

      if (socketDev?.connected) {
        socketDev?.off('login');
        socketDev?.off('reconnect');
        socketDev?.off('notification');
      }
    };
  }, [UID, socketPro, socketDev, sendNotification]);

  const value: SocketContextType = {
    socketPro,
    socketDev,
    socketData,
    socket1006: undefined
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export default SocketProvider;

