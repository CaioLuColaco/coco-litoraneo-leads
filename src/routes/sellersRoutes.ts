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
      latitude,
      longitude,
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
        latitude: typeof latitude === 'number' ? latitude : (latitude ? Number(latitude) : null),
        longitude: typeof longitude === 'number' ? longitude : (longitude ? Number(longitude) : null),
        imageUrl: req.body?.imageUrl ? String(req.body.imageUrl).trim() : null,
      },
    });
    res.status(201).json({ success: true, data: seller, message: 'Created', timestamp: new Date().toISOString() });
  } catch (err: any) {
    console.error('Erro ao criar vendedor:', err?.message || err);
    return res.status(500).json({ success: false, message: 'Erro interno ao criar vendedor', timestamp: new Date().toISOString() });
  }
});

// Atualizar vendedor
sellersRoutes.put('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const data: any = { ...req.body };
    if (data.birthDate) {
      const d = new Date(data.birthDate);
      if (!isNaN(d.getTime())) data.birthDate = d;
      else delete data.birthDate;
    }
    if (typeof data.state === 'string') data.state = data.state.toUpperCase();
    if (typeof data.email === 'string') data.email = data.email.toLowerCase();
    if (data.latitude !== undefined) {
      const latNum = Number(data.latitude);
      data.latitude = Number.isFinite(latNum) ? latNum : null;
    }
    if (data.longitude !== undefined) {
      const lonNum = Number(data.longitude);
      data.longitude = Number.isFinite(lonNum) ? lonNum : null;
    }

    if (data.imageUrl !== undefined) {
      data.imageUrl = data.imageUrl ? String(data.imageUrl).trim() : null;
    }
    const updated = await prisma.seller.update({ where: { id }, data });
    res.json({ success: true, data: updated, message: 'Updated', timestamp: new Date().toISOString() });
  } catch (err: any) {
    console.error('Erro ao atualizar vendedor:', err?.message || err);
    res.status(500).json({ success: false, message: 'Erro interno ao atualizar vendedor', timestamp: new Date().toISOString() });
  }
});

// Deletar vendedor
sellersRoutes.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.seller.delete({ where: { id } });
    res.status(204).send();
  } catch (err: any) {
    console.error('Erro ao deletar vendedor:', err?.message || err);
    res.status(500).json({ success: false, message: 'Erro interno ao deletar vendedor', timestamp: new Date().toISOString() });
  }
});


