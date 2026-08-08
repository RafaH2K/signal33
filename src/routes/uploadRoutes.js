import { Router } from 'express';
import * as uploadController from '../controllers/uploadController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { upload } from '../middlewares/upload.js';

export const uploadRoutes = Router();

uploadRoutes.use(authenticate, authorize('ADMIN'));

uploadRoutes.post('/', upload.single('file'), uploadController.upload);
uploadRoutes.get('/', uploadController.list);
uploadRoutes.delete('/:filename', uploadController.remove);
