import React from 'react';
import fetch from '../../utils/fetch';
import { SetStateForce } from '../../utils/types';

interface IConverterContextProps {
  children: React.ReactChild;
}

interface IConverterContextValue {
  isConverting?: boolean;
  isComplete?: boolean;
  isCompressing?: boolean;
  key?: string | null;
  downloadStatus?: number;
  setIsConverting: SetStateForce<boolean>;
  setIsComplete: SetStateForce<boolean>;
  setKey: SetStateForce<string | null>;
  convert: (data: IConvert) => Promise<void>;
  download: (key: string) => Promise<void>;
  getStatus: () => Promise<number>;
}

const initialData: IConverterContextValue = {
  setIsConverting: () => null,
  setIsComplete: () => null,
  setKey: () => null,
  convert: async (id) => {
    return;
  },
  download: async (id) => {
    return;
  },
  getStatus: async () => 0,
};

const ConverterContext = React.createContext<IConverterContextValue>(
  initialData
);

interface IConvert {
  id?: string;
  file?: File;
}

const ConverterProvider: React.FunctionComponent<IConverterContextProps> = ({
  children,
}) => {
  const [isConverting, setIsConverting] = React.useState(false);
  const [isComplete, setIsComplete] = React.useState(false);
  const [isCompressing, setIsCompressing] = React.useState(false);
  const [downloadStatus, setDownloadStatus] = React.useState(0);
  const [key, setKey] = React.useState<string | null>(null);

  const convert = async ({ id, file }: IConvert) => {
    setIsConverting(true);
    let formData;

    let res: any;
    if (file) {
      formData = new FormData();
      formData.append('document', 'pldt-application');
      formData.append('file', file);
      res = await fetch.upload({
        url: `${import.meta.env.VITE_APP_API}/d/convert`,
        formData,
      });
    } else if (id) {
      res = await fetch.post<{ key: string }>({
        url: `${import.meta.env.VITE_APP_API}/d/convert`,
        data: {
          document: 'pldt-application',
          id,
        },
      });
    }

    setIsConverting(!!res.success);
    console.log(res);
    console.log(res.data?.key);
    if (res.data?.key) {
      setKey(res.data?.key);
    }
  };

  const download = async (id: string) => {
    if (key) {
      const res = await fetch.download({
        url: `${import.meta.env.VITE_APP_API}/d/download?key=${key}`,
        filename: key,
        downloadCallback: (status) => {
          setDownloadStatus(status);
        },
      });

      console.log(res);
    }
  };

  const getStatus = async () => {
    const res = await fetch.post<{
      status: number;
      process: 'converting' | 'complete' | 'compressing';
    }>({
      url: `${import.meta.env.VITE_APP_API}/d/status`,
      data: {
        key,
      },
    });

    console.log(res.data);
    if (res?.data?.process === 'complete') {
      setIsConverting(false);
      setIsComplete(true);
      setIsCompressing(false);
    } else if (res?.data?.process === 'compressing') {
      setIsConverting(false);
      setIsComplete(false);
      setIsCompressing(true);
    }

    return res.data?.status || 0;
  };

  return (
    <ConverterContext.Provider
      value={{
        isConverting,
        isComplete,
        isCompressing,
        setIsConverting,
        setIsComplete,
        getStatus,
        convert,
        key,
        setKey,
        download,
        downloadStatus,
      }}
    >
      {children}
    </ConverterContext.Provider>
  );
};

const useConverterContext = () => {
  const context: IConverterContextValue = React.useContext(ConverterContext);
  if (context === undefined) {
    throw new Error('Context must be used within a ConverterProvider');
  }
  return context;
};

export { ConverterProvider, useConverterContext };
