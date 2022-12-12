export interface Log {
  id: string;
  type: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  createdAt: number;
}

export interface Message {
  id: string;
  username: string;
  message: string;
  jsonMessage: string;
  createdAt: number;
}

export interface Status {
  id: string;
  status: 'ONLINE' | 'OFFLINE';
  startedAt: number;
}


export interface InstanceEvent {
  id: string;
  type: 'START' | 'STOP' | 'DETAILS' | 'SEND_MESSAGE' | 'OPEN_VIEWER';
  data: Object | any;
}