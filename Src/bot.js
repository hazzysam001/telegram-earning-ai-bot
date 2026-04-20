require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { handleStart } = require('./handlers/startHandler');
const { startVerification, handleVerificationMessage, showDashboard } = require('./handlers/verificationHandler');
const { startAIChat, handleAIMessage, isUserInChat } = require('./handlers/aiChatHandler');
const { showTasks, handleTaskSelection, handleTaskSubmission, taskState } = require('./handlers/taskHandler');
const { showReferralMenu } = require('./handlers/referralHandler');
const { showDepositMenu, viewBankDetails, startDepositProcess, handleDepositInput, handleDepositScreenshot, depositState } = require('./handlers/depositHandler');
const { showWithdrawalMenu, startWithdrawalProcess, handleWithdrawalInput, withdrawalState } = require('./handlers/withdrawalHandler');
const { showAdvertisementMenu, startPostAd, selectAdType, handleAdInput, confirmAdvertisement, showUserAds, adState } = require('./handlers/advertisementHandler');
const { handleAdminPanel, viewAllUsers, viewPendingDeposits, viewPendingWithdrawals, startCreateTask, handleTaskCreation, viewStatistics, adminState } = require('./handlers/adminHandler');
const db = require('./utils/database');
const { getUser } = require('./utils/database');

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN not found');
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

db.initDB();

bot.onText(/\/start(.*)/, async (msg, match) => {
  try {
    const referrerId = match[1].trim();
    if (referrerId && referrerId !== '') {
      const refUserId = parseInt(referrerId);
      const referrer = db.getUser(refUserId);
      if (referrer) {
        const newUser = db.createUser(msg.from.id, msg.from.username || msg.from.first_name);
        if (newUser && !newUser.referredBy) {
          db.updateUser(msg.from.id, { referredBy: refUserId });
        }
      }
    }
    await handleStart(bot, msg);
  } catch (error) {
    console.error('Error in /start:', error);
  }
});

bot.onText(/\/admin(.*)/, async (msg, match) => {
  try {
    const password = match[1].trim();
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    await handleAdminPanel(bot, chatId, userId, password);
  } catch (error) {
    console.error('Error in /admin:', error);
  }
});

bot.on('callback_query', async (query) => {
  try {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;
    const user = getUser(userId);

    if (!user) {
      await bot.answerCallbackQuery(query.id, { text: 'User not found', show_alert: true });
      return;
    }

    if (data === 'verify_start') {
      await startVerification(bot, chatId, userId);
      await bot.answerCallbackQuery(query.id);
    }

    if (data === 'back_to_dashboard') {
      if (!user.verified) {
        await bot.answerCallbackQuery(query.id, { text: 'Please verify first', show_alert: true });
        return;
      }
      await showDashboard(bot, chatId, userId);
      await bot.answerCallbackQuery(query.id);
    }

    if (data === 'ai_chat') {
      if (!user.verified) {
        await bot.answerCallbackQuery(query.id, { text: 'Please verify first', show_alert: true });
        return;
      }
      await startAIChat(bot, chatId, userId);
      await bot.answerCallbackQuery(query.id);
    }

    if (data === 'tasks_menu') {
      if (!user.verified) {
        await bot.answerCallbackQuery(query.id, { text: 'Please verify first', show_alert: true });
        return;
      }
      await showTasks(bot, chatId, userId);
      await bot.answerCallbackQuery(query.id);
    }

    if (data.startsWith('task_')) {
      const taskId = parseInt(data.split('_')[1]);
      await handleTaskSelection(bot, chatId, userId, taskId);
      await bot.answerCallbackQuery(query.id);
    }

    if (data === 'refer_menu') {
      if (!user.verified) {
        await bot.answerCallbackQuery(query.id, { text: 'Please verify first', show_alert: true });
        return;
      }
      await showReferralMenu(bot, chatId, userId);
      await bot.answerCallbackQuery(query.id);
    }

    if (data === 'deposit_menu') {
      if (!user.verified) {
        await bot.answerCallbackQuery(query.id, { text: 'Please verify first', show_alert: true });
        return;
      }
      await showDepositMenu(bot, chatId, userId);
      await bot.answerCallbackQuery(query.id);
    }

    if (data === 'deposit_submit') {
      await startDepositProcess(bot, chatId, userId);
      await bot.answerCallbackQuery(query.id);
    }

    if (data === 'view_bank_details') {
      await viewBankDetails(bot, chatId);
      await bot.answerCallbackQuery(query.id);
    }

    if (data === 'withdraw_menu') {
      if (!user.verified) {
        await bot.answerCallbackQuery(query.id, { text: 'Please verify first', show_alert: true });
        return;
      }
      await showWithdrawalMenu(bot, chatId, userId);
      await bot.answerCallbackQuery(query.id);
    }

    if (data === 'withdraw_submit') {
      await startWithdrawalProcess(bot, chatId, userId);
      await bot.answerCallbackQuery(query.id);
    }

    if (data === 'ad_menu') {
      if (!user.verified) {
        await bot.answerCallbackQuery(query.id, { text: 'Please verify first', show_alert: true });
        return;
      }
      await showAdvertisementMenu(bot, chatId, userId);
      await bot.answerCallbackQuery(query.id);
    }

    if (data === 'post_new_ad') {
      await startPostAd(bot, chatId, userId);
      await bot.answerCallbackQuery(query.id);
    }

    if (data.startsWith('ad_type_')) {
      const type = data.split('_')[2];
      await selectAdType(bot, chatId, userId, type);
      await bot.answerCallbackQuery(query.id);
    }

    if (data === 'confirm_ad') {
      await confirmAdvertisement(bot, chatId, userId);
      await bot.answerCallbackQuery(query.id);
    }

    if (data === 'cancel_ad') {
      delete adState[userId];
      await bot.answerCallbackQuery(query.id, { text: 'Ad cancelled' });
      await showDashboard(bot, chatId, userId);
    }

    if (data === 'my_ads') {
      await showUserAds(bot, chatId, userId);
      await bot.answerCallbackQuery(query.id);
    }

    if (data === 'admin_users') {
      if (!adminState[userId] || !adminState[userId].isAdmin) {
        await bot.answerCallbackQuery(query.id, { text: 'Access denied', show_alert: true });
        return;
      }
      await viewAllUsers(bot, chatId);
      await bot.answerCallbackQuery(query.id);
    }

    if (data === 'admin_deposits') {
      if (!adminState[userId] || !adminState[userId].isAdmin) {
        await bot.answerCallbackQuery(query.id, { text: 'Access denied', show_alert: true });
        return;
      }
      await viewPendingDeposits(bot, chatId);
      await bot.answerCallbackQuery(query.id);
    }

    if (data.startsWith('approve_deposit_')) {
      if (!adminState[userId] || !adminState[userId].isAdmin) {
        await bot.answerCallbackQuery(query.id, { text: 'Access denied', show_alert: true });
        return;
      }
      const depositId = parseInt(data.split('_')[2]);
      db.approveDeposit(depositId);
      const deposit = db.getDeposits().find(d => d.id === depositId);
      if (deposit) {
        await bot.sendMessage(deposit.userId, `✅ Deposit ₦${deposit.amount} approved!`, {
          reply_markup: { inline_keyboard: [[{ text: 'Dashboard', callback_data: 'back_to_dashboard' }]] }
        });
      }
      await viewPendingDeposits(bot, chatId);
      await bot.answerCallbackQuery(query.id, { text: 'Approved' });
    }

    if (data.startsWith('reject_deposit_')) {
      if (!adminState[userId] || !adminState[userId].isAdmin) {
        await bot.answerCallbackQuery(query.id, { text: 'Access denied', show_alert: true });
        return;
      }
      const depositId = parseInt(data.split('_')[2]);
      db.rejectDeposit(depositId);
      await viewPendingDeposits(bot, chatId);
      await bot.answerCallbackQuery(query.id, { text: 'Rejected' });
    }

    if (data === 'admin_withdrawals') {
      if (!adminState[userId] || !adminState[userId].isAdmin) {
        await bot.answerCallbackQuery(query.id, { text: 'Access denied', show_alert: true });
        return;
      }
      await viewPendingWithdrawals(bot, chatId);
      await bot.answerCallbackQuery(query.id);
    }

    if (data.startsWith('approve_withdrawal_')) {
      if (!adminState[userId] || !adminState[userId].isAdmin) {
        await bot.answerCallbackQuery(query.id, { text: 'Access denied', show_alert: true });
        return;
      }
      const withdrawalId = parseInt(data.split('_')[2]);
      db.approveWithdrawal(withdrawalId);
      const withdrawal = db.getWithdrawals().find(w => w.id === withdrawalId);
      if (withdrawal) {
        await bot.sendMessage(withdrawal.userId, `✅ Withdrawal ₦${withdrawal.amount} approved!`);
      }
      await viewPendingWithdrawals(bot, chatId);
      await bot.answerCallbackQuery(query.id, { text: 'Approved' });
    }

    if (data.startsWith('reject_withdrawal_')) {
      if (!adminState[userId] || !adminState[userId].isAdmin) {
        await bot.answerCallbackQuery(query.id, { text: 'Access denied', show_alert: true });
        return;
      }
      const withdrawalId = parseInt(data.split('_')[2]);
      db.rejectWithdrawal(withdrawalId);
      await viewPendingWithdrawals(bot, chatId);
      await bot.answerCallbackQuery(query.id, { text: 'Rejected' });
    }

    if (data === 'admin_create_task') {
      if (!adminState[userId] || !adminState[userId].isAdmin) {
        await bot.answerCallbackQuery(query.id, { text: 'Access denied', show_alert: true });
        return;
      }
      await startCreateTask(bot, chatId);
      await bot.answerCallbackQuery(query.id);
    }

    if (data === 'admin_stats') {
      if (!adminState[userId] || !adminState[userId].isAdmin) {
        await bot.answerCallbackQuery(query.id, { text: 'Access denied', show_alert: true });
        return;
      }
      await viewStatistics(bot, chatId);
      await bot.answerCallbackQuery(query.id);
    }

    if (data === 'admin_exit') {
      delete adminState[userId];
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId, '👋 Admin closed');
    }

    if (data === 'back_to_admin') {
      await handleAdminPanel(bot, chatId, userId, process.env.ADMIN_PASSWORD);
      await bot.answerCallbackQuery(query.id);
    }
  } catch (error) {
    console.error('Callback error:', error);
  }
});

bot.on('message', async (msg) => {
  try {
    const userId = msg.from.id;
    const chatId = msg.chat.id;

    if (msg.text && msg.text.startsWith('/')) return;

    if (isUserInChat(userId)) {
      await handleAIMessage(bot, msg);
      return;
    }

    if (taskState[userId] && taskState[userId].step > 0) {
      await handleTaskSubmission(bot, msg);
      return;
    }

    if (depositState[userId] && depositState[userId].step > 0) {
      await handleDepositInput(bot, msg);
      return;
    }

    if (withdrawalState[userId] && withdrawalState[userId].step > 0) {
      await handleWithdrawalInput(bot, msg);
      return;
    }

    if (adState[userId] && adState[userId].step > 0) {
      await handleAdInput(bot, msg);
      return;
    }

    if (adminState[chatId] && adminState[chatId].taskStep) {
      await handleTaskCreation(bot, msg);
      return;
    }

    const user = getUser(userId);
    if (user && !user.verified) {
      await handleVerificationMessage(bot, msg);
      return;
    }

    if (msg.photo && depositState[userId] && depositState[userId].step === 4) {
      await handleDepositScreenshot(bot, msg);
      return;
    }
  } catch (error) {
    console.error('Message error:', error);
  }
});

bot.on('polling_error', (error) => console.error('Polling error:', error));
bot.on('error', (error) => console.error('Bot error:', error));

module.exports = bot;
