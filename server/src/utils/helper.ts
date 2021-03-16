import axios from 'axios';
import { Response } from 'express';
import fs, { createWriteStream } from 'fs-extra';
import * as stream from 'stream';
import { promisify } from 'util';
import { RequestSession } from '../types/types';

export const checkIfFileFolderExists = async (
  path: string
): Promise<boolean> => {
  try {
    await fs.access(path);
    return true;
  } catch (error) {
    return false;
  }
};

const finished = promisify(stream.finished);

export async function downloadFile(
  fileUrl: string,
  outputLocationPath: string
): Promise<any> {
  const writer = createWriteStream(outputLocationPath);
  return axios({
    method: 'get',
    url: fileUrl,
    responseType: 'stream',
  }).then(async (response) => {
    response.data.pipe(writer);
    return finished(writer); // this is a Promise
  });
}

interface IClearCookie {
  req: RequestSession;
  res: Response;
}

export async function clearCookie({ req, res }: IClearCookie): Promise<void> {
  return new Promise((resolve) =>
    req.session.destroy((err: any) => {
      res.clearCookie('pdfid');
      if (err) {
        console.log(err);
        resolve();
        return;
      }
      resolve();
    })
  );
}

export const sleep = async (timeout: number) => {
  await new Promise((resolve) => {
    setTimeout(() => {
      resolve(null);
    }, timeout || 0);
  });
};
