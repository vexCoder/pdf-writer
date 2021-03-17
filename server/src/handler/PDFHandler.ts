import { Response } from 'express';
import fs from 'fs-extra';
import { drive_v3, google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { nanoid } from 'nanoid';
import Papa from 'papaparse';
import path from 'path';
import { PageSizes, PDFDocument, PDFImage } from 'pdf-lib';
import _ from 'lodash';
import dayjs from 'dayjs';
import Lowdb from 'lowdb';
import archiver from 'archiver';
import { IConfig, IConfigLocation, RequestSession } from '../types/types';
import { clearCookie } from '../utils/helper';
import { loadCredentials, loadDb } from '../utils/initialize';
import paths from '../utils/paths';

interface IConvertData {
  id: string;
  document: string;
  captcha: string;
  file: FormData;
}

export default {
  download: async (req: RequestSession, res: Response) => {
    try {
      const { key } = req.query;
      res.set('Content-Disposition', `attachment;filename=${key}.zip`);
      res.set('Content-Type', 'application/octet-stream');
      res.download(path.join(paths.OUTPUT, `${key}.zip`));
    } catch (e) {
      console.log(e);
      res.status(404).send({
        success: false,
        error: e.stack,
      });
    }
  },
  status: async (req: RequestSession, res: Response) => {
    try {
      const { key } = req.body;
      const db = await loadDb();
      const queue = db.get('queue').value();
      if (queue) {
        const selected = queue.find((v: any) => v.id === key);
        if (selected) {
          res.status(200).send({
            success: true,
            data: {
              status: selected.status,
              process: selected.process,
            },
          });
        } else {
          res.status(404).send({
            success: false,
          });
        }
      } else {
        res.status(404).send({
          success: false,
        });
      }
    } catch (error) {
      res.status(404).send({
        success: false,
        error: error.stack,
      });
    }
  },
  convert: async (req: RequestSession, res: Response) => {
    try {
      const { document, id }: IConvertData = req.body;
      const { file } = req;
      const db = await loadDb();
      const client = await loadCredentials();
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

      const templateJSON = await fs.readFile(
        path.join(paths.CONFIGS, `${document}.json`),
        'utf8'
      );

      const config = JSON.parse(templateJSON) as IConfig;

      if (!config) {
        res.status(404).send({ success: false });
        return;
      }

      let streamData;
      if (!req.file) {
        const stream = await drive.files.export({
          auth: client,
          fileId: id,
          mimeType: 'text/csv',
        });

        streamData = stream.data;
      } else {
        streamData = await fs.readFile(file.path, 'utf8');
      }

      const queue = db.get('queue').value() || [];
      let key: string;
      let check = true;
      do {
        key = nanoid();
        check = queue.findIndex((v: any) => v.id === key) !== -1;
      } while (check);

      await fs.writeFile(path.join(paths.TEMP, `dl-${key}.csv`), streamData, {
        encoding: 'utf8',
      });

      db.set('queue', [
        ...queue,
        {
          id: key,
          status: 0,
          documentId: id,
          document,
          expire: dayjs().add(1, 'hour').unix(),
        },
      ]).write();

      processCSV(key, config, db, drive, client, document);

      res.status(200).send({ success: true, data: { key } });
    } catch (error) {
      res.status(404).send({
        success: false,
        error: error.stack,
      });
    }
  },
};

const processCSV = async (
  key: string,
  config: IConfig,
  db: Lowdb.LowdbAsync<any>,
  drive: drive_v3.Drive,
  client: OAuth2Client,
  document: string
) => {
  const queue: any[] = db.get('queue').value() || [];
  const _i = queue.findIndex((v: any) => v.id === key);
  const raw = await fs.readFile(path.join(paths.TEMP, `dl-${key}.csv`), 'utf8');

  const data = raw.split('\r\n');
  const ndata: any[] = [];
  await new Promise((resolve) => {
    Papa.parse(raw, {
      delimiter: ',',
      newline: '\r\n',
      header: true,
      step: (res) => {
        // WRITE DATA TO PDF
        ndata.push(res.data);
      },
      complete: (res) => {
        resolve(res);
      },
      error: (err) => {
        console.log(err);
        resolve(err);
      },
    });
  });

  if (queue[_i]) {
    queue[_i].process = 'converting';
    db.set('queue', queue).write();
    const max =
      process.env.NODE_ENV === 'production' ? data.length - 1 : data.length - 1;
    queue[_i].max = max;
    for (let i = 0; i < max; i++) {
      const uint8Array = await fs.readFile(
        path.join(paths.TEMPLATES, `${document}.pdf`)
      );
      const pdfDoc = await PDFDocument.load(uint8Array);

      const lastPage = _.last(pdfDoc.getPageIndices()) || 0;

      const res = ndata[i];
      try {
        await Promise.all(
          config.plot.map((v) =>
            placeValue(
              (res as any)[v.key],
              parseInt(config.imageRows, 10),
              v.loc,
              v.s,
              pdfDoc,
              drive,
              client,
              lastPage,
              v.type,
              v.format,
              v.fixedValue,
              v.optionValues
            )
          )
        );
      } catch (e) {
        console.log(e);
      }

      const pdfBytes = await pdfDoc.save();
      await fs.writeFile(
        path.join(paths.EXPORTS, `${document}-${key}-${i + 1}.pdf`),
        pdfBytes
      );

      queue[_i].status = ((i + 1) / max) * 100;
      db.set('queue', queue).write();
    }

    if (queue[_i].status >= 100) {
      queue[_i].process = 'compressing';
      db.set('queue', queue).write();
      await archiveFiles({ key, document, max });
      queue[_i].process = 'complete';
      db.set('queue', queue).write();
    }
  }

  // const data = raw.split('\r\n');
  // for (let i = 0; i < data.length; i++) {
  //   const line = data[i];
  //   console.log(line);
  //   await sleep(Math.random() * 3000 + 1000);
  //
  //   queue[_i].status = ((i + 1) / data.length) * 100;
  //   db.set('queue', queue).write();
  // }
};

interface IArchiveFiles {
  key: string;
  document: string;
  max: number;
}

export const archiveFiles = async ({
  key,
  document,
  max,
}: IArchiveFiles): Promise<void> =>
  new Promise((resolve, _reject) => {
    const output = fs.createWriteStream(path.join(paths.OUTPUT, `${key}.zip`));

    const archive = archiver('zip', {
      zlib: { level: 9 }, // Sets the compression level.
    });

    archive.pipe(output);

    for (let i = 0; i < max; i++) {
      const dir = path.join(paths.EXPORTS, `${document}-${key}-${i + 1}.pdf`);
      console.log(dir);
      archive.file(dir, { name: `${i + 1}.pdf` });
    }

    archive.finalize();

    output.on('close', () => {
      console.log(`${archive.pointer()} total bytes`);
      console.log(
        'archiver has been finalized and the output file descriptor has closed.'
      );
      resolve();
    });
  });

export const placeValue = async (
  value: string,
  imageRows: number,
  location: IConfigLocation[],
  size: string,
  pdfDoc: PDFDocument,
  drive: drive_v3.Drive,
  client: OAuth2Client,
  docLastPage: number,
  type?: string,
  format?: string,
  fixedValue?: string,
  optionValues?: string[]
) => {
  const form = pdfDoc.getForm();
  let maxHeight = 0;
  for (let i = 0; i < location.length; i++) {
    const loc = location[i];
    let fieldName = '';
    switch (loc.type) {
      case 'text': {
        const field = form.getTextField(loc.key);
        fieldName = field.getName();
        try {
          if (!field) console.log(loc.key);
          field.setMaxLength(500);
          const _value = optionValues
            ? optionValues[parseInt(value, 10)]
            : fixedValue || value;

          if (type === 'date') {
            field.setText(dayjs(_value).format(format));
          } else {
            field.setText(_value);
          }
          field.setFontSize(parseInt(size, 10));
        } catch (e) {
          console.log(fieldName);
          console.log(`Textfield Error: ${e.name}`);
        }
        break;
      }
      case 'options': {
        const field = form.getOptionList(loc.key);
        fieldName = field.getName();
        try {
          if (!field) console.log(loc.key);
          field.select(fixedValue || value);
        } catch (e) {
          field.setOptions([fixedValue || value]);
          field.select(fixedValue || value);
          console.log(fieldName);
          console.log(`Options Error: ${e.name}`);
        }
        break;
      }
      case 'radio': {
        const field = form.getRadioGroup(loc.key);
        fieldName = field.getName();
        try {
          if (!field) console.log(loc.key);
          field.select(fixedValue || value);
        } catch (e) {
          console.log(fieldName);
          console.log(`Radio Group Error: ${e.name}`);
        }
        break;
      }
      case 'dropdown': {
        const field = form.getDropdown(loc.key);
        fieldName = field.getName();
        try {
          if (!field) console.log(loc.key);
          field.setFontSize(parseInt(size, 10));
          field.select(fixedValue || value);
        } catch (e) {
          field.setFontSize(parseInt(size, 10));
          field.setOptions([fixedValue || value]);
          field.select(fixedValue || value);
          console.log(fixedValue || value);
          console.log(`Dropdown Error: ${e.name}`);
        }
        break;
      }
      case 'checkbox': {
        const field = form.getCheckBox(loc.key);
        fieldName = field.getName();
        try {
          if (!field) console.log(loc.key);

          const valuex = fixedValue
            ? parseInt(fixedValue, 10)
            : parseInt(value, 10);
          if (valuex === 1) {
            console.log(fixedValue, valuex === 1, valuex, typeof fixedValue);
            field.check();
          } else {
            console.log(fixedValue, valuex === 0, valuex, typeof fixedValue);
            field.uncheck();
          }
        } catch (e) {
          console.log(fieldName);
          console.log(`Dropdown Error: ${e.name}`);
        }
        break;
      }
      case 'attachment': {
        if (loc.page && loc.row) {
          let page;
          const lastPage = docLastPage + parseInt(loc.page, 10);
          try {
            page = pdfDoc.getPage(lastPage);
          } catch (e) {
            page = null;
          }
          const data = value ? (value.split(',') as string[]) : [];
          try {
            if (!page) {
              page = pdfDoc.addPage(PageSizes.A4);
            }

            const _row = parseInt(loc.row, 10);

            const images: {
              image: PDFImage;
              width: number;
              height: number;
              row: number;
              x: number;
              y: number;
            }[] = [];

            for (let x = 0; x < data.length; x++) {
              const id = extractID(data[x]);
              const img = await drive.files.get(
                {
                  auth: client,
                  fileId: id,
                  alt: 'media',
                },
                { responseType: 'arraybuffer' }
              );

              const image = await pdfDoc.embedJpg(img.data as ArrayBuffer);
              const { height, width } = image;
              const aspectRatio = height / width;
              const preferredWidth = _.clamp(
                page.getWidth() / data.length - 20,
                140
              );

              const newHeight = _.clamp(
                aspectRatio * preferredWidth,
                page.getHeight() / imageRows
              );

              const row = page.getHeight() - _row * (newHeight + 10);

              if (maxHeight < row) {
                maxHeight = row;
              }

              images.push({
                image,
                width: preferredWidth,
                height: newHeight,
                row,
                x: x * (preferredWidth + 10) + 10,
                y: row,
              });
            }

            for (let o = 0; o < images.length; o++) {
              const { x, width, height, image, y } = images[o];

              page.drawImage(image, {
                width,
                height,
                x,
                y,
              });
            }
          } catch (e) {
            console.log(`Attachment Error: ${e.name}`, e);
          }
        }
        break;
      }
      default:
        break;
    }
  }
};

const extractID = (url: string) => url.split('id=')[1];
