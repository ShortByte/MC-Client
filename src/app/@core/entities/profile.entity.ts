export interface Account {
  id?: string;
  uuid?: string;
  displayName: string;
  username: string;
  password?: string;
  type: 'mojang' | 'microsoft' | 'offline';
  hostname: string;
  port: number;
  version: string;
}

export const VERSIONS: string[] = [
  '1.16',
  '1.16.5',
  '1.17',
  '1.17.1',
  '1.18',
  '1.18.2',
  '1.19',
  '1.19.2'
];

export const TYPES: { label: string, value: string}[] = [{
  label: 'Mojang',
  value: 'mojang'
}, {
  label: 'Microsoft',
  value: 'microsoft'
}, {
  label: 'Offline',
  value: 'offline'
}];