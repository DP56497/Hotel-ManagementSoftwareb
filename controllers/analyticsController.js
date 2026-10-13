import Analytics from '../models/analyticsModel.js';

export const getAnalyticsOverview = async (req, res) => {
  try {
    const data = await Analytics.find().sort({ createdAt: -1 }).limit(7);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load analytics', error: error.message });
  }
};

export const seedAnalytics = async (req, res) => {
  try {
    await Analytics.deleteMany({});
    const seed = [
      { date: '2026-07-01', revenue: 320000, occupancy: 72, rooms: 120, pendingTasks: 18, completedTasks: 112, staffPerformance: 84, kitchenExpenses: 18000, monthlyProfit: 240000, insights: ['Weekend bookings are growing', 'Room cleaning efficiency improved'] },
      { date: '2026-07-02', revenue: 335000, occupancy: 74, rooms: 120, pendingTasks: 16, completedTasks: 124, staffPerformance: 86, kitchenExpenses: 19500, monthlyProfit: 248000, insights: ['Occupancy is stabilizing'] },
      { date: '2026-07-03', revenue: 348000, occupancy: 78, rooms: 120, pendingTasks: 14, completedTasks: 136, staffPerformance: 88, kitchenExpenses: 20000, monthlyProfit: 252000, insights: ['Manager Rahul is performing strongly'] }
    ];
    const result = await Analytics.insertMany(seed);
    res.json({ ok: true, count: result.length });
  } catch (error) {
    res.status(500).json({ message: 'Failed to seed analytics', error: error.message });
  }
};
