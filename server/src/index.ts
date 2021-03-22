import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import _ from 'lodash';
import lowdb from 'lowdb';
import session from 'express-session';
import FileSync from 'lowdb/adapters/FileSync';
import fs from 'fs-extra';
import router from './routes';
import {
  createFolders,
  setDefaultTimezone,
  loadDb,
  defaultDb,
  copyTemplates,
  copyConfigs,
  loadCrons,
} from './utils/initialize';

dotenv.config({
  path: path.join(__dirname, '..', `.env.${process.env.NODE_ENV}`),
});

const main = async () => {
  setDefaultTimezone();
  await createFolders();
  await loadDb();
  await defaultDb();
  await copyConfigs();
  await copyTemplates();
  await loadCrons();
  const app = express();
  const _port = parseInt(process.env.PORT, 10);

  // (origin, callback) => {
  //   const whitelist: string[] = ['*'];
  //   callback(null, _.includes(whitelist, origin));
  // }
  const pathname = path.join(__dirname, 'session.txt');
  const LowdbStore = require('lowdb-session-store')(session);
  let checkExist = false;
  try {
    await fs.access(pathname);
    checkExist = true;
  } catch (error) {
    checkExist = false;
  }

  let adapter = null;
  let sessionDb: any = null;
  try {
    adapter = new FileSync(pathname, { defaultValue: { sessions: [] } });
    sessionDb = lowdb(adapter);
  } catch (error) {
    if (checkExist) fs.unlinkSync(pathname);
    adapter = new FileSync(pathname, { defaultValue: { sessions: [] } });
    sessionDb = lowdb(adapter);
  }

  app.set('trust proxy', 1);

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept'
    );
    return next();
  });

  app.use(
    cors({
      credentials: true,
      origin(origin, callback) {
        const whitelist = [...process.env.CORS_ORIGIN.split(',')];
        return callback(null, _.includes(whitelist, origin));
      },
    })
  );

  app.use(cookieParser());

  app.use(
    session({
      name: 'pdfid',
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: new LowdbStore(sessionDb.get('sessions'), {
        ttl: 86400,
      }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10,
        httpOnly: false,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        domain:
          process.env.NODE_ENV === 'production'
            ? '*.pldtwriter.com'
            : undefined,
      },
    })
  );

  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());
  app.use(helmet());
  app.use(compression());

  app.use(express.static(path.join(__dirname, '../../client/dist/')));
  app.use(express.static(path.join(__dirname, '../../client/dist/assets/')));
  app.use(`/api/${process.env.API_VERSION}`, router);

  app.get('/api', (_request, response) => {
    response.send(`pdf-writer ${process.env.API_VERSION}`);
  });

  app.get('*', (_request, response) => {
    response.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });

  app.listen(_port, () => console.log(`Listening on port ${_port}`));
};

main();
