import express, { Response, NextFunction } from 'express';
import { db, saveDb, generateId } from '../db';
import authMiddleware, { AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();
router.use(authMiddleware);

// @route   GET /api/customers
router.get('/', (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { type, search } = req.query;
    let filtered = db.customers.filter(c => c.dairyId === req.dairyId);

    if (type) {
      filtered = filtered.filter(c => c.type === type);
    }

    if (search) {
      const searchStr = String(search).toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(searchStr) || 
        (c.phone && c.phone.includes(searchStr)) ||
        String(c.customerId) === searchStr
      );
    }

    filtered.sort((a, b) => a.customerId - b.customerId);
    res.json(filtered);
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/customers
router.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { name, phone, type, milkType } = req.body;

    if (!name || !type || !milkType) {
      return res.status(400).json({ error: 'Name, type (give/take), and milk type (cow/buffalo) are required' });
    }

    if (!['give', 'take'].includes(type)) {
      return res.status(400).json({ error: 'Type must be "give" or "take"' });
    }

    if (!['cow', 'buffalo'].includes(milkType)) {
      return res.status(400).json({ error: 'Milk Type must be "cow" or "buffalo"' });
    }

    const dairyCustomers = db.customers.filter(c => c.dairyId === req.dairyId);
    let newId = 1;
    if (dairyCustomers.length > 0) {
      newId = Math.max(...dairyCustomers.map(c => c.customerId || 0)) + 1;
    }

    const newCustomer = {
      _id: generateId(),
      dairyId: req.dairyId,
      customerId: newId,
      name,
      phone: phone || '',
      type,
      milkType,
      createdAt: new Date().toISOString()
    };

    db.customers.push(newCustomer);
    await saveDb();

    res.status(201).json(newCustomer);
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/customers/:id
router.get('/:id', (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const customer = db.customers.find(c => c._id === req.params.id && c.dairyId === req.dairyId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(customer);
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/customers/:id
router.put('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { name, phone, type, milkType } = req.body;
    const index = db.customers.findIndex(c => c._id === req.params.id && c.dairyId === req.dairyId);

    if (index === -1) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customer = db.customers[index];
    if (name) customer.name = name;
    if (phone !== undefined) customer.phone = phone;
    if (type) {
      if (!['give', 'take'].includes(type)) {
        return res.status(400).json({ error: 'Type must be either "give" or "take"' });
      }
      customer.type = type;
    }
    if (milkType) {
      if (!['cow', 'buffalo'].includes(milkType)) {
        return res.status(400).json({ error: 'Milk type must be "cow" or "buffalo"' });
      }
      customer.milkType = milkType;
    }

    db.customers[index] = customer;
    await saveDb();

    res.json(customer);
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/customers/:id
router.delete('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const index = db.customers.findIndex(c => c._id === req.params.id && c.dairyId === req.dairyId);
    if (index === -1) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    db.customers.splice(index, 1);
    
    // Cleanup related entries
    db.collections = db.collections.filter(tx => tx.customerId !== req.params.id);
    db.sales = db.sales.filter(tx => tx.customerId !== req.params.id);
    db.advances = db.advances.filter(adv => adv.customerId !== req.params.id);

    await saveDb();
    res.json({ message: 'Customer and related transactions deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
