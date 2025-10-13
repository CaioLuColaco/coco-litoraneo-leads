import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const sellersRoutes = Router();

sellersRoutes.get('/', async (req, res, next) => {
  try {
    const sellers = await prisma.seller.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: sellers, message: 'OK', timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

sellersRoutes.post('/', async (req, res, next) => {
  try {
    const {
      name,
      birthDate,
      phone,
      email,
      address,
      city,
      state,
      zipCode,
      responsibleRegion,
    } = req.body || {};

    if (!name || !email || !phone || !city || !state || !responsibleRegion || !birthDate) {
      return res.status(400).json({ success: false, message: 'Campos obrigatórios ausentes', timestamp: new Date().toISOString() });
    }

    const parsedDate = new Date(birthDate);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Data de nascimento inválida', timestamp: new Date().toISOString() });
    }

    const seller = await prisma.seller.create({
      data: {
        name: String(name).trim(),
        birthDate: parsedDate,
        phone: String(phone).trim(),
        email: String(email).trim().toLowerCase(),
        address: address ? String(address).trim() : '',
        city: String(city).trim(),
        state: String(state).trim().toUpperCase(),
        zipCode: zipCode ? String(zipCode).trim() : '',
        responsibleRegion: String(responsibleRegion).trim(),
      },
    });
    res.status(201).json({ success: true, data: seller, message: 'Created', timestamp: new Date().toISOString() });
  } catch (err: any) {
    console.error('Erro ao criar vendedor:', err?.message || err);
    return res.status(500).json({ success: false, message: 'Erro interno ao criar vendedor', timestamp: new Date().toISOString() });
  }
});


