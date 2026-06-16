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

    const paymentAdvanceUsedByCustomer = new Map<string, number>();
    db.payments
      .filter(payment => payment.dairyId === req.dairyId)
      .forEach(payment => {
        const used = Number(payment.advanceUsed) || 0;
        if (!payment.customerId || used <= 0) return;
        paymentAdvanceUsedByCustomer.set(
          payment.customerId,
          (paymentAdvanceUsedByCustomer.get(payment.customerId) || 0) + used
        );
      });

    const result = [...list]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(adv => {
        const customer = db.customers.find(c => c._id === adv.customerId);
        const originalAmount = Number(adv.originalAmount ?? adv.amount ?? 0);
        const usedFromLedger = Number(adv.usedAmount ?? 0);
        const remainingFromLedger = Number(adv.remainingAmount ?? originalAmount);
        const fallbackUsed = Math.max(0, originalAmount - remainingFromLedger);
        const totalUsedForCustomer = paymentAdvanceUsedByCustomer.get(adv.customerId) || 0;
        const usedAmount = usedFromLedger > 0 ? usedFromLedger : Math.min(originalAmount, fallbackUsed || totalUsedForCustomer);
        const remainingAmount = remainingFromLedger !== originalAmount || adv.remainingAmount !== undefined
          ? remainingFromLedger
          : Math.max(0, originalAmount - totalUsedForCustomer);

        return {
          ...adv,
          originalAmount,
          usedAmount: parseFloat(usedAmount.toFixed(2)),
          remainingAmount: parseFloat(remainingAmount.toFixed(2)),
          customerName: customer ? customer.name : 'Unknown',
          customerSeqId: customer ? customer.customerId : null
        };
      });

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
      originalAmount: amountNum,
      remainingAmount: amountNum,
      usedAmount: 0,
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
