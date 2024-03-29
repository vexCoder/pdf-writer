import { Response } from 'express';
import { Credentials } from 'google-auth-library';
import { google } from 'googleapis';
import { nanoid } from 'nanoid';
import { RequestSession } from '../types/types';
import config from '../utils/config';
import { clearCookie } from '../utils/helper';
import { loadCredentials, loadDb } from '../utils/initialize';

export default {
  fetchCurrentLogin: async (req: RequestSession, res: Response) => {
    try {
      let url = '';
      if (req.session.userId) {
        const db = await loadDb();
        const users = db.get('users').value();
        const user = users.find((v: any) => v.id === req.session.userId);
        if (user) {
          const { email, tokens } = user;
          if (!email) {
            await clearCookie({ req, res });
            url = await generateURL();
            res.status(200).send({ success: true, data: { url } });
          } else if (!!email && !!tokens) {
            res
              .status(200)
              .send({ success: true, data: { isLogin: true, email, tokens } });
          }
        } else {
          await clearCookie({ req, res });
          url = await generateURL();
          res.status(200).send({ success: true, data: { url } });
        }
      } else {
        res.status(200).send({
          success: true,
          data: null,
        });
      }
    } catch (error) {
      res.status(404).send({
        success: false,
        error: error.stack,
        data: null,
      });
    }
  },
  generateAuth: async (req: RequestSession, res: Response) => {
    try {
      const db = await loadDb();
      let url = '';
      if (!req.session.userId) {
        url = await generateURL();
        res.status(200).send({ success: true, data: { url } });
      } else {
        const users = db.get('users').value();
        const user = users.find((v: any) => v.id === req.session.userId);
        if (user) {
          const { email, tokens } = user;
          if (!email) {
            await clearCookie({ req, res });
            url = await generateURL();
            res.status(200).send({ success: true, data: { url } });
          } else if (!!email && !!tokens) {
            res
              .status(200)
              .send({ success: true, data: { isLogin: true, email, tokens } });
          }
        } else {
          await clearCookie({ req, res });
          url = await generateURL();
          res.status(200).send({ success: true, data: { url } });
        }
      }
    } catch (error) {
      res.status(404).send({
        success: false,
        error: error.stack,
        data: null,
      });
    }
  },
  saveToken: async (req: RequestSession, res: Response) => {
    try {
      const { tokens, email } = await saveToken(req.body.code);
      if (tokens && email) {
        const db = await loadDb();
        const users: any[] = db.get('users').value();
        const findUser = users.findIndex((v) => v.email === email);

        let nId: string;
        if (findUser === -1) {
          let find = -1;
          do {
            nId = nanoid();
            find = users.findIndex((v) => v.id === nId);
          } while (find !== -1);

          db.set('users', [...users, { id: nId, tokens, email }]).write();
          req.session.userId = nId;
        } else {
          nId = users[findUser].id;
          users[findUser] = { ...users[findUser], tokens };
          db.set('users', users).write();
          req.session.userId = nId;
        }

        res
          .status(200)
          .send({ success: true, data: { id: nId, email, tokens } });
      }
    } catch (error) {
      res.status(404).send({
        success: false,
        error: error.stack,
      });
    }
  },
  logout: async (req: RequestSession, res: Response) => {
    try {
      const db = await loadDb();
      const users = db.get('users').value();
      const user = users.find((v: any) => v.id === req.session.userId);
      await clearCookie({ req, res });
      const findUser = users.findIndex((v: any) => v.email === user.email);

      if (user && findUser > -1) {
        await logout(user.tokens);
        users[findUser] = { ...users[findUser], tokens: undefined };
        db.set('users', users).write();
      }

      res.status(200).send({
        success: true,
      });
    } catch (error) {
      console.error(error);
      res.status(404).send({
        success: false,
        error: error.stack,
      });
    }
  },
};

async function saveToken(
  code: string
): Promise<{ tokens: Credentials; email?: string | null }> {
  const oAuth2Client = await loadCredentials();
  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);
  const gmail = await google.gmail({ version: 'v1', auth: oAuth2Client });
  const me = await gmail.users.getProfile({ auth: oAuth2Client, userId: 'me' });
  const email = me.data.emailAddress;
  return { tokens, email };
}

async function logout(cred: Credentials) {
  const oAuth2Client = await loadCredentials();
  if (cred.refresh_token && cred.access_token) {
    oAuth2Client.revokeToken(cred.access_token, (err) => {
      console.error(err);
    });
    oAuth2Client.revokeToken(cred.refresh_token, (err) => {
      console.error(err);
    });
    oAuth2Client.revokeCredentials((err) => {
      console.error(err);
    });
  }
}

async function generateURL(): Promise<string> {
  const oAuth2Client = await loadCredentials();
  return oAuth2Client.generateAuthUrl({
    // 'online' (default) or 'offline' (gets refresh_token)
    access_type: 'offline',

    // If you only need one scope you can pass it as a string
    scope: config.SCOPES,
  });
}
