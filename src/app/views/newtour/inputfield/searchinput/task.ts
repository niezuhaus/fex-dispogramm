// import { Messenger } from '../../messengers/main/messenger';

export interface Task {
  taskId: number;
  date: string;
  time: string;
  price: number;
  netPrice: boolean;
  clientId: number;
  messengerId: number;
  info: string;
}
