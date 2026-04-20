module.exports = {
  VERIFICATION_CODES: {
    WHATSAPP: '1234',
    TELEGRAM_GROUP: '2345',
    TELEGRAM_CHANNEL: '3456'
  },
  TASK_REWARD: 10,
  REFERRAL_REWARD: 50,
  AD_RATES: {
    BOT: { cost: 30, userEarn: 15 },
    CHANNEL: { cost: 20, userEarn: 10 },
    GROUP: { cost: 20, userEarn: 10 }
  },
  MIN_DEPOSIT: 500,
  MIN_WITHDRAWAL: 1500,
  EXTERNAL_LINKS: {
    WHATSAPP: 'https://chat.whatsapp.com/your-link',
    TELEGRAM_BOT: 'https://t.me/your_bot',
    TELEGRAM_CHANNEL: 'https://t.me/your_channel',
    TELEGRAM_GROUP: 'https://t.me/your_group'
  },
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '2009',
  BANK_DETAILS: {
    accountName: 'Update from admin',
    accountNumber: 'Update from admin',
    bankName: 'Update from admin'
  }
};
