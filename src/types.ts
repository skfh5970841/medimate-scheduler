export type Schedule = {
  id: string;
  supplement: string;
  day: string;
  time: string;
  timestamp: number;
  quantity: number;
  lastExecutedAt?: number; // Timestamp of the last execution
};
