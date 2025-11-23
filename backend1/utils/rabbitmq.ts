import dotenv from 'dotenv';
import amqplib, { Connection, Channel } from 'amqplib';
import { types, amqpConfig } from '../config/rabbitmq_config';

dotenv.config();

interface Payload {
  TY?: string;
  DATA?: {
    USR?: string[];
    MSG?: unknown;
  };
}

/***** 메세지 전달 함수 *****/
export const sendMsg = async (payload: Payload): Promise<void> => {
  const type = payload?.TY;
  const UIDs = payload?.DATA?.USR;
  const message = payload?.DATA?.MSG;
  
  if (!type || !UIDs || !message) {
    throw new Error('Invalid payload');
  }

  const connection: Connection = await amqplib.connect(amqpConfig(type));
  const channel: Channel = await connection.createChannel();

  UIDs.forEach(async (id: string) => {
    if (type === 'STATISTICS') {
      try {
        // Fanout Exchange 선언
        const exchangeName = `${process.env[`RMQ_VHOST_${type}`]}-${
          process.env.RMQ_BROADCAST_ID
        }`;

        await channel.assertExchange(exchangeName, 'fanout', {
          durable: false,
        });

        // 메시지 발행
        channel.publish(
          exchangeName,
          '',
          Buffer.from(JSON.stringify(message)),
          {
            expiration: '18000000',
          }
        );

        console.log(' [x] Sent %s', message);

        // 연결 종료
        setTimeout(() => {
          connection.close();
        }, 500);
      } catch (error) {
        console.error('statistics queue 전송 실패: ', error);
      }
    } else {
      try {
        const queue = `${process.env[`RMQ_VHOST_${type}`]}-${id}`;
        console.log('queue: ', queue);

        await channel.assertQueue(queue, { durable: true });

        const ArrayBuffer = JSON.stringify(message);
        channel.sendToQueue(queue, Buffer.from(ArrayBuffer));
      } catch (error) {
        console.log('queue 전송 실패: ', error);
      }
    }
  });
};

