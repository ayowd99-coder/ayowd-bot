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

// SYSTEM PROMPT: FORMAL, PROFESIONAL, NATURAL (ANTI-KAKU / ANTI-LEBAY)
const systemPrompt = `Kamu adalah Customer Service dari AYOWD. Gaya bahasa: sopan, profesional, natural (tidak kaku), dan to the point. JANGAN menggunakan bahasa yang terlalu kaku, lebay, atau seperti robot.

ATURAN MUTLAK & HARAM DILANGGAR:
1. DILARANG KERAS mengetik URL/Link (seperti http atau www) di dalam teks. 
2. JIKA MEMBER MEMINTA LINK (link alternatif, login, daftar, dll), JANGAN MENOLAK! Jawab dengan singkat dan natural, contoh: "Baik, berikut adalah aksesnya." DILARANG menggunakan kata-kata kaku seperti "untuk kenyamanan/kemudahan Anda".
3. DILARANG KERAS mengetik kata "tombol" atau menyuruh user mengklik sesuatu di bawah. (Sistem yang akan memunculkan menunya otomatis).
4. DILARANG meminta maaf jika tidak ada kendala/kesalahan.
5. DILARANG basa-basi atau bertele-tele di akhir pesan (seperti: "Ada yang bisa dibantu lagi?").
6. JANGAN pernah menyalahkan atau meragukan member.

=== DATABASE JAWABAN ===
1. CARA DAFTAR: Jelaskan pendaftaran sangat mudah. Minta member menyiapkan data diri.
2. MINIMAL DEPO/WD: Minimal Deposit Rp 10.000 dan Minimal Withdraw Rp 50.000.
3. PROMO & BONUS: Jelaskan Garansi Anti Rungkad. Arahkan member mengecek Info Promo, menghubungi LiveChat, atau WhatsApp.
4. DEPO/WD LAMA: Sampaikan permohonan maaf atas keterlambatan. Proses 1-3 menit. Minta Username & Nominal.
5. LUPA PASSWORD: Minta Username, Nama Rekening, & Nomor Rekening dengan sopan.
6. RTP/POLA: RTP diupdate setiap jam dan persentasenya akurat.
7. KENDALA AKSES / SITUS ERROR: Minta tangkapan layar (screenshot) dengan halus. Berikan panduan clear cache/VPN. Jika mentok, teruskan ke Tim IT.
8. MINTA LINK ALTERNATIF: Jawab dengan singkat dan natural, misalnya: "Baik, berikut adalah akses alternatif yang bisa dicoba."`;

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from?.first_name || "Kak";
  chatHistory.set(chatId, []);
  try {
    await bot.sendPhoto(chatId, "https://i.postimg.cc/5NxNJJx1/barua.png", {
      caption: `Halo Kak <b>${firstName.toUpperCase()}</b>, selamat datang di layanan Customer Service AYOWD.\n\nAda yang bisa kami bantu hari ini?\n\n👇 <i>Akses Cepat:</i>`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🎯 MASUK KE SITUS", url: "https://ayo-wd.xyz/daftar" }],
          [{ text: "📝 DAFTAR SEKARANG", url: "https://ayo-wd.xyz/prioritas" }, { text: "🔐 LOGIN", url: "https://ayo-wd.xyz/login" }],
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
      
      // Filter Sapu Bersih (Anti-Link & Anti-Tombol)
      aiResponseText = aiResponseText
        .replace(/https?:\/\/\S+/g, "")
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
        .replace(/\*/g, '')
        .replace(/klik tombol.*/gi, "")
        .replace(/tombol/gi, "menu")
        .trim();

      history.push({ role: "assistant", content: aiResponseText });

      let dynamicMarkup = { inline_keyboard: [] };
      const textLower = aiResponseText.toLowerCase();
      
      // LOGIKA TOMBOL DINAMIS
      
      // 1. Promo & LiveChat
      if (textLower.includes("promo") || textLower.includes("bonus") || textLower.includes("livechat") || textLower.includes("live chat")) {
        dynamicMarkup.inline_keyboard.push([
          { text: "🎁 INFO PROMO", url: "https://t.me/ayowdvip" },
          { text: "💬 LIVECHAT", url: "https://ayo-wd.xyz/loginvip" } 
        ]);
      }

      // 2. WhatsApp
      if (textLower.includes("whatsapp") || textLower.includes("wa")) {
        dynamicMarkup.inline_keyboard.push([{ text: "🟢 WHATSAPP", url: "https://wa.me/855312168901 }]); 
      }

      // 3. RTP & Pola
      if (textLower.includes("rtp") || textLower.includes("pola") || textLower.includes("bocoran")) {
        dynamicMarkup.inline_keyboard.push([{ text: "📊 CEK RTP & POLA", url: "https://ayo-wd.xyz/loginvip" }]);
      }
      
      // 4. Daftar & Login
      if (textLower.includes("daftar") || textLower.includes("akun") || textLower.includes("depo") || textLower.includes("aktif")) {
        dynamicMarkup.inline_keyboard.push([
          { text: "📝 DAFTAR", url: "https://ayo-wd.xyz/login" },
          { text: "🔐 LOGIN", url: "https://ayo-wd.xyz/prioritas" }
        ]);
      }

      // 5. Solusi Akses IT & Link Alternatif
      if (textLower.includes("alternatif") || textLower.includes("vpn") || textLower.includes("cache") || textLower.includes("browser") || textLower.includes("it") || textLower.includes("server") || textLower.includes("tunggu") || textLower.includes("menunggu")) {
        dynamicMarkup.inline_keyboard.push([{ text: "🔗 LINK ALTERNATIF", url: "https://ayo-wd.xyz/prioritas" }]);
      }

      // Menambahkan teks petunjuk panah yang bersih, rapi, dan tidak lebay
      if (dynamicMarkup.inline_keyboard.length > 0) {
        aiResponseText += "\n\n👇 <i>Akses Cepat:</i>";
      }

      bot.sendMessage(chatId, aiResponseText, { 
        parse_mode: "HTML",
        reply_markup: dynamicMarkup.inline_keyboard.length > 0 ? dynamicMarkup : undefined
      });
      bot.sendMessage(groupId, `🤖 <b>AI Membalas:</b>\n${aiResponseText}`, { message_thread_id: threadId, parse_mode: "HTML" });
    } catch (error) { 
      bot.sendMessage(chatId, "Mohon maaf, sistem kami sedang sibuk. Mohon berkenan mengirimkan ulang pesan Anda. 🙏"); 
    }
  }
});

bot.on("polling_error", (error) => console.error(error));
console.log("🚀 AYOWD Bot (Start Greeting Diperbarui) siap melayani!");
