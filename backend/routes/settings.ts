import express, { Response, NextFunction } from 'express';
import { db, saveDb, generateId } from '../db';
import authMiddleware, { AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();
router.use(authMiddleware);

function getDairySettings(dairyId: string) {
  let settings = db.settings.find(s => s.dairyId === dairyId);

  if (!settings) {
    settings = {
      _id: generateId(),
      dairyId,
      purchaseAdjustmentType: 'add',
      purchaseAdjustmentAmount: 0,
      updatedAt: new Date().toISOString()
    };
    db.settings.push(settings);
  }

  return settings;
}

// @route   GET /api/settings
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const settings = getDairySettings(req.dairyId!);
    await saveDb();
    res.json(settings);
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/settings
router.put('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { purchaseAdjustmentType, purchaseAdjustmentAmount } = req.body;

    if (!['add', 'subtract'].includes(purchaseAdjustmentType)) {
      return res.status(400).json({ error: 'purchaseAdjustmentType must be "add" or "subtract"' });
    }

    const amountNum = parseFloat(purchaseAdjustmentAmount);
    if (Number.isNaN(amountNum) || amountNum < 0) {
      return res.status(400).json({ error: 'purchaseAdjustmentAmount must be a valid zero or positive number' });
    }

    const settings = getDairySettings(req.dairyId!);
    settings.purchaseAdjustmentType = purchaseAdjustmentType;
    settings.purchaseAdjustmentAmount = parseFloat(amountNum.toFixed(2));
    settings.updatedAt = new Date().toISOString();

    await saveDb();
    res.json(settings);
  } catch (error) {
    next(error);
  }
});

export default router;
