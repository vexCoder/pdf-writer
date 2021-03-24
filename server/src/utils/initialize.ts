import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import path from 'path';
import fs from 'fs-extra';
import low from 'lowdb';
import FileAsync from 'lowdb/adapters/FileAsync';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import copy from 'copyfiles';
import schedule from 'node-schedule';
import { checkIfFileFolderExists, getQueues } from './helper';
import paths from './paths';

export const setDefaultTimezone = (area: string = 'Asia/Manila') => {
  dayjs.extend(utc);
  dayjs.extend(timezone);

  dayjs.tz.setDefault(area);
};

export const createFolders = async () => {
  const folders = [
    'temp',
    'db',
    'exports',
    'templates',
    'configs',
    'output',
    'uploads',
  ];

  const checkFolders: { exists: boolean; path: string }[] = await Promise.all(
    folders.map((v) =>
      checkIfFileFolderExists(path.join(__dirname, '..', v)).then((o) => ({
        exists: o,
        path: path.join(__dirname, '..', v),
      }))
    )
  );

  checkFolders.forEach((v) => {
    if (!v.exists) fs.mkdir(v.path);
  });
};

export const loadDb = async () => {
  const adapter = new FileAsync(path.join(__dirname, '..', 'db', 'db.json'));
  const db = await low(adapter);
  return db;
};

export const defaultDb = async () => {
  const db = await loadDb();
  const temp = db.get('signed').value();
  if (!temp) {
    db.defaults({ configs: [], users: [], queue: [] }).write();
    db.set('signed', 1).write();
  }
};

export const loadCredentials = async (): Promise<OAuth2Client> => {
  const authBuffer = await fs.readFile(
    path.join(__dirname, '..', 'credentials.json'),
    'utf8'
  );
  const credentials = JSON.parse(authBuffer);
  const { client_secret, client_id, redirect_uris } = credentials.web;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  return oAuth2Client;
};

export const copyConfigs = async () => {
  const dir = path.join(__dirname, '..', '..', 'configs\\*.json');
  const outDir = path.join(__dirname, '..', 'configs');
  return new Promise<void>((res) =>
    copy([dir, outDir], { all: true, up: true }, () => {
      res();
    })
  );
};

export const copyTemplates = async () => {
  const dir = path.join(__dirname, '..', '..', 'documents\\*.pdf');
  const outDir = path.join(__dirname, '..', 'templates');
  return new Promise<void>((res) =>
    copy([dir, outDir], { all: true, up: true }, () => {
      res();
    })
  );
};

export const loadCrons = async () => {
  // '00 */1 * * *'
  const cron = schedule.scheduleJob('00 */1 * * *', async () => {
    const db = await loadDb();
    const { expiring, notExpiring } = await getQueues();

    const exportDir = await fs.readdir(paths.EXPORTS);
    const outDir = await fs.readdir(paths.OUTPUT);
    const tempDir = await fs.readdir(paths.TEMP);

    try {
      await Promise.all(
        exportDir
          .filter((v) => {
            let check = false;
            expiring.forEach((el: any) => {
              check = check || v.indexOf(el.id) !== -1;
            });
            return check;
          })
          .map(async (v) => {
            await fs.unlink(path.join(paths.EXPORTS, v));
          })
      );

      await Promise.all(
        outDir
          .filter((v) => {
            const queue = db.get('queue').value();
            const fileName = v.replace('.zip', '');
            console.log(fileName);
            const index = queue.findIndex(
              (o: any) => fileName.indexOf(o.id) !== -1
            );
            console.log(index, queue);
            return index === -1;
          })
          .map(async (v) => {
            await fs.unlink(path.join(paths.OUTPUT, v));
          })
      );

      await Promise.all(
        tempDir
          .filter((v) => {
            let check = false;
            expiring.forEach((el: any) => {
              check = check || v.indexOf(el.id) !== -1;
            });
            return check;
          })
          .map(async (v) => {
            await fs.unlink(path.join(paths.TEMP, v));
          })
      );
    } catch (error) {
      console.log(error);
    }

    db.set('queue', notExpiring).write();
    console.log(`Deleted: `);
    console.log(expiring.map((v: any) => v.id));
    console.log(
      dayjs(cron.nextInvocation()).format('MMMM DD, YYYY hh:mm:ss a')
    );
  });

  console.log(dayjs(cron.nextInvocation()).format('MMMM DD, YYYY hh:mm:ss a'));
};
