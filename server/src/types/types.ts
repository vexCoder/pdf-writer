import { Request } from 'express';

export type RequestSession = Request & { session: any };

export interface IConfig {
  key: string;
  imageRows: string;
  newPage: string;
  plot: {
    key: string;
    s: string;
    keyValues?: string[];
    formatValue?: string;
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
  alignment?: 'Center' | 'Left' | 'Right';
  type?:
    | 'text'
    | 'dropdown'
    | 'options'
    | 'radio'
    | 'attachment'
    | 'checkbox'
    | 'attachment';
}
