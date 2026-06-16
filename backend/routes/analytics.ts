import express, { Response, NextFunction } from 'express';
import { db } from '../db';
import authMiddleware, { AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();
router.use(authMiddleware);

// Helper to check if a date is within the requested range
function isDateInRange(dateStr: string, filter: string) {
  const dateObj = new Date(dateStr);
  const now = new Date();
  
  if (filter === 'today') {
    return dateObj.toDateString() === now.toDateString();
  } else if (filter === '7days') {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    return dateObj >= sevenDaysAgo;
  } else if (filter === '30days') {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    return dateObj >= thirtyDaysAgo;
  }
  
  return dateObj.toDateString() === now.toDateString();
}

// @route   GET /api/analytics/summary
router.get('/summary', (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { filter } = req.query; // today | 7days | 30days
    const targetFilter = String(filter || 'today');

    const dairyCollections = db.collections.filter(tx => tx.dairyId === req.dairyId);
    const dairySales = db.sales.filter(tx => tx.dairyId === req.dairyId);
    const dairyAdvances = db.advances.filter(adv => adv.dairyId === req.dairyId);
    const dairyPayments = db.payments.filter(payment => payment.dairyId === req.dairyId);
    
    const totalCustomersGiving = db.customers.filter(c => c.dairyId === req.dairyId && c.type === 'give').length;
    const totalCustomersTaking = db.customers.filter(c => c.dairyId === req.dairyId && c.type === 'take').length;
    
    const pendingDues = dairySales.reduce((sum, tx) => sum + (tx.balanceDue || 0), 0);
    const advancesGiven = dairyAdvances.reduce((sum, adv) => sum + (adv.amount || adv.originalAmount || 0), 0);
    const advancesUsed = dairyAdvances.reduce((sum, adv) => sum + (adv.usedAmount || 0), 0);
    const advancesRemaining = dairyAdvances.reduce((sum, adv) => sum + (adv.remainingAmount ?? adv.amount ?? 0), 0);
    const paymentCredits = dairyPayments.reduce((sum, payment) => sum + (payment.advanceCreditRemaining ?? payment.advanceCredit ?? 0), 0);
    const totalAdvanceAvailable = Math.max(0, advancesRemaining + paymentCredits);

    const filteredCollections = dairyCollections.filter(tx => isDateInRange(tx.date, targetFilter));
    const filteredSales = dairySales.filter(tx => isDateInRange(tx.date, targetFilter));

    const totalMilkCollected = filteredCollections.reduce((sum, tx) => sum + tx.liters, 0);
    const totalCollectionAmount = filteredCollections.reduce((sum, tx) => sum + tx.totalAmount, 0);

    const totalMilkSold = filteredSales.reduce((sum, tx) => sum + tx.liters, 0);
    const totalSaleAmount = filteredSales.reduce((sum, tx) => sum + tx.totalAmount, 0);

    const breakdownMap: Record<string, { date: string, collected: number, sold: number, amount: number, collectedAmount: number, soldAmount: number }> = {};

    filteredCollections.forEach(tx => {
      const day = tx.date.split('T')[0];
      if (!breakdownMap[day]) {
        breakdownMap[day] = { date: day, collected: 0, sold: 0, amount: 0, collectedAmount: 0, soldAmount: 0 };
      }
      breakdownMap[day].collected += tx.liters;
      breakdownMap[day].collectedAmount += tx.totalAmount;
      breakdownMap[day].amount += tx.totalAmount;
    });

    filteredSales.forEach(tx => {
      const day = tx.date.split('T')[0];
      if (!breakdownMap[day]) {
        breakdownMap[day] = { date: day, collected: 0, sold: 0, amount: 0, collectedAmount: 0, soldAmount: 0 };
      }
      breakdownMap[day].sold += tx.liters;
      breakdownMap[day].soldAmount += tx.totalAmount;
      breakdownMap[day].amount += tx.totalAmount;
    });

    const dailyBreakdown = Object.values(breakdownMap).map(day => ({
      ...day,
      collected: parseFloat(day.collected.toFixed(2)),
      sold: parseFloat(day.sold.toFixed(2)),
      collectedAmount: parseFloat(day.collectedAmount.toFixed(2)),
      soldAmount: parseFloat(day.soldAmount.toFixed(2)),
      amount: parseFloat(day.amount.toFixed(2))
    }));

    dailyBreakdown.sort((a, b) => a.date.localeCompare(b.date));

    if (dailyBreakdown.length === 0 && targetFilter === 'today') {
      const todayStr = new Date().toISOString().split('T')[0];
      dailyBreakdown.push({
        date: todayStr,
        collected: 0,
        sold: 0,
        collectedAmount: 0,
        soldAmount: 0,
        amount: 0
      });
    }

    res.json({
      totalMilkCollected: parseFloat(totalMilkCollected.toFixed(2)),
      totalMilkSold: parseFloat(totalMilkSold.toFixed(2)),
      totalCollectionAmount: parseFloat(totalCollectionAmount.toFixed(2)),
      totalSaleAmount: parseFloat(totalSaleAmount.toFixed(2)),
      totalCustomersGiving,
      totalCustomersTaking,
      pendingDues: parseFloat(pendingDues.toFixed(2)),
      advancesGiven: parseFloat(advancesGiven.toFixed(2)),
      advancesUsed: parseFloat((advancesUsed + dairyPayments.reduce((sum, payment) => sum + (payment.advanceCreditUsed || 0), 0)).toFixed(2)),
      advancesRemaining: parseFloat(totalAdvanceAvailable.toFixed(2)),
      dailyBreakdown
    });
  } catch (error) {
    next(error);
  }
});

export default router;
