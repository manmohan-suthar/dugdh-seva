import express, { Response, NextFunction } from 'express';
import { db, saveDb, generateId } from '../db';
import authMiddleware, { AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();
router.use(authMiddleware);

// @route   GET /api/charts
router.get('/', (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { animalType } = req.query;
    let list = db.charts.filter(c => c.dairyId === req.dairyId);

    if (animalType) {
      list = list.filter(c => c.animalType === animalType);
    }

    res.json(list);
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/charts
router.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { animalType, entries } = req.body;

    if (!animalType || !['cow', 'buffalo'].includes(animalType)) {
      return res.status(400).json({ error: 'animalType must be "cow" or "buffalo"' });
    }

    if (!entries || !Array.isArray(entries)) {
      return res.status(400).json({ error: 'entries must be an array' });
    }

    const cleanEntries = entries.map((e: any) => ({
      fat: parseFloat(parseFloat(e.fat).toFixed(1)),
      snf: parseFloat(parseFloat(e.snf).toFixed(1)),
      pricePerLiter: parseFloat(parseFloat(e.pricePerLiter).toFixed(2))
    }));

    let chart = db.charts.find(c => c.dairyId === req.dairyId && c.animalType === animalType);

    if (chart) {
      chart.entries = cleanEntries;
      chart.updatedAt = new Date().toISOString();
    } else {
      chart = {
        _id: generateId(),
        dairyId: req.dairyId,
        animalType,
        entries: cleanEntries,
        updatedAt: new Date().toISOString()
      };
      db.charts.push(chart);
    }

    await saveDb();
    res.json(chart);
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/charts/:id
router.put('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { entries } = req.body;
    const chart = db.charts.find(c => c._id === req.params.id && c.dairyId === req.dairyId);

    if (!chart) {
      return res.status(404).json({ error: 'Chart not found' });
    }

    if (entries && Array.isArray(entries)) {
      chart.entries = entries.map((e: any) => ({
        fat: parseFloat(parseFloat(e.fat).toFixed(1)),
        snf: parseFloat(parseFloat(e.snf).toFixed(1)),
        pricePerLiter: parseFloat(parseFloat(e.pricePerLiter).toFixed(2))
      }));
    }

    chart.updatedAt = new Date().toISOString();
    await saveDb();

    res.json(chart);
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/charts/:id
router.delete('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const idx = db.charts.findIndex(c => c._id === req.params.id && c.dairyId === req.dairyId);
    if (idx === -1) {
      return res.status(404).json({ error: 'Chart not found' });
    }

    db.charts.splice(idx, 1);
    await saveDb();

    res.json({ message: 'Chart deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
