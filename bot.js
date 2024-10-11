require('dotenv').config();
const { Telegraf } = require('telegraf');

// Используйте ваш токен бота из переменных окружения
const bot = new Telegraf(process.env.BOT_TOKEN);

// Команда /start для отправки кнопки Web App
bot.command('start', (ctx) => {
  ctx.reply('Нажмите на кнопку, чтобы открыть приложение', {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Открыть Web App", web_app: { url: "https://urinecoingame.vercel.app" } }]
      ]
    }
  });
});

// Обработка любых сообщений
bot.on('message', (ctx) => {
  console.log('Новое сообщение:', ctx.message);
  ctx.reply('Я получил ваше сообщение!');
});

// Запуск бота
bot.launch();

console.log("Бот запущен...");
