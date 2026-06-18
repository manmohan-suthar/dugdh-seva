import express, { Response, NextFunction } from 'express';
import { db, saveDb, generateId } from '../db';
import authMiddleware, { AuthenticatedRequest } from '../middleware/auth';
import calcRate from '../utils/calcRate';

const router = express.Router();
router.use(authMiddleware);

function getPurchaseAdjustment(dairyId: string) {
  const settings = db.settings.find(s => s.dairyId === dairyId);
  const amount = Number(settings?.purchaseAdjustmentAmount) || 0;
  const type = settings?.purchaseAdjustmentType === 'subtract' ? 'subtract' : 'add';
  return { type, amount };
}

function applyPurchaseRateAdjustment(baseRate: number, dairyId: string) {
  const adjustment = getPurchaseAdjustment(dairyId);
  const signedAdjustment = adjustment.type === 'subtract' ? -adjustment.amount : adjustment.amount;
  return {
    ratePerLiter: parseFloat(Math.max(0, baseRate + signedAdjustment).toFixed(2)),
    purchaseAdjustmentType: adjustment.type,
    purchaseAdjustmentAmount: adjustment.amount
  };
}

// @route   GET /api/collection
router.get('/', (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { customerId, date, startDate, endDate, shift } = req.query;
    let list = db.collections.filter(tx => tx.dairyId === req.dairyId);

    if (customerId) {
      list = list.filter(tx => tx.customerId === customerId);
    }

    if (date) {
      const targetDate = String(date).split('T')[0];
      list = list.filter(tx => tx.date.split('T')[0] === targetDate);
    }

    if (startDate) {
      const start = new Date(String(startDate));
      list = list.filter(tx => new Date(tx.date) >= start);
    }

    if (endDate) {
      const end = new Date(String(endDate));
      list = list.filter(tx => new Date(tx.date) <= end);
    }

    if (shift) {
      list = list.filter(tx => tx.shift === shift);
    }

    const result = list.map(tx => {
      const customer = db.customers.find(c => c._id === tx.customerId);
      return {
        ...tx,
        customerName: customer ? customer.name : 'Unknown',
        customerPhone: customer ? customer.phone : '',
        customerSeqId: customer ? customer.customerId : null
      };
    });

    result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/collection
router.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { customerId, date, shift, liters, fat, snf } = req.body;

    if (!customerId || !liters || !fat || !snf || !shift) {
      return res.status(400).json({ error: 'Customer, liters, FAT, SNF, and Shift are required' });
    }

    const customer = db.customers.find(c => c._id === customerId && c.dairyId === req.dairyId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const animalType = customer.milkType;
    const chart = db.charts.find(c => c.dairyId === req.dairyId && c.animalType === animalType);

    const rate = calcRate(chart, parseFloat(fat), parseFloat(snf));
    if (rate === null) {
      return res.status(400).json({ 
        error: `Is fat/snf (${fat}/${snf}) ke liye rate nahi mila. Pehle dashboard ya settings me rate chart set/update karein.` 
      });
    }

    const litersNum = parseFloat(liters);
    const adjustedRate = applyPurchaseRateAdjustment(rate, req.dairyId!);
    const baseAmount = parseFloat((litersNum * rate).toFixed(2));
    const totalAmount = parseFloat((litersNum * adjustedRate.ratePerLiter).toFixed(2));

    const newCollection = {
      _id: generateId(),
      dairyId: req.dairyId,
      customerId,
      date: date ? new Date(date).toISOString() : new Date().toISOString(),
      shift,
      animalType,
      liters: litersNum,
      fat: parseFloat(fat),
      snf: parseFloat(snf),
      baseRatePerLiter: rate,
      ratePerLiter: adjustedRate.ratePerLiter,
      baseAmount,
      totalAmount,
      purchaseAdjustmentType: adjustedRate.purchaseAdjustmentType,
      purchaseAdjustmentAmount: adjustedRate.purchaseAdjustmentAmount,
      createdAt: new Date().toISOString()
    };

    db.collections.push(newCollection);
    await saveDb();

    res.status(201).json({
      ...newCollection,
      customerName: customer.name,
      customerSeqId: customer.customerId
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/collection/:id
router.get('/:id', (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const entry = db.collections.find(tx => tx._id === req.params.id && tx.dairyId === req.dairyId);
    if (!entry) {
      return res.status(404).json({ error: 'Collection entry not found' });
    }
    const customer = db.customers.find(c => c._id === entry.customerId);
    res.json({
      ...entry,
      customerName: customer ? customer.name : 'Unknown',
      customerSeqId: customer ? customer.customerId : null
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/collection/:id
router.put('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { liters, fat, snf, date, shift } = req.body;
    const index = db.collections.findIndex(tx => tx._id === req.params.id && tx.dairyId === req.dairyId);

    if (index === -1) {
      return res.status(404).json({ error: 'Collection entry not found' });
    }

    const entry = db.collections[index];
    const customer = db.customers.find(c => c._id === entry.customerId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    if (shift) entry.shift = shift;
    if (date) entry.date = new Date(date).toISOString();

    if (liters !== undefined || fat !== undefined || snf !== undefined) {
      const finalLiters = liters !== undefined ? parseFloat(liters) : entry.liters;
      const finalFat = fat !== undefined ? parseFloat(fat) : entry.fat;
      const finalSnf = snf !== undefined ? parseFloat(snf) : entry.snf;

      const animalType = customer.milkType;
      const chart = db.charts.find(c => c.dairyId === req.dairyId && c.animalType === animalType);
      const rate = calcRate(chart, finalFat, finalSnf);

      if (rate === null) {
        return res.status(400).json({ 
          error: `Is fat/snf (${finalFat}/${finalSnf}) ke liye rate list entries nahi mili.` 
        });
      }

      entry.liters = finalLiters;
      entry.fat = finalFat;
      entry.snf = finalSnf;
      entry.baseRatePerLiter = rate;
      const adjustedRate = applyPurchaseRateAdjustment(rate, req.dairyId!);
      entry.ratePerLiter = adjustedRate.ratePerLiter;
      entry.baseAmount = parseFloat((finalLiters * rate).toFixed(2));
      entry.totalAmount = parseFloat((finalLiters * adjustedRate.ratePerLiter).toFixed(2));
      entry.purchaseAdjustmentType = adjustedRate.purchaseAdjustmentType;
      entry.purchaseAdjustmentAmount = adjustedRate.purchaseAdjustmentAmount;
    }

    db.collections[index] = entry;
    await saveDb();

    res.json({
      ...entry,
      customerName: customer.name,
      customerSeqId: customer.customerId
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/collection/:id
router.delete('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const index = db.collections.findIndex(tx => tx._id === req.params.id && tx.dairyId === req.dairyId);
    if (index === -1) {
      return res.status(404).json({ error: 'Collection entry not found' });
    }

    db.collections.splice(index, 1);
    await saveDb();

    res.json({ message: 'Collection entry deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
