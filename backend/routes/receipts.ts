import express, { NextFunction, Response } from 'express';
import { db, generateId, saveDb } from '../db';
import authMiddleware, { AuthenticatedRequest } from '../middleware/auth';
import { rebuildBuyerLedgerForCustomer } from '../lib/buyerLedger';

const router = express.Router();
router.use(authMiddleware);

function enrichReceipt(receipt: any) {
  const customer = db.customers.find((c) => c._id === receipt.customerId);
  return {
    ...receipt,
    customerName: customer ? customer.name : 'Unknown',
    customerSeqId: customer ? customer.customerId : null
  };
}

// @route   GET /api/receipts
router.get('/', (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { customerId } = req.query;
    let list = db.receipts.filter((receipt) => receipt.dairyId === req.dairyId);

    if (customerId) {
      list = list.filter((receipt) => receipt.customerId === customerId);
    }

    list.sort((a, b) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime());
    res.json(list.map(enrichReceipt));
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/receipts
router.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { customerId, date, saleIds, openingBalance, amountReceived, creditUsed, notes } = req.body;

    if (!customerId) {
      return res.status(400).json({ error: 'Customer is required' });
    }

    const customer = db.customers.find((c) => c._id === customerId && c.dairyId === req.dairyId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const selectedSaleIds = Array.isArray(saleIds) ? saleIds.filter(Boolean) : [];
    if (selectedSaleIds.length === 0) {
      return res.status(400).json({ error: 'Kam se kam ek sale select karein' });
    }

    const sales = db.sales.filter((sale) => sale.customerId === customerId && sale.dairyId === req.dairyId);
    const selectedTotal = sales
      .filter((sale) => selectedSaleIds.includes(sale._id))
      .reduce((sum, sale) => sum + (sale.balanceDue ?? Math.max(0, sale.totalAmount - (sale.amountPaid || 0))), 0);

    const receipt = {
      _id: generateId(),
      dairyId: req.dairyId,
      customerId,
      date: date ? new Date(date).toISOString() : new Date().toISOString(),
      saleIds: selectedSaleIds,
      openingBalance: parseFloat((parseFloat(openingBalance) || 0).toFixed(2)),
      totalAmount: parseFloat(selectedTotal.toFixed(2)),
      amountReceived: parseFloat((parseFloat(amountReceived) || 0).toFixed(2)),
      creditUsed: parseFloat((parseFloat(creditUsed) || 0).toFixed(2)),
      balanceDue: 0,
      creditRemaining: 0,
      allocatedAmount: 0,
      notes: notes || '',
      createdAt: new Date().toISOString()
    };

    db.receipts.push(receipt);
    rebuildBuyerLedgerForCustomer(customerId, req.dairyId);
    await saveDb();

    res.status(201).json(enrichReceipt(receipt));
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/receipts/:id
router.get('/:id', (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const receipt = db.receipts.find((item) => item._id === req.params.id && item.dairyId === req.dairyId);
    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }
    res.json(enrichReceipt(receipt));
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/receipts/:id
router.put('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const index = db.receipts.findIndex((item) => item._id === req.params.id && item.dairyId === req.dairyId);
    if (index === -1) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    const receipt = db.receipts[index];
    const { date, saleIds, openingBalance, amountReceived, creditUsed, notes } = req.body;

    if (date) receipt.date = new Date(date).toISOString();
    if (Array.isArray(saleIds)) receipt.saleIds = saleIds.filter(Boolean);
    if (openingBalance !== undefined) receipt.openingBalance = parseFloat(openingBalance) || 0;
    if (amountReceived !== undefined) receipt.amountReceived = parseFloat(amountReceived) || 0;
    if (creditUsed !== undefined) receipt.creditUsed = parseFloat(creditUsed) || 0;
    if (notes !== undefined) receipt.notes = notes;

    rebuildBuyerLedgerForCustomer(receipt.customerId, req.dairyId);
    await saveDb();

    res.json(enrichReceipt(receipt));
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/receipts/:id
router.delete('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const index = db.receipts.findIndex((item) => item._id === req.params.id && item.dairyId === req.dairyId);
    if (index === -1) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    const [receipt] = db.receipts.splice(index, 1);
    rebuildBuyerLedgerForCustomer(receipt.customerId, req.dairyId);
    await saveDb();

    res.json({ message: 'Receipt deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;

