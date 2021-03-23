import { Response } from 'express';
import { google } from 'googleapis';
import { RequestSession } from '../types/types';
import { clearCookie } from '../utils/helper';
import { loadCredentials, loadDb } from '../utils/initialize';

export default {
  listFiles: async (req: RequestSession, res: Response) => {
    try {
      const { currentPage, count } = req.body;
      const client = await loadCredentials();
      const db = await loadDb();
      const users = db.get('users').value();
      const user = users.find((v: any) => v.id === req.session.userId);
      if (!user) {
        await clearCookie({ req, res });
        res.status(404).send({ success: false });
        return;
      }
      client.setCredentials(user.tokens);
      const drive = google.drive({
        version: 'v3',
        auth: client,
      });

      const files = await drive.files.list({
        q: `mimeType='application/vnd.google-apps.spreadsheet'`,
        fields:
          'nextPageToken, files(id, name, thumbnailLink, createdTime, modifiedTime)',
        spaces: 'drive',
        pageSize: count,
        pageToken: currentPage,
      });

      res.status(200).send({
        success: true,
        data: {
          files: files.data.files,
          nextPage: files.data.nextPageToken || null,
        },
      });
    } catch (error) {
      res.status(404).send({
        success: false,
        error: error.stack,
      });
    }
  },
};
