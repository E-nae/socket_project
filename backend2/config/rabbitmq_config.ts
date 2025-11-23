import dotenv from 'dotenv';

dotenv.config();

export const types: string[] = ['MONITTORING', 'STATISTICS', 'NOTI'];

interface AmqpConfig {
  protocol: string;
  hostname: string | undefined;
  port: string | undefined;
  username: string | undefined;
  password: string | undefined;
  vhost: string | undefined;
}

export const amqpConfig = (type: string): AmqpConfig => {
  const uName = process.env[`RMQ_USER_${type}`];
  const pwd = process.env[`RMQ_PW_${type}`];
  const vhost = process.env[`RMQ_VH_${type}`];
  
  return {
    protocol: 'amqps',
    hostname: process.env.RABBITMQ_HOST,
    port: process.env.RABBITMQ_PORT,
    username: uName,
    password: pwd,
    vhost: vhost,
  };
};

