export interface PixGerado {
  txid: string;
  payload: any;
  amount: number;
  infoAdicional?: string;
  brcode: string;
  qrBase64?: string;
  createdAt: number;
}
