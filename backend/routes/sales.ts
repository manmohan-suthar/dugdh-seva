import express, { Response, NextFunction } from 'express';
import { db, saveDb, generateId } from '../db';
import authMiddleware, { AuthenticatedRequest } from '../middleware/auth';
import { rebuildBuyerLedgerForCustomer } from '../lib/buyerLedger';

const router = express.Router();
router.use(authMiddleware);

// @route   GET /api/sales
router.get('/', (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { customerId, date, startDate, endDate } = req.query;
    let list = db.sales.filter(tx => tx.dairyId === req.dairyId);

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

// @route   POST /api/sales
router.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { customerId, date, animalType, liters, amountPaid, notes } = req.body;

    if (!customerId || !liters || !animalType) {
      return res.status(400).json({ error: 'Customer, animal type (cow/buffalo) and liters are required' });
    }

    const customer = db.customers.find(c => c._id === customerId && c.dairyId === req.dairyId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const priceEntry = db.prices.find(p => p.dairyId === req.dairyId && p.animalType === animalType);
    const ratePerLiter = priceEntry ? priceEntry.pricePerLiter : (animalType === 'cow' ? 60 : 80);

    const litersNum = parseFloat(liters);
    const totalAmount = parseFloat((litersNum * ratePerLiter).toFixed(2));
    const paidNum = parseFloat(amountPaid) || 0;
    const balanceDue = parseFloat((totalAmount - paidNum).toFixed(2));

    const newSale = {
      _id: generateId(),
      dairyId: req.dairyId,
      customerId,
      date: date ? new Date(date).toISOString() : new Date().toISOString(),
      animalType,
      liters: litersNum,
      ratePerLiter,
      totalAmount,
      initialAmountPaid: paidNum,
      amountPaid: paidNum,
      balanceDue,
      notes: notes || '',
      createdAt: new Date().toISOString()
    };

    db.sales.push(newSale);
    await saveDb();

    res.status(201).json({
      ...newSale,
      customerName: customer.name,
      customerSeqId: customer.customerId
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/sales/:id
router.get('/:id', (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const sale = db.sales.find(tx => tx._id === req.params.id && tx.dairyId === req.dairyId);
    if (!sale) {
      return res.status(404).json({ error: 'Sale transaction not found' });
    }
    const customer = db.customers.find(c => c._id === sale.customerId);
    res.json({
      ...sale,
      customerName: customer ? customer.name : 'Unknown',
      customerSeqId: customer ? customer.customerId : null
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/sales/:id
router.put('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { liters, amountPaid, notes, animalType, date } = req.body;
    const index = db.sales.findIndex(tx => tx._id === req.params.id && tx.dairyId === req.dairyId);

    if (index === -1) {
      return res.status(404).json({ error: 'Sale transaction not found' });
    }

    const sale = db.sales[index];
    if (notes !== undefined) sale.notes = notes;
    if (date) sale.date = new Date(date).toISOString();

    const finalAnimalType = animalType || sale.animalType;
    const finalLiters = liters !== undefined ? parseFloat(liters) : sale.liters;
    const finalAmountPaid = amountPaid !== undefined ? parseFloat(amountPaid) : sale.amountPaid;

    if (animalType || liters !== undefined || amountPaid !== undefined) {
      const priceEntry = db.prices.find(p => p.dairyId === req.dairyId && p.animalType === finalAnimalType);
      const ratePerLiter = priceEntry ? priceEntry.pricePerLiter : (finalAnimalType === 'cow' ? 60 : 80);

      sale.animalType = finalAnimalType;
      sale.liters = finalLiters;
      sale.ratePerLiter = ratePerLiter;
      sale.totalAmount = parseFloat((finalLiters * ratePerLiter).toFixed(2));
      sale.initialAmountPaid = finalAmountPaid;
      sale.amountPaid = finalAmountPaid;
      sale.balanceDue = parseFloat((sale.totalAmount - finalAmountPaid).toFixed(2));
    }

    db.sales[index] = sale;
    rebuildBuyerLedgerForCustomer(sale.customerId, req.dairyId);
    await saveDb();

    const customer = db.customers.find(c => c._id === sale.customerId);
    res.json({
      ...sale,
      customerName: customer ? customer.name : 'Unknown',
      customerSeqId: customer ? customer.customerId : null
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/sales/:id
router.delete('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const index = db.sales.findIndex(tx => tx._id === req.params.id && tx.dairyId === req.dairyId);
    if (index === -1) {
      return res.status(404).json({ error: 'Sale transaction not found' });
    }

    const sale = db.sales[index];
    db.sales.splice(index, 1);
    const customerId = sale.customerId;
    rebuildBuyerLedgerForCustomer(customerId, req.dairyId);
    await saveDb();

    res.json({ message: 'Sale transaction deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
