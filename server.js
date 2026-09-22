const express = require('express');
const { PrismaClient } = require('@prisma/client');
const cors = require('cors');

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// 1. Fetch Today's Dashboard Metrics
app.get('/api/dashboard/summary', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0,0,0,0);

        const totalRevenue = await prisma.payment.aggregate({
            _sum: { amount: true },
            where: { createdAt: { gte: today } }
        });

        const carsWashed = await prisma.vehicleRecord.count({
            where: { status: 'Paid', createdAt: { gte: today } }
        });

        const activeInBay = await prisma.vehicleRecord.count({
            where: { status: 'In Progress' }
        });

        const activeStaff = await prisma.attendance.count({
            where: { clockOut: null }
        });

        res.json({
            revenueToday: totalRevenue._sum.amount || 0,
            carsWashedToday: carsWashed,
            activeInBay,
            activeStaff
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Log New Vehicle
app.post('/api/vehicles', async (req, res) => {
    const { plate, model, service, attendants, cost } = req.body;
    try {
        const record = await prisma.vehicleRecord.create({
            data: { plate, model, service, attendants, cost }
        });
        res.status(201).json(record);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. Complete Payment
app.post('/api/payments', async (req, res) => {
    const { vehicleRecordId, amount, paymentMethod } = req.body;
    try {
        const payment = await prisma.payment.create({
            data: {
                vehicleRecordId,
                amount,
                paymentMethod,
                mpesaDetails: paymentMethod === 'M-PESA' ? 'Pochi La Biashara (0141999747)' : null
            }
        });

        await prisma.vehicleRecord.update({
            where: { id: vehicleRecordId },
            data: { status: 'Paid' }
        });

        res.status(201).json(payment);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Twinnyz Carwash Server running on port ${PORT}`));