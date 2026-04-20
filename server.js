const express = require('express');
const bot = require('./src/bot');

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).send('🤖 Bot running!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server on port ${PORT}`));

bot.startPolling();
console.log('✅ Bot polling started');
