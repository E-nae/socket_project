import redis from 'redis';

const client = redis.createClient();

client.on('error', (err: Error) => {
  console.log('Redis Client Error', err);
});

client.connect();

interface UserController {
  saveUser: (userID: string, sid: string) => Promise<string | null>;
  saveEquip: (EInfo: string, sid: string) => Promise<void>;
  checkUser: (sid: string) => Promise<string | null>;
  getUser: (EInfo: string) => Promise<string | null>;
}

const userController: UserController = {
  saveUser: async (userID: string, sid: string): Promise<string | null> => {
    try {
      console.log('sid in save user: ', sid);

      await client.hSet('socket_uid', userID, sid);
      await client.hSet('socket_sid', sid, userID);

      const user = await client.hGet('socket_sid', sid);
      console.log('user matching sid: ', user);

      return user;
    } catch (error) {
      if (error instanceof Error) {
        console.log(error.message);
      }
      return null;
    }
  },

  saveEquip: async (EInfo: string, sid: string): Promise<void> => {
    try {
      console.log('sid in save user: ', sid);

      await client.hSet('SID_', EInfo, sid);
    } catch (error) {
      if (error instanceof Error) {
        console.log(error.message);
      }
    }
  },

  checkUser: async (sid: string): Promise<string | null> => {
    try {
      console.log('sid in check user: ', sid);
      const UID = await client.hGet('socket_sid', sid);
      if (!UID) throw new Error('user not found');

      return UID;
    } catch (error) {
      if (error instanceof Error) {
        console.log(error.message);
      }
      return null;
    }
  },

  getUser: async (EInfo: string): Promise<string | null> => {
    try {
      console.log('EInfo in check user: ', EInfo);
      const SID = await client.hGet('SID_', EInfo);
      if (!SID) throw new Error('user not found');

      return SID;
    } catch (error) {
      if (error instanceof Error) {
        console.log(error.message);
      }
      return null;
    }
  }
};

export default userController;

