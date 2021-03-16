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
}: Omit<IRequest, 'method'> & { filename: string }) => {
  try {
    const options: RequestInit = {
      method: 'GET',
      mode: 'cors',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    await fetch(url, options).then(function (t) {
      return t.blob().then((b) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.setAttribute('download', `${filename}.zip`);
        a.click();
      });
    });

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
  }: Omit<IRequest, 'method'> & { filename: string }) =>
    download({ url, filename }),
  get: <T>({ url, data }: Omit<IRequest, 'method'>) =>
    request<T>({ url, data, method: 'GET' }),
  post: <T>({ url, data }: Omit<IRequest, 'method'>) =>
    request<T>({ url, data, method: 'POST' }),
};
