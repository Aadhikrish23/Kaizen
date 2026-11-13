import { Router } from 'express';
import { protect } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate';
import { measurementLogSchema } from './measurement.schema';
import { getMeasurements, upsertMeasurement } from './measurement.controller';

const router = Router();

router.use(protect);

router.route('/')
  .get(getMeasurements)
  .post(validateRequest(measurementLogSchema), upsertMeasurement);

export default router;
