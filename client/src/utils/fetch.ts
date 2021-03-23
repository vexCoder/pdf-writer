import axios, { AxiosRequestConfig } from 'axios';
import fileDownload from 'js-file-download';
interface IRequest {
  url: string;
  data?: Record<string, unknown>;
  formData?: FormData;
  method: string;
  isDownload?: boolean;
}

const request = async <T>({
  url,
  data,
  method,
}: IRequest): Promise<{ success: boolean; error: any; data: T | null }> => {
  try {
    const options: RequestInit = {
      method,
      mode: 'cors',
      credentials: 'include',
      ...(method === 'POST' && {
        body: JSON.stringify(data),
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const json = await fetch(url, options).then((res) => res.json());

    return {
      success: json.success,
      error: json.error || null,
      data: json.data as T,
    };
  } catch (error) {
    return {
      success: false,
      error: error,
      data: null,
    };
  }
};

const download = async ({
  url,
  filename,
  downloadCallback,
}: Omit<IRequest, 'method'> & {
  filename: string;
  downloadCallback: (status: number) => void;
}) => {
  try {
    const options: AxiosRequestConfig = {
      url,
      method: 'GET',
      responseType: 'blob',
      withCredentials: true,
      onDownloadProgress: (evt) => {
        const percentCompleted = Math.round((evt.loaded * 100) / evt.total);
        downloadCallback(percentCompleted);
      },
      headers: {
        'Content-Type': 'application/json',
      },
    };

    await axios(options).then(function (t: any) {
      fileDownload(t.data, `${filename}.zip`);
    });

    // return t.blob().then((b: any) => {
    //   const a = document.createElement('a');
    //   a.href = URL.createObjectURL(b);
    //   a.setAttribute('download', `${filename}.zip`);
    //   a.click();
    // });

    return {
      success: true,
      error: null,
      data: null,
    };
  } catch (error) {
    return {
      success: false,
      error: error,
      data: null,
    };
  }
};

const upload = async ({
  url,
  formData,
}: Omit<IRequest, 'method'> & { formData: FormData }) => {
  try {
    const options: RequestInit = {
      method: 'POST',
      mode: 'cors',
      credentials: 'include',
      body: formData,
    };

    const json = await fetch(url, options).then((res) => res.json());

    return {
      success: json.success,
      error: json.error || null,
      data: json.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error,
      data: null,
    };
  }
};

export default {
  upload: ({
    url,
    formData,
  }: Omit<IRequest, 'method'> & { formData: FormData }) =>
    upload({ url, formData }),
  download: ({
    url,
    filename,
    downloadCallback,
  }: Omit<IRequest, 'method'> & {
    filename: string;
    downloadCallback: (status: number) => void;
  }) => download({ url, filename, downloadCallback }),
  get: <T>({ url, data }: Omit<IRequest, 'method'>) =>
    request<T>({ url, data, method: 'GET' }),
  post: <T>({ url, data }: Omit<IRequest, 'method'>) =>
    request<T>({ url, data, method: 'POST' }),
};
