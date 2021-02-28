export type HunterConfig = {
  endesa: HuntConfig;
  agua: HuntConfig;
  downloadDir: string;
};

export type HuntConfig = {
  username: string;
  password: string;
  invoiceNameFormat?: string;
};
