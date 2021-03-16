import { Router } from 'express';
import multer from 'multer';
import PDFHandler from '../handler/PDFHandler';
import paths from '../utils/paths';

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, paths.UPLOAD);
  },
  filename(_req, file, cb) {
    console.log(file);
    cb(null, file.originalname);
  },
});

const csvUpload = multer({ storage });

const router = Router();

router.post('/convert', csvUpload.single('file'), PDFHandler.convert);
router.post('/status', PDFHandler.status);
router.get('/download', PDFHandler.download);

export default router;
