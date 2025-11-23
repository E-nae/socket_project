import { useEffect, ReactNode } from 'react';
import { useUser } from 'context/UserContext';
import useSendPush from './WebPush';
import { useSocket } from 'context/SocketContext';
import RealTimeData from 'pages/dashboard/dataset/realTimeIncome';

interface SocketProcessProps {
  children: ReactNode;
}

interface SocketData {
  TY?: string;
  [key: string]: unknown;
}

export default function SocketProcess({ children }: SocketProcessProps): JSX.Element | null {
  const { socketPro, socketDev, socketData } = useSocket();
  const { UID } = useUser();
  const sendNotification = useSendPush();
  const { updateData, generateArr } = RealTimeData();

  useEffect(() => {
    /** 유저 아이디가 갱신되면(아이디로그인 시?) 소켓으로 로그인 알림  */
    if (UID) {
      if (process.env.IS_DEV) {
        socketDev?.emit('connect', UID, 'logged in', (res: unknown) => {
          console.log('socketDev Response: ', res);
        });
      }
      if (!process.env.IS_DEV) {
        socketPro?.emit('connect', UID, 'logged in', (res: unknown) => {
          console.log('socketPro Response', res);
        });
      }
      socketData?.emit('connect', UID, 'logged in', (res: unknown) => {
        console.log('socketData Response', res);
      });

      return () => {
        // 컴포넌트 언마운트 시 이벤트 핸들러 정리
        socketPro?.off('connect');
        socketDev?.off('connect');
        socketData?.off('connect');
      };
    }
  }, [UID, socketPro, socketDev, socketData]);

  useEffect(() => {
    if (process.env.IS_DEV) {
      socketDev?.on('data', (data: SocketData) => {
        console.log(data);
        sendNotification(data);
      });
    }
    if (!process.env.IS_DEV) {
      socketPro?.on('data', (data: SocketData) => {
        console.log(data);
        sendNotification(data);
      });
    }

    if (process.env.IS_DEV) {
      socketDev?.on('data', (data: SocketData) => {
        console.log(data);

        if (data?.TY === 'STATISTICS') {
          updateData(data);
          generateArr(data);
        }
      });
    }

    if (!process.env.IS_DEV) {
      socketPro?.on('data', (data: SocketData) => {
        console.log(data);
        if (data?.TY === 'STATISTICS') {
          updateData(data);
          generateArr(data);
        }
      });
    }

    socketData?.on('data', (data: SocketData) => {
      console.log(data);
    });
    
    return () => {
      // 컴포넌트 언마운트 시 이벤트 핸들러 정리
      socketPro?.off('data');
      socketDev?.off('data');
      socketData?.off('data');
    };
  }, [sendNotification, socketPro, socketDev, socketData, updateData, generateArr]);

  return (children as JSX.Element) || null;
}

