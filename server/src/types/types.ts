import { Request } from 'express';

export type RequestSession = Request & { session: any };

export interface IConfig {
  key: string;
  imageRows: string;
  plot: {
    key: string;
    s: string;
    fixedValue?: string;
    format?: string;
    type?: 'date' | string;
    optionValues?: string[];
    loc: IConfigLocation[];
  }[];
}

export interface IConfigLocation {
  key: string;
  page?: string;
  row?: string;
  type?:
    | 'text'
    | 'dropdown'
    | 'options'
    | 'radio'
    | 'attachment'
    | 'checkbox'
    | 'attachment';
}