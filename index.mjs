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

// SYSTEM PROMPT: FORMAL, PROFESIONAL, WAJIB KASIH LINK (ANTI-TOLAK)
const systemPrompt = `Kamu adalah Customer Service VVIP dari AYOWD. Gaya bahasa: sangat sopan, formal, profesional, dan to the point.

ATURAN MUTLAK & HARAM DILANGGAR:
1. WAJIB MEMBERIKAN LINK: Jika member meminta link (link alternatif, login, daftar, dll), kamu DILARANG KERAS MENOLAK! JANGAN PERNAH bilang "kami tidak menyediakan link".
2. CARA MEMBERIKAN LINK: Kamu dilarang mengetik URL mentah (http/www) di dalam teks. Cukup gunakan kalimat wajib ini: "Tentu, silakan gunakan akses yang telah kami sediakan di bawah ini untuk kenyamanan Anda."
3. DILARANG KERAS mengetik kata "tombol" atau menyuruh user mengklik sesuatu. Gunakan kata "akses".
4. DILARANG meminta maaf jika tidak ada kendala/kesalahan dari pihak kita.
5. DILARANG memberikan pertanyaan basa-basi di akhir pesan (seperti: "Ada yang bisa dibantu lagi?").
6. JANGAN pernah menyalahkan atau meragukan member.

=== DATABASE JAWABAN ===
1. CARA DAFTAR: Jelaskan pendaftaran sangat mudah. Minta member menyiapkan data diri.
2. MINIMAL DEPO/WD: Minimal Deposit Rp 10.000 dan Minimal Withdraw Rp 50.000.
3. PROMO & BONUS: Jelaskan Garansi Anti Rungkad. Arahkan member mengecek Info Promo, menghubungi LiveChat, atau WhatsApp.
4. DEPO/WD LAMA: Sampaikan permohonan maaf atas keterlambatan. Proses 1-3 menit. Minta Username & Nominal.
5. LUPA PASSWORD: Minta Username, Nama Rekening, & Nomor Rekening dengan sopan.
6. RTP/POLA: RTP diupdate setiap jam dan persentasenya akurat.
7. KENDALA AKSES / SITUS ERROR: Minta tangkapan layar (screenshot) dengan halus. Berikan panduan clear cache/VPN. Jika mentok, teruskan ke Tim IT.
8. MINTA LINK ALTERNATIF: Langsung setujui dengan kalimat: "Tentu, silakan gunakan akses alternatif yang telah kami sediakan berikut ini."`;

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from?.first_name || "Pelanggan Setia";
  chatHistory.set(chatId, []);
  try {
    await bot.sendPhoto(chatId, "https://i.postimg.cc/HsR3ZV4Q/brand.png", {
      caption: `Selamat datang, Kak <b>${firstName.toUpperCase()}</b> di layanan VVIP AYOWD.\n\nKami siap melayani dan memberikan pengalaman terbaik untuk Anda.\n\n👇 <i>Silakan gunakan layanan cepat kami di bawah ini:</i>`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🎯 MASUK KE SITUS", url: "https://ayowdlogin.pages.dev/" }],
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
      
      // Filter Sapu Bersih (Anti-Link & Anti-Tombol)
      aiResponseText = aiResponseText
        .replace(/https?:\/\/\S+/g, "")
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
        .replace(/\*/g, '')
        .replace(/klik tombol.*/gi, "silakan gunakan akses berikut.")
        .replace(/tombol/gi, "akses")
        .trim();

      history.push({ role: "assistant", content: aiResponseText });

      let dynamicMarkup = { inline_keyboard: [] };
      const textLower = aiResponseText.toLowerCase();
      
      // LOGIKA TOMBOL DINAMIS
      
      // 1. Promo & LiveChat
      if (textLower.includes("promo") || textLower.includes("bonus") || textLower.includes("livechat") || textLower.includes("live chat")) {
        dynamicMarkup.inline_keyboard.push([
          { text: "🎁 INFO PROMO", url: "https://t.me/ayowdvip" },
          { text: "💬 LIVECHAT", url: "https://tawk.to/LinkLiveChatBosku" } 
        ]);
      }

      // 2. WhatsApp
      if (textLower.includes("whatsapp") || textLower.includes("wa")) {
        dynamicMarkup.inline_keyboard.push([{ text: "🟢 WHATSAPP", url: "https://wa.me/6281234567890" }]); 
      }

      // 3. RTP & Pola
      if (textLower.includes("rtp") || textLower.includes("pola") || textLower.includes("bocoran")) {
        dynamicMarkup.inline_keyboard.push([{ text: "📊 CEK RTP & POLA", url: "https://lite.link/ayowd99" }]);
      }
      
      // 4. Daftar & Login
      if (textLower.includes("daftar") || textLower.includes("akun") || textLower.includes("depo") || textLower.includes("aktif")) {
        dynamicMarkup.inline_keyboard.push([
          { text: "📝 DAFTAR", url: "https://ayowdlogin.pages.dev/" },
          { text: "🔐 LOGIN", url: "https://mez.ink/ayowd99" }
        ]);
      }

      // 5. Solusi Akses IT & Link Alternatif
      if (textLower.includes("alternatif") || textLower.includes("vpn") || textLower.includes("cache") || textLower.includes("browser") || textLower.includes("it") || textLower.includes("server") || textLower.includes("tunggu") || textLower.includes("menunggu")) {
        dynamicMarkup.inline_keyboard.push([{ text: "🔗 LINK ALTERNATIF", url: "https://mez.ink/ayowd99" }]);
      }

      // Menambahkan teks petunjuk panah HANYA jika ada tombol yang muncul
      if (dynamicMarkup.inline_keyboard.length > 0) {
        aiResponseText += "\n\n👇 <i>Silakan gunakan akses berikut untuk kemudahan Anda:</i>";
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
console.log("🚀 AYOWD Bot (Anti-Nolak Link) siap melayani!");
