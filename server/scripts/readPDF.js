const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const path = require('path')
const { PDFDocument, rgb } = require('pdf-lib')
const fs = require('fs-extra')
const express = require('express')


const adapter = new FileSync(path.join(__dirname, '..', 'dist', 'db', 'db.json'))
const db = low(adapter)

db.defaults({ configs: [] }).write()

const main = async() => {
    const app = express();

    try {
        const uint8Array = await fs.readFile('documents/pldt-application.pdf')
        const pdfDoc = await PDFDocument.load(uint8Array)
        const form = pdfDoc.getForm()
        const fields = form.getFields().map((field) => {
            const type = field.constructor.name
            const name = field.getName()
            console.log({ type, name })
            const widgets = field.acroField.getWidgets()
            return {
                type,
                name,
                widgets
            }
        })

        for (let i = 0; i < fields.length; i++) {
            const { widgets, name, type } = fields[i];

            widgets.forEach((w) => {
                let page = pdfDoc.getPages().find(x => x.ref === w.P());
                const rect = w.getRectangle();
                page.drawRectangle({
                    ...rect,
                    borderWidth: 0.5,
                    opacity: 0,
                    borderOpacity: 0.1
                })
                page.drawText(
                    `${name}`, {
                        x: rect.x,
                        y: rect.y - 10,
                        size: 7,
                        color: rgb(1, 0, 0)
                    })
                console.log(`${type}: ${name}`);
            });
        }


        const pdfBytes = await pdfDoc.save();
        await fs.writeFile(
            `scripts/test.pdf`,
            pdfBytes
        );
        app.listen(9001, () => console.log('Lets Go'))
    } catch (e) {
        console.log(e)
    }
}

main()