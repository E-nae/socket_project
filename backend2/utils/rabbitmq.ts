import dotenv from 'dotenv';
import amqplib, { Connection, Channel } from 'amqplib';
import { types, amqpConfig } from '../config/rabbitmq_config';
import userController from '../Controllers/user.controller';
import { Socket } from 'socket.io';

dotenv.config();

interface Payload {
  TY?: string;
  DATA?: {
    USR?: string[];
    MSG?: unknown;
  };
}

/***** 메세지 소비 함수 *****/
export const listenMsg = async (socket: Socket): Promise<void> => {
  types?.forEach(async (type: string) => {
    const connection: Connection = await amqplib.connect(amqpConfig(type));
    const channel: Channel = await connection.createChannel();
    const UID = await userController.checkUser(socket.id);

    if (!UID) {
      console.log('failed to find UID matching sid');
      return;
    }
    if (UID) {
      const user_q = `${process.env[`RMQ_VH_${type}`]}-${UID}`;
      console.log('user_q: ', user_q);

      await channel.assertQueue(user_q, { durable: true });

      // RabbitMQ 큐에서 메시지 수신
      await channel.consume(
        user_q,
        async (msg) => {
          if (!msg) return;
          try {
            const payload: Payload = JSON.parse(msg.content.toString());
            switch (payload?.TY) {
              case 'STATISTICS':
              default:
                socket.emit('data', JSON.parse(msg.content.toString()));
                break;
              case 'NOTI':
                socket.emit('notification', JSON.parse(msg.content.toString()));
                break;
            }
            channel.ack(msg); //메시지 확인
          } catch (error) {
            console.log('Error processing message: ', error);
            channel.nack(msg);
          }
        },
        { noAck: false }
      );
    }
  });
};

export const broadcastingListen = async (socket: Socket, UID: string): Promise<void> => {
  try {
    const type = types[1];
    const connection: Connection = await amqplib.connect(amqpConfig(type));
    const channel: Channel = await connection.createChannel();

    if (!UID) {
      console.log('failed to find UID matching sid');
      return;
    }
    const exchangeName = `${process.env[`RMQ_VH_${type}`]}-${
      process.env.RMQ_BROADCAST_ID
    }`;
    const queueNM = `${process.env.RABBITMQ_DEFAULT_QUEUE}-${UID}`;
    const routingKey = process.env.RABBITMQ_ROUTING_KEY;
    await channel.assertExchange(exchangeName, 'fanout', { durable: false });
    await channel.assertQueue(queueNM, { exclusive: false });
    await channel.bindQueue(queueNM, exchangeName, routingKey || '');
    console.log(`Queue "${queueNM}" is bound to Exchange "${exchangeName}"`);

    channel.consume(
      queueNM,
      (msg) => {
        if (msg) {
          socket.emit('data', JSON.parse(msg.content.toString()));
        }
      },
      { noAck: true }
    );
  } catch (error) {
    console.error(error);
  }
};

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
    const queue = `${process.env.RABBITMQ_DEFAULT_QUEUE}-${id}`;

    await channel.assertQueue(queue, { durable: true });

    const ArrayBuffer = JSON.stringify(message);
    channel.sendToQueue(queue, Buffer.from(ArrayBuffer));
  });
};

