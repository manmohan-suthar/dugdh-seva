import express, { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, saveDb, generateId, seedDairyDefaults } from '../db';
import authMiddleware, { AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dairy_secret_backup_key';

// @route   POST /api/auth/register
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { dairyName, ownerName, address, phone, password } = req.body;

    if (!dairyName || !ownerName || !address || !phone || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existingDairy = db.dairies.find(d => d.phone === phone);
    if (existingDairy) {
      return res.status(400).json({ error: 'Mobile number already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newDairy = {
      _id: generateId(),
      dairyName,
      ownerName,
      address,
      phone,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    db.dairies.push(newDairy);
    await saveDb();

    // Seed default prices and rate charts info
    await seedDairyDefaults(newDairy._id);

    const token = jwt.sign({ id: newDairy._id }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...dairyData } = newDairy;

    res.status(201).json({ token, dairy: dairyData });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ error: 'Phone and password are required' });
    }

    const dairy = db.dairies.find(d => d.phone === phone);
    if (!dairy) {
      return res.status(400).json({ error: 'Invalid phone or password' });
    }

    const isMatch = await bcrypt.compare(password, dairy.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid phone or password' });
    }

    const token = jwt.sign({ id: dairy._id }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...dairyData } = dairy;

    res.json({ token, dairy: dairyData });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/auth/me
router.get('/me', authMiddleware, (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const dairy = db.dairies.find(d => d._id === req.dairyId);
    if (!dairy) {
      return res.status(404).json({ error: 'Dairy not found' });
    }

    const { password: _, ...dairyData } = dairy;
    res.json(dairyData);
  } catch (error) {
    next(error);
  }
});

export default router;
