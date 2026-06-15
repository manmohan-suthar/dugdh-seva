import express, { Response, NextFunction } from 'express';
import { db, saveDb, generateId } from '../db';
import authMiddleware, { AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();
router.use(authMiddleware);

// @route   GET /api/prices
router.get('/', (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { animalType } = req.query;
    let list = db.prices.filter(p => p.dairyId === req.dairyId);

    if (animalType) {
      list = list.filter(p => p.animalType === animalType);
    }

    res.json(list);
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/prices
router.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { animalType, pricePerLiter } = req.body;

    if (!animalType || !['cow', 'buffalo'].includes(animalType)) {
      return res.status(400).json({ error: 'animalType must be "cow" or "buffalo"' });
    }

    const priceNum = parseFloat(pricePerLiter);
    if (isNaN(priceNum) || priceNum <= 0) {
      return res.status(400).json({ error: 'pricePerLiter must be a valid positive number' });
    }

    let priceEntry = db.prices.find(p => p.dairyId === req.dairyId && p.animalType === animalType);

    if (priceEntry) {
      priceEntry.pricePerLiter = priceNum;
      priceEntry.updatedAt = new Date().toISOString();
    } else {
      priceEntry = {
        _id: generateId(),
        dairyId: req.dairyId,
        animalType,
        pricePerLiter: priceNum,
        updatedAt: new Date().toISOString()
      };
      db.prices.push(priceEntry);
    }

    await saveDb();
    res.json(priceEntry);
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/prices/:id
router.put('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { pricePerLiter } = req.body;
    const priceNum = parseFloat(pricePerLiter);

    if (isNaN(priceNum) || priceNum <= 0) {
      return res.status(400).json({ error: 'pricePerLiter must be a valid positive number' });
    }

    const priceEntry = db.prices.find(p => p._id === req.params.id && p.dairyId === req.dairyId);
    if (!priceEntry) {
      return res.status(404).json({ error: 'Price entry not found' });
    }

    priceEntry.pricePerLiter = priceNum;
    priceEntry.updatedAt = new Date().toISOString();

    await saveDb();
    res.json(priceEntry);
  } catch (error) {
    next(error);
  }
});

export default router;
