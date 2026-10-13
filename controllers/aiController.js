import { GoogleGenerativeAI } from '@google/generative-ai';
import mongoose from 'mongoose';
import AiReport from '../models/aiReportModel.js';
import Expense from '../models/expenseModel.js';
import CopilotChat from '../models/copilotChatModel.js';

export const getAiReports = async (req, res) => {
  try {
    const reports = await AiReport.find().sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load AI reports', error: error.message });
  }
};

export const createAiReport = async (req, res) => {
  try {
    const report = new AiReport(req.body);
    await report.save();
    res.status(201).json(report);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create AI report', error: error.message });
  }
};

/**
 * Intelligent local context-aware fallback when live Gemini API is not configured or offline.
 */
function generateContextualFallback({ prompt, role, orders, inventory, menuItems, expenses, totalRevenue, totalCosts, netRevenue, staffCount, managerCount }) {
  const lower = (prompt || '').toLowerCase().trim();

  // 1. Menu & Dish specific search
  const matchedDishes = menuItems.filter((dish) => {
    const name = (dish.name || dish.item || '').toLowerCase();
    return name && (lower.includes(name) || name.includes(lower));
  });

  if (matchedDishes.length > 0) {
    const dish = matchedDishes[0];
    return `🍽️ **${dish.name}** (${dish.category || 'Specialty'}): Available at ₹${dish.price || 0}. It is 100% vegetarian, freshly prepared by our kitchen team at Royal Plaza Hotel Surat.`;
  }

  // 2. Cuisine specific search
  if (lower.includes('gujarati')) {
    const gujDishes = menuItems.filter((m) => (m.category || '').toLowerCase().includes('gujarati')).slice(0, 5);
    const names = gujDishes.map((d) => `${d.name} (₹${d.price})`).join(', ');
    return `🥘 **Gujarati Specialties at Royal Plaza:** We offer authentic traditional items like ${names || 'Dhokla, Khandvi, Undhiyu, Thepla, Fafda'}. All prepared fresh with pure ingredients.`;
  }
  if (lower.includes('punjabi')) {
    const punDishes = menuItems.filter((m) => (m.category || '').toLowerCase().includes('punjabi')).slice(0, 5);
    const names = punDishes.map((d) => `${d.name} (₹${d.price})`).join(', ');
    return `🥘 **Punjabi Delicacies at Royal Plaza:** Delicious rich vegetarian dishes including ${names || 'Dal Makhani, Shahi Paneer, Paneer Tikka, Chole Masala'}.`;
  }
  if (lower.includes('south indian') || lower.includes('dosa') || lower.includes('idli')) {
    const siDishes = menuItems.filter((m) => (m.category || '').toLowerCase().includes('south')).slice(0, 5);
    const names = siDishes.map((d) => `${d.name} (₹${d.price})`).join(', ');
    return `🍛 **South Indian Flavors at Royal Plaza:** Crispy, steaming hot items like ${names || 'Masala Dosa, Mysore Masala Dosa, Idli Sambhar, Medu Vada'}.`;
  }
  if (lower.includes('chinese') || lower.includes('manchurian') || lower.includes('noodles')) {
    const chDishes = menuItems.filter((m) => (m.category || '').toLowerCase().includes('chinese')).slice(0, 5);
    const names = chDishes.map((d) => `${d.name} (₹${d.price})`).join(', ');
    return `🥢 **Indo-Chinese Favorites at Royal Plaza:** Zesty vegetarian dishes like ${names || 'Veg Manchurian, Hakka Noodles, Schezwan Fried Rice, Spring Rolls'}.`;
  }

  // 3. Recommendation inquiry
  if (lower.includes('recommend') || lower.includes('suggest') || lower.includes('kya khau') || lower.includes('best') || lower.includes('special')) {
    const sample = menuItems.slice(0, 4).map((d) => `${d.name} (₹${d.price})`).join(', ');
    return `✨ **Chef's Recommendations for you:** We highly recommend trying ${sample || 'Dhokla, Dal Makhani, Mysore Masala Dosa, and Veg Manchurian'}. What cuisine are you in the mood for today?`;
  }

  // 4. Financials / Revenue / Profit / Costs
  if (lower.includes('revenue') || lower.includes('sales') || lower.includes('earning') || lower.includes('kamai')) {
    return `💰 **Revenue Summary:** Current recorded revenue is ₹${totalRevenue.toLocaleString('en-IN')} across ${orders.length} order${orders.length === 1 ? '' : 's'}. Recorded operating costs are ₹${totalCosts.toLocaleString('en-IN')}, leaving a net revenue of ₹${netRevenue.toLocaleString('en-IN')}.`;
  }
  if (lower.includes('profit') || lower.includes('expense') || lower.includes('cost') || lower.includes('munafa') || lower.includes('kharch')) {
    return `📊 **Financial Health:**\n• Total Revenue: ₹${totalRevenue.toLocaleString('en-IN')}\n• Recorded Costs: ₹${totalCosts.toLocaleString('en-IN')} (${expenses.length} manual entries)\n• **Net Revenue After Costs:** ₹${netRevenue.toLocaleString('en-IN')}.`;
  }

  // 5. Inventory & Stock
  if (lower.includes('inventory') || lower.includes('stock') || lower.includes('raw material')) {
    const lowStock = inventory.filter((item) => Number(item.daysRemaining) <= 3 || /low/i.test(item.alert || ''));
    if (lowStock.length > 0) {
      const itemsList = lowStock.map((item) => `${item.item || item.name} (${item.currentStock ?? item.qty ?? 0} units remaining)`).join(', ');
      return `⚠️ **Inventory Attention Needed:** Low stock detected for: ${itemsList}. Please arrange replenishment before the next shift.`;
    }
    return `✅ **Inventory Status:** All ${inventory.length} tracked supplies are within healthy stock thresholds.`;
  }

  // 6. Staff & Team
  if (lower.includes('staff') || lower.includes('team') || lower.includes('manager') || lower.includes('employee')) {
    return `👥 **Team Overview:** Royal Plaza Hotel team currently consists of ${managerCount} manager${managerCount === 1 ? '' : 's'} and ${staffCount} staff member${staffCount === 1 ? '' : 's'}. Staff accounts are verified with live face capture and Aadhaar ID.`;
  }

  // 7. Orders
  if (lower.includes('order')) {
    const pendingOrders = orders.filter((o) => !['Completed', 'Cancelled'].includes(o.status));
    return `📦 **Orders Snapshot:** There are ${orders.length} total recorded orders (${pendingOrders.length} active/in-progress). Latest order total is ₹${Number(orders[0]?.total || 0).toLocaleString('en-IN')}.`;
  }

  // 8. Greetings & General
  if (lower.includes('hi') || lower.includes('hello') || lower.includes('namaste') || lower.includes('kem cho')) {
    return `Namaste! 🙏 Welcome to **Royal Plaza Hotel Copilot**. I am here to assist with hotel operations, guest ordering, menu recommendations (Gujarati, Punjabi, South Indian, Chinese), revenue metrics, inventory, and staff management. How may I assist you?`;
  }

  // 9. Default fallback
  return `I am your AI Hotel Copilot for Royal Plaza Hotel Surat (${role} view). Based on live workspace data:\n• **Menu:** ${menuItems.length} vegetarian dishes\n• **Orders:** ${orders.length} orders (₹${totalRevenue.toLocaleString('en-IN')} revenue)\n• **Costs:** ₹${totalCosts.toLocaleString('en-IN')} recorded\n• **Team:** ${staffCount + managerCount} team members\n\nYou can ask about specific dishes, revenue, profit after costs, inventory alerts, or customer service.`;
}

export const askCopilot = async (req, res) => {
  const { prompt, context = {} } = req.body || {};
  const role = req.user?.role || context.role || 'team member';
  const orders = Array.isArray(context.orders) ? context.orders : [];
  const inventory = Array.isArray(context.inventory) ? context.inventory : [];
  const menuItems = Array.isArray(context.menuItems) ? context.menuItems : [];

  // Fetch actual manual expenses from database if not provided in context
  let expenses = Array.isArray(context.expenses) ? context.expenses : [];
  if (expenses.length === 0 && mongoose.connection?.readyState === 1) {
    try {
      expenses = await Expense.find().sort({ createdAt: -1 });
    } catch {
      expenses = [];
    }
  }

  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const totalCosts = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
  const netRevenue = totalRevenue - totalCosts;
  const staffCount = Number(context.staffCount || 0);
  const managerCount = Number(context.managerCount || 0);

  // If Google Gemini API key is configured, use live LLM
  const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
  if (geminiApiKey) {
    try {
      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const sampleMenu = menuItems.slice(0, 15).map((d) => `${d.name} (${d.category || 'Dish'}: ₹${d.price})`).join('; ');
      const lowStockItems = inventory.filter((i) => Number(i.daysRemaining) <= 3 || /low/i.test(i.alert || '')).map((i) => i.item || i.name).join(', ');

      const systemPrompt = `You are the AI Hotel Copilot for "Royal Plaza Hotel Surat", a premier luxury hotel and pure vegetarian restaurant in Surat, Gujarat.
The current user interacting with you is in the role of: ${role}.

Real-time Hotel Data:
- Hotel Name: Royal Plaza Hotel Surat
- Total Active Menu Items: ${menuItems.length} authentic 100% vegetarian dishes across 4 cuisines: Gujarati, Punjabi, South Indian, and Indo-Chinese.
- Sample Menu Items & Pricing: ${sampleMenu}
- Orders: ${orders.length} total orders recorded. Total Revenue: ₹${totalRevenue.toLocaleString('en-IN')}.
- Hotel Costs: ₹${totalCosts.toLocaleString('en-IN')} (${expenses.length} manually recorded cost entries).
- Net Revenue After Costs: ₹${netRevenue.toLocaleString('en-IN')}.
- Inventory: ${inventory.length} tracked items. Urgent Low Stock: ${lowStockItems || 'None, all healthy'}.
- Team Members: ${managerCount} manager(s) and ${staffCount} staff member(s).

Instructions:
1. Answer the user's inquiry accurately, professionally, and concisely using the hotel's live data above.
2. If the user asks in Hindi or Hinglish, respond in natural, polite Hindi/Hinglish. If in English, respond in clear English.
3. Recommend only pure vegetarian dishes from the hotel menu when asked about food.
4. If asked about financial status or profit, refer accurately to the total revenue, manual costs, and net revenue after costs.
5. Keep answers courteous, formatted with clean bullet points or short paragraphs where helpful. Avoid generic fluff.`;

      const chatPrompt = `${systemPrompt}\n\nUser (${role}): "${prompt}"\nAI Copilot:`;
      const result = await model.generateContent(chatPrompt);
      const responseText = result.response.text();

      if (responseText && responseText.trim()) {
        const finalResponse = responseText.trim();
        if (mongoose.connection?.readyState === 1) {
          try {
            await CopilotChat.create({
              userId: req.user?.id ? String(req.user.id) : '',
              userName: req.user?.name || req.user?.email || 'User',
              userRole: role,
              prompt: String(prompt || '').trim(),
              response: finalResponse,
              source: 'gemini-llm'
            });
          } catch (dbErr) {
            console.warn('Failed to store copilot chat:', dbErr.message);
          }
        }
        return res.json({ response: finalResponse, source: 'gemini-llm' });
      }
    } catch (llmError) {
      console.warn('Gemini LLM error, falling back to intelligent local assistant:', llmError.message);
      // Fall through to intelligent local fallback
    }
  }

  // Intelligent local context-grounded fallback
  const fallbackResponse = generateContextualFallback({
    prompt,
    role,
    orders,
    inventory,
    menuItems,
    expenses,
    totalRevenue,
    totalCosts,
    netRevenue,
    staffCount,
    managerCount
  });

  if (mongoose.connection?.readyState === 1) {
    try {
      await CopilotChat.create({
        userId: req.user?.id ? String(req.user.id) : '',
        userName: req.user?.name || req.user?.email || 'User',
        userRole: role,
        prompt: String(prompt || '').trim(),
        response: fallbackResponse,
        source: 'intelligent-copilot'
      });
    } catch (dbErr) {
      console.warn('Failed to store copilot chat:', dbErr.message);
    }
  }

  res.json({ response: fallbackResponse, source: 'intelligent-copilot' });
};

export const getCopilotHistory = async (req, res) => {
  try {
    const userId = req.user?.id ? String(req.user.id) : '';
    const query = userId ? { $or: [{ userId }, { userId: '' }] } : {};
    const chats = await CopilotChat.find(query).sort({ createdAt: 1 }).limit(100).lean();
    res.json(chats);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch Copilot history', error: error.message });
  }
};

export const clearCopilotHistory = async (req, res) => {
  try {
    const userId = req.user?.id ? String(req.user.id) : '';
    if (userId) {
      await CopilotChat.deleteMany({ userId });
    } else {
      await CopilotChat.deleteMany({});
    }
    res.json({ message: 'Copilot chat history cleared' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to clear Copilot history', error: error.message });
  }
};
