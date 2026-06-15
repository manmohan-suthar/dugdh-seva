import express, { Response, NextFunction } from 'express';
import { db, saveDb, generateId } from '../db';
import authMiddleware, { AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();
router.use(authMiddleware);

// @route   GET /api/advances
router.get('/', (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { customerId } = req.query;
    let list = db.advances.filter(adv => adv.dairyId === req.dairyId);

    if (customerId) {
      list = list.filter(adv => adv.customerId === customerId);
    }

    const result = list.map(adv => {
      const customer = db.customers.find(c => c._id === adv.customerId);
      return {
        ...adv,
        customerName: customer ? customer.name : 'Unknown',
        customerSeqId: customer ? customer.customerId : null
      };
    });

    result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/advances
router.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { customerId, amount, date, notes } = req.body;

    if (!customerId || !amount) {
      return res.status(400).json({ error: 'Customer and amount are required' });
    }

    const customer = db.customers.find(c => c._id === customerId && c.dairyId === req.dairyId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    const newAdvance = {
      _id: generateId(),
      dairyId: req.dairyId,
      customerId,
      amount: amountNum,
      date: date ? new Date(date).toISOString() : new Date().toISOString(),
      notes: notes || '',
      createdAt: new Date().toISOString()
    };

    db.advances.push(newAdvance);
    await saveDb();

    res.status(201).json({
      ...newAdvance,
      customerName: customer.name,
      customerSeqId: customer.customerId
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/advances/:id
router.delete('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const idx = db.advances.findIndex(adv => adv._id === req.params.id && adv.dairyId === req.dairyId);
    if (idx === -1) {
      return res.status(404).json({ error: 'Advance record not found' });
    }

    db.advances.splice(idx, 1);
    await saveDb();

    res.json({ message: 'Advance deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
