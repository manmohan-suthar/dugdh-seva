import express, { Response, NextFunction } from 'express';
import { db, saveDb, generateId } from '../db';
import authMiddleware, { AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();
router.use(authMiddleware);

// @route   GET /api/payments
router.get('/', (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { customerId } = req.query;
    let list = db.payments.filter(payment => payment.dairyId === req.dairyId);

    if (customerId) {
      list = list.filter(payment => payment.customerId === customerId);
    }

    const result = list.map(payment => {
      const customer = db.customers.find(c => c._id === payment.customerId);
      return {
        ...payment,
        customerName: customer ? customer.name : 'Unknown',
        customerSeqId: customer ? customer.customerId : null
      };
    });

    result.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/payments
router.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { customerId, startDate, endDate, collectionIds, amountPaid, notes, openingBalance, advanceUsed } = req.body;

    if (!customerId || !startDate || !endDate) {
      return res.status(400).json({ error: 'Customer, start date, and end date are required' });
    }

    const customer = db.customers.find(c => c._id === customerId && c.dairyId === req.dairyId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const selectedIds: string[] = Array.isArray(collectionIds) ? collectionIds : [];
    const selectedCollections = db.collections.filter(tx => (
      tx.dairyId === req.dairyId &&
      tx.customerId === customerId &&
      selectedIds.includes(tx._id)
    ));

    const totalAmount = parseFloat(
      selectedCollections.reduce((sum, tx) => sum + (Number(tx.totalAmount) || 0), 0).toFixed(2)
    );
    const openingBalanceNum = parseFloat(openingBalance) || 0;
    const advanceUsedNum = parseFloat(advanceUsed) || 0;
    const paidNum = parseFloat(amountPaid);

    if (isNaN(paidNum) || paidNum < 0) {
      return res.status(400).json({ error: 'Amount paid must be a valid number' });
    }

    const milkDue = parseFloat((openingBalanceNum + totalAmount).toFixed(2));
    const appliedTotal = parseFloat((paidNum + advanceUsedNum).toFixed(2));
    const balanceDue = parseFloat(Math.max(0, milkDue - appliedTotal).toFixed(2));
    const advanceCredit = parseFloat(Math.max(0, appliedTotal - milkDue).toFixed(2));

    const newPayment = {
      _id: generateId(),
      dairyId: req.dairyId,
      customerId,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      collectionIds: selectedIds,
      totalAmount,
      openingBalance: openingBalanceNum,
      amountPaid: paidNum,
      advanceUsed: advanceUsedNum,
      advanceCredit,
      advanceCreditRemaining: advanceCredit,
      advanceCreditUsed: 0,
      balanceDue,
      notes: notes || '',
      createdAt: new Date().toISOString()
    };

    db.payments.push(newPayment);

    if (appliedTotal > 0) {
      let remainingToSettle = appliedTotal;
      const olderOpenPayments = db.payments
        .filter(payment => (
          payment.dairyId === req.dairyId &&
          payment.customerId === customerId &&
          payment._id !== newPayment._id &&
          (Number(payment.balanceDue) || 0) > 0
        ))
        .sort((a, b) => new Date(a.createdAt || a.date || 0).getTime() - new Date(b.createdAt || b.date || 0).getTime());

      for (const payment of olderOpenPayments) {
        if (remainingToSettle <= 0) break;
        const currentDue = Number(payment.balanceDue) || 0;
        const consume = Math.min(currentDue, remainingToSettle);
        payment.balanceDue = parseFloat((currentDue - consume).toFixed(2));
        remainingToSettle = parseFloat((remainingToSettle - consume).toFixed(2));
      }
    }

    if (advanceUsedNum > 0) {
      let remainingToConsume = advanceUsedNum;
      const customerCredits = db.payments
        .filter(payment => (
          payment.dairyId === req.dairyId &&
          payment.customerId === customerId &&
          payment._id !== newPayment._id &&
          (Number(payment.advanceCreditRemaining ?? payment.advanceCredit) || 0) > 0
        ))
        .sort((a, b) => new Date(a.createdAt || a.date || 0).getTime() - new Date(b.createdAt || b.date || 0).getTime());

      for (const payment of customerCredits) {
        if (remainingToConsume <= 0) break;
        const currentCredit = Number(payment.advanceCreditRemaining ?? payment.advanceCredit ?? 0);
        const consume = Math.min(currentCredit, remainingToConsume);
        payment.advanceCreditRemaining = parseFloat((currentCredit - consume).toFixed(2));
        payment.advanceCreditUsed = parseFloat(((Number(payment.advanceCreditUsed) || 0) + consume).toFixed(2));
        remainingToConsume = parseFloat((remainingToConsume - consume).toFixed(2));
      }

      const customerAdvances = db.advances
        .filter(adv => adv.dairyId === req.dairyId && adv.customerId === customerId)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      for (const adv of customerAdvances) {
        const currentRemaining = Number(adv.remainingAmount ?? adv.amount ?? 0);
        if (currentRemaining <= 0) continue;

        const consume = Math.min(currentRemaining, remainingToConsume);
        adv.remainingAmount = parseFloat((currentRemaining - consume).toFixed(2));
        adv.usedAmount = parseFloat(((Number(adv.usedAmount) || 0) + consume).toFixed(2));
        remainingToConsume = parseFloat((remainingToConsume - consume).toFixed(2));

        if (remainingToConsume <= 0) break;
      }
    }

    await saveDb();

    res.status(201).json({
      ...newPayment,
      customerName: customer.name,
      customerSeqId: customer.customerId
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/payments/:id
router.put('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { amountPaid, notes, openingBalance, advanceUsed } = req.body;
    const idx = db.payments.findIndex(payment => payment._id === req.params.id && payment.dairyId === req.dairyId);
    if (idx === -1) {
      return res.status(404).json({ error: 'Payment record not found' });
    }

    const payment = db.payments[idx];

    if (amountPaid !== undefined) {
      const paidNum = parseFloat(amountPaid);
      if (isNaN(paidNum) || paidNum < 0) {
        return res.status(400).json({ error: 'Amount paid must be a valid number' });
      }

      payment.amountPaid = paidNum;
    }

    if (openingBalance !== undefined) {
      payment.openingBalance = parseFloat(openingBalance) || 0;
    }

    if (advanceUsed !== undefined) {
      payment.advanceUsed = parseFloat(advanceUsed) || 0;
    }

    if (notes !== undefined) {
      payment.notes = notes || '';
    }

    const milkDue = (Number(payment.openingBalance) || 0) + (Number(payment.totalAmount) || 0);
    const appliedTotal = (Number(payment.amountPaid) || 0) + (Number(payment.advanceUsed) || 0);
    payment.balanceDue = parseFloat(Math.max(0, milkDue - appliedTotal).toFixed(2));
    payment.advanceCredit = parseFloat(Math.max(0, appliedTotal - milkDue).toFixed(2));

    db.payments[idx] = payment;
    await saveDb();

    const customer = db.customers.find(c => c._id === payment.customerId);
    res.json({
      ...payment,
      customerName: customer ? customer.name : 'Unknown',
      customerSeqId: customer ? customer.customerId : null
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/payments/:id
router.delete('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const idx = db.payments.findIndex(payment => payment._id === req.params.id && payment.dairyId === req.dairyId);
    if (idx === -1) {
      return res.status(404).json({ error: 'Payment record not found' });
    }

    db.payments.splice(idx, 1);
    await saveDb();

    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
