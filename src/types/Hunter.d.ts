export type HunterConfig = {
  endesa: HuntConfig;
  agua: HuntConfig;
};

export type HuntConfig = {
  username: string;
  password: string;
  invoiceNameFormat?: string;
};
