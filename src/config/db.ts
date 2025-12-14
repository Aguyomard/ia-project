import { v4 as uuidv4 } from 'uuid';

export const pay = async (cart: any, userId: string): Promise<string> => {
  const promise = new Promise<string>((resolve, reject) => {
    setTimeout(() => {
      resolve('success');
    }, 3000);
  });

  return promise;
};

export const createOrder = async (
  cart: any,
  userId: string
): Promise<string> => {
  const id = uuidv4();

  const promise = new Promise<string>((resolve, reject) => {
    setTimeout(() => {
      resolve(id);
    }, 3000);
  });

  return promise;
};

export const sendEmail = async (
  orderId: string,
  userId: string,
  emailResult: any
): Promise<string> => {
  const promise = new Promise<string>((resolve, reject) => {
    setTimeout(() => {
      resolve('success');
      // reject(new Error("Email failed"))
    }, 3000);
  });

  return promise;
};

export const logAnalytics = async (
  data: any,
  message: string
): Promise<string> => {
  const promise = new Promise<string>((resolve, reject) => {
    setTimeout(() => {
      console.log('Analytics log created: ', message);
      resolve('success');
    }, 1000);
  });

  return promise;
};
