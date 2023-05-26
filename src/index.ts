import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";
import { Configuration, OpenAIApi } from "openai";
import { agent } from "./agent";

dotenv.config();

// Initialize OpenAI config
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

/* ======================================
                Main Script
======================================= */
export const main = async () => {
  // Set up telegram bot & chat id
  const bot = new TelegramBot(process.env.TELEGRAM_API_KEY!, { polling: true });
  const chatId = process.env.CHAT_ID!;

  // Initialize chat history w system prompt for gpt to format it's message
  let chatHistory: any[] = [
    {
      role: "system",
      content: `You are an accountability coach. You are designed to evaluate if the user accomplished their goals or not. Once they review their day, they will tell you what they accomplished. Based on their desired goals & what they achieved, you have to decide whether they where successful or not. You must be RUTHLESS in deciding whether they were successful or not. Do NOT be overly nice or overly encourage them. You need to be EXTREMELY clear that they either were successful (100%), or not. Let me reemphasize that they have to either have achieved 100% of their goals to be successful. If they were even 1% off, they were unsuccessful. You can give a quick review, but at the end I need you to be EXTREMELY CLEAR with either "Result: You were unsuccessful in achieving your goals today" or "Result: You were successful in achieving your goals". For example, if I wanted to read 10 pages & workout today, and I achieved my goals, your output would be "Thank you for sharing your accomplishments. Here's a quick review:

      1. Workout: Completed
      2. Read 10 pages: Completed
      
      Result: You were successful in achieving your goals today." 
      
      If I wanted to read 10 pages & workout today, and I worked out but only read 5 pages, your output would be "Thank you for sharing your accomplishments. Here's a quick review:

      1. Workout: Completed
      2. Read 10 pages: Incomplete (only 5 pages read)
      
      Result: You were unsuccessful in achieving your goals today." YOU MUST INCLUDE "Result: You were unsuccessful in achieving your goals today." or "Result: You were successful in achieving your goals today." AT THE END OF YOUR RESPONSE EVERY TIME.`,
    },
  ];

  // Listens for the /start command & updates chat history w user's input
  bot.onText(/\/start/, (msg) => {
    // Send start message & update chat history
    const startMsg =
      "Hi there! I'm here to help you accomplish your goals. What are you aiming to accomplish today?";
    bot.sendMessage(chatId, startMsg);
    chatHistory = [...chatHistory, { role: "assistant", content: startMsg }];

    // Listens for response from the user
    bot.once("message", async ({ text }) => {
      // Sends response to users response & updates chat history
      const resStartMsg =
        "Sounds good! I'll check in with you later. Some reminders:\n - Remind yourself what you're working towards\n - Make sure these align with your longer term (weekly or monthly goals)\n - Focus but don't burn out. Recovery takes longer than managing energy levels";
      bot.sendMessage(chatId, resStartMsg);
      chatHistory = [
        ...chatHistory,
        { role: "user", content: `${text}` },
        { role: "assistant", content: resStartMsg },
      ];
    });
  });

  // Listens for the /end command & updates chat history w user's input
  bot.onText(/\/end/, (msg) => {
    const endMsg = "Hope your day was productive! What did you accomplish today?";
    bot.sendMessage(chatId, endMsg);
    chatHistory = [...chatHistory, { role: "assistant", content: endMsg }];

    bot.once("message", async ({ text }) => {
      chatHistory = [...chatHistory, { role: "user", content: text }];

      // Instead of a static response, we use GPT-4 to generate a response based on the chat history & evaluate if the goals were achieved or not
      const res = await openai.createChatCompletion({
        model: "gpt-4",
        messages: chatHistory,
        temperature: 0.2,
        max_tokens: 1250,
      });

      const response = res.data.choices[0].message?.content!;
      console.log(res.data);
      // Sends gpt4 response to telegram
      bot.sendMessage(chatId, response);

      // Calls agent & passes gpt 4 response to it
      const finalRes = await agent(response);
      bot.sendMessage(chatId, finalRes);

      chatHistory = [];
    });
  });
};

main();
