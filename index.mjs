import http from "http";
import TelegramBot from "node-telegram-bot-api";

const port = process.env.PORT || 3000;
http.createServer((_req, res) => {
  res.writeHead(200);
  res.end("AYOWD Bot is running");
}).listen(Number(port));

const token = "8746210235:AAEWUolYwnnM535nonnqjAx5-2BmmEsu5cA";
const bot = new TelegramBot(token, { 
  polling: { polling: true, drop_pending_updates: true } 
});

bot.setMyCommands([{ command: "/start", description: "🔄 Mulai ulang Bot & Buka Menu" }]);

const userToTopic = new Map();
const topicToUser = new Map();
const humanTakeover = new Set(); 
const chatHistory = new Map(); 

// SYSTEM PROMPT KETAT - DILARANG TULIS LINK DI TEKS
const systemPrompt = `Kamu adalah CS VVIP dari AYOWD. Gaya bahasa: asik, santai, provokatif, agresif untuk memancing tindakan (action), dan to the point.
ATURAN KERAS:
1. DILARANG MENULIS LINK/URL DI DALAM TEKS! Arahkan user ke tombol di bawah.
2. JANGAN mengulang sapaan. Langsung to the point ke jawaban.
3. JANGAN gunakan markdown ** atau [link](url). Gunakan teks biasa atau <b>teks</b> untuk menebalkan.
4. JANGAN mengarang info.
=== DATABASE ===
1. CARA DAFTAR: Gampang banget! Klik tombol DAFTAR di bawah. Isi data diri & rekening valid, akun langsung aktif.
2. MINIMAL DEPO/WD: Modal receh bisa jadi sultan! Minimal Deposit 10rb, Minimal WD 50rb. Gas depo sekarang!
3. PROMO/RUNGKAD: Jangan emosi! Ada Garansi Anti Rungkad, depo pertama gagal WD modal 100% kembali. Cek menu Promosi di web!
4. DEPO/WD LAMA: Mohon maaf antriannya! Standar proses 1-3 menit. Ketik Username & Nominal kamu, saya prioritaskan.
5. LUPA PASSWORD: Kirimkan Username, Nama Rekening, & Nomor Rekening. Saya bantu reset detik ini juga.
6. RTP/POLA: RTP update tiap jam! Cek bocoran pola terakurat di tombol bawah.`;

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from?.first_name || "Bosku";
  chatHistory.set(chatId, []);
  try {
    await bot.sendPhoto(chatId, "https://i.postimg.cc/HsR3ZV4Q/brand.png", {
      caption: `🔥 <b>JANGAN SAMPAI KETINGGALAN, ${firstName.toUpperCase()}!</b> 🔥\n\nSikat penawaran eksklusif ini sekarang juga!\n\n⚡️ <i>Langsung gas klik tombol di bawah!</i> 👇`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🎯 GASS MASUK SITUS", url: "https://ayowdlogin.pages.dev/" }],
          [{ text: "📝 DAFTAR SEKARANG", url: "https://lite.link/ayowd99" }, { text: "🔐 LOGIN", url: "https://mez.ink/ayowd99" }],
        ],
      },
    });
  } catch (error) { console.error(error); }
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const userText = msg.text;
  const groupId = process.env.ADMIN_GROUP_ID;

  if (!userText || userText.startsWith("/start")) return;

  // 1. AREA ADMIN
  if (groupId && chatId.toString() === groupId.toString()) {
    const threadId = msg.message_thread_id;
    if (threadId && topicToUser.has(threadId)) {
      const targetUserId = topicToUser.get(threadId);
      if (userText === "/auto") {
        humanTakeover.delete(targetUserId);
        bot.sendMessage(groupId, "🤖 <i>AI kembali AKTIF.</i>", { message_thread_id: threadId, parse_mode: "HTML" });
        return;
      }
      if (!humanTakeover.has(targetUserId)) {
        humanTakeover.add(targetUserId);
        bot.sendMessage(groupId, "⚠️ <i>Admin mengambil alih.</i>", { message_thread_id: threadId, parse_mode: "HTML" });
      }
      bot.sendMessage(targetUserId, userText);
    }
    return;
  }

  // 2. AREA MEMBER
  if (groupId && chatId.toString() !== groupId.toString()) {
    try {
      let threadId = userToTopic.get(chatId);
      if (!threadId) {
        const newTopic = await bot.createForumTopic(groupId, `👤 ${msg.from?.first_name} (${chatId})`);
        threadId = newTopic.message_thread_id;
        userToTopic.set(chatId, threadId);
        topicToUser.set(threadId, chatId);
      }
      await bot.sendMessage(groupId, `💬 <b>Member:</b>\n${userText}`, { message_thread_id: threadId, parse_mode: "HTML" });
      if (humanTakeover.has(chatId)) return; 

      if (!chatHistory.has(chatId)) chatHistory.set(chatId, []);
      const history = chatHistory.get(chatId);
      history.push({ role: "user", content: userText });
      if (history.length > 10) history.shift();

      bot.sendChatAction(chatId, "typing");
      
      const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.MISTRAL_API_KEY}` },
        body: JSON.stringify({
          model: "mistral-small-latest",
          messages: [{ role: "system", content: systemPrompt }, ...history],
        }),
      });
      
      const data = await response.json();
      let aiResponseText = data.choices[0].message.content;
      
      // Filter link & bold
      aiResponseText = aiResponseText.replace(/https?:\/\/\S+/g, "").replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\*/g, '');
      history.push({ role: "assistant", content: aiResponseText });

      let dynamicMarkup = { inline_keyboard: [] };
      const textLower = aiResponseText.toLowerCase();
      if (textLower.includes("rtp") || textLower.includes("pola") || textLower.includes("gacor") || textLower.includes("kalah")) {
        dynamicMarkup.inline_keyboard.push([{ text: "📊 CEK RTP & POLA", url: "https://lite.link/ayowd99" }]);
      }
      if (textLower.includes("daftar") || textLower.includes("akun") || textLower.includes("login") || textLower.includes("depo")) {
        dynamicMarkup.inline_keyboard.push([{ text: "📝 DAFTAR / LOGIN", url: "https://ayowdlogin.pages.dev/" }]);
      }

      bot.sendMessage(chatId, aiResponseText, { 
        parse_mode: "HTML",
        reply_markup: dynamicMarkup.inline_keyboard.length > 0 ? dynamicMarkup : undefined
      });
      bot.sendMessage(groupId, `🤖 <b>AI Membalas:</b>\n${aiResponseText}`, { message_thread_id: threadId, parse_mode: "HTML" });
    } catch (error) { bot.sendMessage(chatId, "Waduh Bosku, server lagi agak padat nih. Bisa diulang pesannya? 🙏"); }
  }
});

bot.on("polling_error", (error) => console.error(error));
console.log("🚀 AYOWD Bot (Lengkap & Anti-Link) berjalan!");
