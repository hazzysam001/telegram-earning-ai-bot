const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../database.json');

const initDB = () => {
  if (!fs.existsSync(DB_PATH)) {
    const initialDB = {
      users: [],
      tasks: [],
      deposits: [],
      withdrawals: [],
      advertisements: [],
      adminSettings: {
        bankDetails: {
          accountName: 'Account Name',
          accountNumber: '1234567890',
          bankName: 'Bank Name'
        }
      },
      lastId: {
        task: 0,
        deposit: 0,
        withdrawal: 0,
        ad: 0
      }
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initialDB, null, 2));
    console.log('✅ Database initialized');
  }
};

const readDB = () => {
  initDB();
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
};

const writeDB = (data) => {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
};

const createUser = (userId, userName) => {
  const db = readDB();
  const existingUser = db.users.find(u => u.id === userId);
  if (existingUser) return existingUser;
  const newUser = {
    id: userId,
    username: userName,
    verified: false,
    balance: 0,
    referrals: 0,
    referredBy: null,
    createdAt: new Date().toISOString(),
    completedTasks: [],
    submittedAds: [],
    verificationAttempts: 0,
    lastVerificationAttempt: null
  };
  db.users.push(newUser);
  writeDB(db);
  return newUser;
};

const getUser = (userId) => {
  const db = readDB();
  return db.users.find(u => u.id === userId);
};

const updateUser = (userId, updates) => {
  const db = readDB();
  const userIndex = db.users.findIndex(u => u.id === userId);
  if (userIndex === -1) return null;
  db.users[userIndex] = { ...db.users[userIndex], ...updates };
  writeDB(db);
  return db.users[userIndex];
};

const addBalance = (userId, amount) => {
  const user = getUser(userId);
  if (!user) return null;
  return updateUser(userId, { balance: user.balance + amount });
};

const subtractBalance = (userId, amount) => {
  const user = getUser(userId);
  if (!user || user.balance < amount) return null;
  return updateUser(userId, { balance: user.balance - amount });
};

const createTask = (title, link, reward = 10) => {
  const db = readDB();
  const taskId = ++db.lastId.task;
  const task = {
    id: taskId,
    title,
    link,
    reward,
    status: 'active',
    createdAt: new Date().toISOString(),
    submissions: []
  };
  db.tasks.push(task);
  writeDB(db);
  return task;
};

const getTasks = (status = 'active') => {
  const db = readDB();
  return db.tasks.filter(t => t.status === status);
};

const getTask = (taskId) => {
  const db = readDB();
  return db.tasks.find(t => t.id === taskId);
};

const updateTask = (taskId, updates) => {
  const db = readDB();
  const taskIndex = db.tasks.findIndex(t => t.id === taskId);
  if (taskIndex === -1) return null;
  db.tasks[taskIndex] = { ...db.tasks[taskIndex], ...updates };
  writeDB(db);
  return db.tasks[taskIndex];
};

const hasSubmittedTask = (userId, taskId) => {
  const db = readDB();
  const task = db.tasks.find(t => t.id === taskId);
  if (!task) return false;
  return task.submissions.some(s => s.userId === userId);
};

const submitTask = (taskId, userId, proofLink) => {
  const db = readDB();
  const task = db.tasks.find(t => t.id === taskId);
  if (!task) return null;
  if (hasSubmittedTask(userId, taskId)) return null;
  const submission = {
    userId,
    proofLink,
    status: 'pending',
    submittedAt: new Date().toISOString()
  };
  task.submissions.push(submission);
  writeDB(db);
  return submission;
};

const approveTaskSubmission = (taskId, userId) => {
  const db = readDB();
  const task = db.tasks.find(t => t.id === taskId);
  const submission = task.submissions.find(s => s.userId === userId);
  if (!submission) return null;
  submission.status = 'approved';
  submission.approvedAt = new Date().toISOString();
  addBalance(userId, task.reward);
  const user = getUser(userId);
  user.completedTasks.push(taskId);
  writeDB(db);
  return submission;
};

const createDeposit = (userId, amount, screenshot, senderName, bankName, remark) => {
  const db = readDB();
  const depositId = ++db.lastId.deposit;
  const deposit = {
    id: depositId,
    userId,
    amount,
    screenshot,
    senderName,
    bankName,
    remark,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  db.deposits.push(deposit);
  writeDB(db);
  return deposit;
};

const getDeposits = (status = 'pending') => {
  const db = readDB();
  return db.deposits.filter(d => d.status === status);
};

const approveDeposit = (depositId) => {
  const db = readDB();
  const deposit = db.deposits.find(d => d.id === depositId);
  if (!deposit) return null;
  deposit.status = 'approved';
  deposit.approvedAt = new Date().toISOString();
  addBalance(deposit.userId, deposit.amount);
  writeDB(db);
  return deposit;
};

const rejectDeposit = (depositId) => {
  const db = readDB();
  const deposit = db.deposits.find(d => d.id === depositId);
  if (!deposit) return null;
  deposit.status = 'rejected';
  deposit.rejectedAt = new Date().toISOString();
  writeDB(db);
  return deposit;
};

const createWithdrawal = (userId, amount, accountName, accountNumber, bankName) => {
  const db = readDB();
  const withdrawalId = ++db.lastId.withdrawal;
  const withdrawal = {
    id: withdrawalId,
    userId,
    amount,
    accountName,
    accountNumber,
    bankName,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  db.withdrawals.push(withdrawal);
  writeDB(db);
  return withdrawal;
};

const getWithdrawals = (status = 'pending') => {
  const db = readDB();
  return db.withdrawals.filter(w => w.status === status);
};

const approveWithdrawal = (withdrawalId) => {
  const db = readDB();
  const withdrawal = db.withdrawals.find(w => w.id === withdrawalId);
  if (!withdrawal) return null;
  subtractBalance(withdrawal.userId, withdrawal.amount);
  withdrawal.status = 'approved';
  withdrawal.approvedAt = new Date().toISOString();
  writeDB(db);
  return withdrawal;
};

const rejectWithdrawal = (withdrawalId) => {
  const db = readDB();
  const withdrawal = db.withdrawals.find(w => w.id === withdrawalId);
  if (!withdrawal) return null;
  withdrawal.status = 'rejected';
  withdrawal.rejectedAt = new Date().toISOString();
  writeDB(db);
  return withdrawal;
};

const createAdvertisement = (userId, type, link, slots) => {
  const db = readDB();
  const adId = ++db.lastId.ad;
  const ad = {
    id: adId,
    userId,
    type,
    link,
    totalSlots: slots,
    remainingSlots: slots,
    views: 0,
    clicks: 0,
    status: 'active',
    createdAt: new Date().toISOString()
  };
  db.advertisements.push(ad);
  writeDB(db);
  return ad;
};

const getAdvertisements = (type = null, status = 'active') => {
  const db = readDB();
  let ads = db.advertisements.filter(a => a.status === status);
  if (type) ads = ads.filter(a => a.type === type);
  return ads;
};

const getUserAdvertisements = (userId) => {
  const db = readDB();
  return db.advertisements.filter(a => a.userId === userId);
};

const updateAdvertisement = (adId, updates) => {
  const db = readDB();
  const adIndex = db.advertisements.findIndex(a => a.id === adId);
  if (adIndex === -1) return null;
  db.advertisements[adIndex] = { ...db.advertisements[adIndex], ...updates };
  writeDB(db);
  return db.advertisements[adIndex];
};

const completeAdSlot = (adId) => {
  const db = readDB();
  const ad = db.advertisements.find(a => a.id === adId);
  if (!ad || ad.remainingSlots <= 0) return null;
  ad.remainingSlots--;
  if (ad.remainingSlots === 0) ad.status = 'completed';
  writeDB(db);
  return ad;
};

const getStats = () => {
  const db = readDB();
  return {
    totalUsers: db.users.length,
    verifiedUsers: db.users.filter(u => u.verified).length,
    totalBalance: db.users.reduce((sum, u) => sum + u.balance, 0),
    activeTasks: db.tasks.filter(t => t.status === 'active').length,
    pendingDeposits: db.deposits.filter(d => d.status === 'pending').length,
    pendingWithdrawals: db.withdrawals.filter(w => w.status === 'pending').length,
    activeAds: db.advertisements.filter(a => a.status === 'active').length,
    totalEarned: db.deposits.filter(d => d.status === 'approved').reduce((sum, d) => sum + d.amount, 0)
  };
};

module.exports = {
  initDB, readDB, writeDB, createUser, getUser, updateUser, addBalance, subtractBalance,
  createTask, getTasks, getTask, updateTask, submitTask, approveTaskSubmission, hasSubmittedTask,
  createDeposit, getDeposits, approveDeposit, rejectDeposit,
  createWithdrawal, getWithdrawals, approveWithdrawal, rejectWithdrawal,
  createAdvertisement, getAdvertisements, getUserAdvertisements, updateAdvertisement, completeAdSlot,
  getStats
};
