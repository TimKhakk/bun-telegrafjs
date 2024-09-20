import schedule from 'node-schedule';
import { type Context, session, Telegraf, Telegram } from "telegraf";

console.log("Bot is working...");

const TOKEN = process.env.TELEGRAM_BOT_TOKEN

if (TOKEN == null) {
	throw new TypeError("TELEGRAM_BOT_TOKEN must be provided!");
}

interface SessionData {
	messageCount: number;
  taskState: {
    done: boolean;
    updatedAt: Date | null;
  }
}

interface LocalContext extends Context {
	session?: SessionData;
}

const bot = new Telegraf<LocalContext>(TOKEN)
const telegram = new Telegram(TOKEN)

bot.use(session());





// Start the reminder scheduling

// Listen for the '/start' command to initiate the bot and register the userId
// bot.onText(/\/start/, (msg) => {
//   userId = msg.chat.id;
//   bot.sendMessage(userId, "Hello! I will remind you to do your stuff every day between the 15th and 25th of each month. Type '/done' when you're done this month.");
// });

// Listen for the '/done' command to mark the task as completed for this month
// bot.onText(/\/done/, (msg) => {
  // if (!taskDoneThisMonth) {
  //   taskDoneThisMonth = true;
  //   remindersEnabled = false;
  //   bot.sendMessage(msg.chat.id, "Great! You have completed your task for this month. I will stop reminding you until next month.");
  // } else {
  //   bot.sendMessage(msg.chat.id, "You already marked your task as done for this month.");
  // }
// });


const CALLBACK_DATA_IDS = {
  TaskAlreadyDone: 'done-button-clicked',
} as const;

const text = 'Пора сдать показания счетчиков!';
const startText = "Привет! Каждый день начиная с 15 числа месяца и в течении 10 дней, я буду напоминать тебе о том, что нужно сдать показания счетчиков"
const textAlt = 'Счетчики ждут!';
const siteText = 'Сайт Личного Кабинета';
const doneText = 'Уже сдал(а)';
const resText = `${text}`;
const websiteUrl = 'https://cabinet.rc-online.ru/sign_in'
let remindersEnabled = true;
let taskDoneThisMonth = false;

// Store the userId for whom the bot will send reminders (this can be extended to multiple users)
let userId: number | null = null;

// Helper function to get the current date information
const getCurrentDateInfo = () => {
  const now = new Date();
  return {
    day: now.getDate(),
    month: now.getMonth() + 1, // Month is zero-indexed
    year: now.getFullYear(),
  };
};

// Function to reset taskDoneThisMonth flag on the 1st of each month
const resetMonthlyTask = () => {
  const { day } = getCurrentDateInfo();
  if (day === 1) {
    taskDoneThisMonth = false;
    remindersEnabled = true;
  }
};

// Schedule the taskDoneThisMonth reset to run daily at midnight
schedule.scheduleJob('0 0 * * *', () => {
  resetMonthlyTask();
});

// Function to handle reminders between the 15th and 25th of each month
const scheduleReminders = () => {
  const rule = new schedule.RecurrenceRule();
  rule.hour = 12; //9; // Set time (09:00 AM)
  rule.minute =  47 //0; // Set the exact minute

  schedule.scheduleJob(rule, () => {
    const { day } = getCurrentDateInfo();

    if (day >= 15 && day <= 25 && remindersEnabled && !taskDoneThisMonth && userId) {
      telegram.sendMessage(userId, text, {
      });
    }
  });
};
const doneCommand = (ctx: { reply: (text: string ) => void} ) => {
  if (!taskDoneThisMonth) {
    taskDoneThisMonth = true;
    remindersEnabled = false;
    ctx.reply('Отлично! Увидимся в следующем месяце!')
  } else {
    ctx.reply("Показания счетчиков уже сданы. Успокойся!");
  }
}

bot.start((ctx) => {
  userId = ctx.chat.id;
  ctx.session ??= {
    messageCount: 0,
    taskState: {
      done: false,
      updatedAt: null,
    }
  }

  scheduleReminders();
  ctx.reply(startText);
})
// Command to get the current status of the task
bot.command('status', (ctx) => {
  const statusMessage = taskDoneThisMonth
    ? "Показания счетчиков на этот месяц уже сданы."
    : textAlt;

  ctx.reply(statusMessage);
});

bot.command('done', doneCommand);

bot.on('callback_query', (ctx) => {
  switch (ctx.callbackQuery.data) {
    case CALLBACK_DATA_IDS.TaskAlreadyDone: {
      doneCommand(ctx)

      break;
    }

    default: {
      console.log('Unknown callback query')
    }
  }
});

bot.launch()

// telegram.sen
// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
