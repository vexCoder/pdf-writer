import archiver from 'archiver';
import dayjs from 'dayjs';
import { Response } from 'express';
import fs from 'fs-extra';
import { OAuth2Client } from 'google-auth-library';
import { drive_v3, google } from 'googleapis';
import _ from 'lodash';
import Lowdb from 'lowdb';
import { nanoid } from 'nanoid';
import Papa from 'papaparse';
import path from 'path';
import {
  degrees,
  PageSizes,
  PDFDocument,
  PDFImage,
  PDFPage,
  PDFTextField,
  rgb,
  TextAlignment,
} from 'pdf-lib';
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
      } else if (file) {
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
  let headers: any[] = [];
  await new Promise((resolve) => {
    Papa.parse(raw, {
      delimiter: ',',
      newline: '\r\n',
      quoteChar: '"',
      step: (res) => {
        // WRITE DATA TO PDF
        if (headers.length === 0) {
          headers = res.data as any[];
        } else {
          ndata.push(
            (res.data as any[]).reduce(
              (p, c, i) => ({
                ...(p as { [key: string]: any }),
                // @ts-ignore
                ...(c &&
                  (c as string).length &&
                  ({ [headers[i]]: c } as { [key: string]: any })),
              }),
              {}
            )
          );
        }
      },
      complete: (res) => {
        resolve(res);
      },
      error: (err: any) => {
        console.log(err);
        resolve(err);
      },
    });
  });

  console.log(ndata);
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

      const pages: PDFPage[] = [];
      const res = ndata[i];

      if (!pages.length) {
        const maxPage = parseInt(config.newPage, 10);
        for (let j = 0; j < maxPage; j++) {
          const page = pdfDoc.insertPage(8, PageSizes.A4);
          pages.push(page);
        }
      }

      console.log(res['FIRST NAME'], res['LAST NAME']);
      try {
        // await Promise.all(
        //   .map((v) => {

        //   })
        // );
        for (let ii = 0; ii < config.plot.length; ii++) {
          const v = config.plot[ii];
          let value;

          if (v.formatValue) {
            value = v.keyValues
              ?.map((o) => (res as any)[o])
              .reduce((p, c, index) => p.replace(`${index}`, c), v.formatValue);
          } else {
            value = (res as any)[v.key];
          }

          await placeValue(
            value,
            parseInt(config.imageRows, 10),
            v.loc,
            v.s,
            pdfDoc,
            drive,
            client,
            pages,
            v.type,
            v.format,
            v.fixedValue,
            v.optionValues
          ).catch((e) => console.log(e));
        }
      } catch (e) {
        console.log('Conversion Error:', e);
      }

      if (pages.length) {
        for (let np = 0; np < pages.length; np++) {
          const page = pages[np];
          await drawWatermark(page, {
            x: 0,
            y: 0,
            width: page.getWidth(),
            height: page.getHeight(),
            row: 2,
            col: 4,
            size: 128,
          });
          await drawWatermark(page, {
            x: 0,
            y: 0,
            width: page.getWidth(),
            height: page.getHeight(),
            row: 12,
            col: 16,
            size: 24,
          });
        }
      }

      const pdfBytes = await pdfDoc.save();
      await fs.writeFile(
        path.join(
          paths.EXPORTS,
          `${document}-${key}-${i + 1}-${res['FIRST NAME']}-${
            res['LAST NAME']
          }.pdf`
        ),
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
interface Dimensions {
  x: number;
  y: number;
  width: number;
  height: number;
  row: number;
  col: number;
  size: number;
  scale?: number;
}

const drawWatermark = async (
  page: PDFPage,
  dim: Dimensions = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    row: 0,
    col: 0,
    size: 24,
  }
) => {
  const test = true;
  if (test) return;
  const { row, col } = dim;
  for (let x = 0; x < row; x++) {
    for (let y = 0; y < col; y++) {
      const text = 'RAP';
      const x1 = ((dim.width * (dim.scale || 1)) / row) * x + dim.x;
      const x2 = ((dim.width * (dim.scale || 1)) / row) * (x + 1) + dim.x;
      const y1 = ((dim.height * (dim.scale || 1)) / col) * y + dim.y;
      const y2 = ((dim.height * (dim.scale || 1)) / col) * (y + 1) + dim.y;
      const centerX = (x1 + x2) / 2;
      const centerY = (y1 + y2) / 2;
      page.drawText(text, {
        x: centerX - (text.length * dim.size * (dim.scale || 1)) / 4,
        y: centerY - dim.size * (dim.scale || 1),
        size: dim.size * (dim.scale || 1),
        color: rgb(1, 0, 0),
        lineHeight: dim.size * (dim.scale || 1),
        opacity: 0,
        rotate: degrees(30),
      });
    }
  }
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
}: IArchiveFiles): Promise<void> => {
  const checkArchived = await new Promise((resolve, _reject) => {
    const output = fs.createWriteStream(path.join(paths.OUTPUT, `${key}.zip`));

    const archive = archiver('zip', {
      zlib: { level: 9 }, // Sets the compression level.
    });

    archive.pipe(output);

    for (let i = 0; i < max; i++) {
      const expectedFileName = `${document}-${key}-${i + 1}`;
      const files = fs.readdirSync(paths.EXPORTS);
      const file = files.find((v) => v.indexOf(expectedFileName) !== -1);
      const dir = path.join(paths.EXPORTS, `${file}`);
      const pdfName = file?.replace(expectedFileName, '');
      console.log(dir, expectedFileName, file, pdfName);
      archive.file(dir, { name: `${i + 1}${pdfName?.toLowerCase()}` });
    }

    archive.finalize();

    output.on('close', () => {
      console.log(`${archive.pointer()} total bytes`);
      console.log(
        'archiver has been finalized and the output file descriptor has closed.'
      );
      resolve(true);
    });
  });

  if (checkArchived) {
    const exportDir = await fs.readdir(paths.EXPORTS);
    const tempDir = await fs.readdir(paths.TEMP);

    try {
      await Promise.all(
        exportDir
          .filter((v) => v.indexOf(key) !== -1)
          .map(async (v) => {
            await fs.unlink(path.join(paths.EXPORTS, v));
          })
      );

      await Promise.all(
        tempDir
          .filter((v) => v.indexOf(key) !== -1)
          .map(async (v) => {
            await fs.unlink(path.join(paths.TEMP, v));
          })
      );
    } catch (error) {
      console.log(error);
    }
  }
};

export const placeValue = async (
  value: string,
  imageRows: number,
  location: IConfigLocation[],
  size: string,
  pdfDoc: PDFDocument,
  drive: drive_v3.Drive,
  client: OAuth2Client,
  _pages: PDFPage[],
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
        const field: PDFTextField = form.getTextField(loc.key);
        fieldName = field.getName();
        if (field) {
          try {
            console.log(loc.key);
            field.setMaxLength(500);
            if (loc.alignment) {
              field.setAlignment(TextAlignment[loc.alignment]);
            }
            const _value = optionValues
              ? optionValues[parseInt(value, 10)]
              : fixedValue || value;

            if (type === 'date') {
              console.log(_value);
              field.setText(
                dayjs(
                  _value.split('\n').join(''),
                  loc.originalFormat || 'DD/MM/YYYY'
                ).format(format)
              );
            } else {
              field.setText(_value.split('\n').join(''));
            }
            field.setFontSize(parseInt(size, 10));
          } catch (e) {
            console.log(fieldName);
            console.log(`Textfield Error: ${e.name}`);
          }
        }

        if (!field) {
          const dropdown = form.getDropdown(loc.key);
          try {
            console.log(loc.key);
            const _value = optionValues
              ? optionValues[parseInt(value, 10)]
              : fixedValue || value;

            if (type === 'date') {
              console.log(_value);
              dropdown.select(
                dayjs(
                  _value.split('\n').join(''),
                  loc.originalFormat || 'DD/MM/YYYY'
                ).format(format),
                true
              );
            } else {
              dropdown.select(_value.split('\n').join(''), true);
            }
            dropdown.setFontSize(parseInt(size, 10));
          } catch (e) {
            console.log(fieldName);
            console.log(`Dropdown Error: ${e.name}`);
          }
        }
        break;
      }
      case 'image': {
        const data = value ? (value.split(',') as string[]) : [];
        const field = form.getButton(loc.key);
        fieldName = field.getName();
        const widget = field.acroField.getWidgets()[0];
        const page = pdfDoc.findPageForAnnotationRef(field.ref);
        const { width, height, x, y } = widget.getRectangle();
        try {
          if (!field) console.log(loc.key);
          const id = extractID(data[0]);
          const img = await drive.files.get(
            {
              auth: client,
              fileId: id,
              alt: 'media',
            },
            { responseType: 'arraybuffer' }
          );

          const image = await pdfDoc.embedJpg(img.data as ArrayBuffer);
          if (page) {
            const { height: imgH, width: imgW } = image;
            const aspectRatio = imgH / imgW;
            const preferredWidth = _.clamp(
              page.getWidth() / data.length - 20,
              140
            );

            const newHeight = _.clamp(
              aspectRatio * preferredWidth,
              page.getHeight() / imageRows
            );

            page.drawImage(image, {
              width: _.clamp(preferredWidth, 0, width),
              height: _.clamp(newHeight, 0, height),
              x,
              y,
            });
            await drawWatermark(page, {
              width,
              height,
              x,
              y,
              row: 4,
              col: 8,
              size: 18,
            });
            await drawWatermark(page, {
              width,
              height,
              x,
              y,
              row: 2,
              col: 1,
              size: 64,
            });
            page.setBleedBox(x, y, width, height);
          }
        } catch (e) {
          console.log(fieldName);
          console.log(`Image Error: ${e.name}`);
        }
        break;
      }
      case 'options': {
        const field = form.getOptionList(loc.key);
        fieldName = field.getName();
        const _value = (fixedValue || value).split('\n').join('');
        try {
          if (!field) console.log(loc.key);
          field.select(_value);
        } catch (e) {
          field.setOptions([_value]);
          field.select(_value);
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
        console.log(fieldName, fixedValue || value);
        const _value = (fixedValue || value).split('\n').join('');
        try {
          if (!field) console.log(loc.key);
          field.setFontSize(parseInt(size, 10));
          field.select(_value);
        } catch (e) {
          field.setFontSize(parseInt(size, 10));
          field.setOptions([_value]);
          field.select(_value);
          console.log(fieldName, fixedValue || value);
          console.log(`Dropdown Error: ${e.name}`);
        }
        break;
      }
      case 'checkbox': {
        const field = form.getCheckBox(loc.key);
        fieldName = field.getName();
        try {
          if (!field) console.log(loc.key);
          let valuex;
          console.log(
            loc.key,
            optionValues,
            value,
            (optionValues || [])[parseInt(value, 10)],
            loc.value
          );
          if (optionValues)
            valuex = optionValues[parseInt(value, 10)] === loc.value ? 1 : 0;
          else if (fixedValue) valuex = parseInt(fixedValue, 10);
          else valuex = parseInt(value, 10);

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
          const data = value ? (value.split(',') as string[]) : [];
          const locPage = parseInt(loc.page, 10);
          const pages = await pdfDoc.getPages();
          const page = pages[locPage];
          console.log(locPage);
          try {
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

              const row = page.getHeight() - _row * (newHeight + 20);

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
            console.log(`Attachment Error: ${e.name}`);
          }
        }
        break;
      }
      default:
        break;
    }
  }
};

export const extractID = (url: string) => url.split('id=')[1];
