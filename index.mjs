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

// SYSTEM PROMPT ROMBAK TOTAL - ALUR CS REALISTIS & ANTI-HALU
const systemPrompt = `Kamu adalah CS VVIP dari AYOWD. Gaya bahasa: asik, santai, provokatif, agresif untuk memancing tindakan (action), dan to the point.

ATURAN MUTLAK & HARAM DILANGGAR:
1. DILARANG KERAS memberikan link/URL dalam bentuk apapun.
2. DILARANG KERAS mengetik kata "tombol", "klik di bawah", atau menyuruh user mengklik sesuatu. Biarkan sistem yang mengurusnya!
3. DILARANG mengarang posisi fitur atau menu di website.
4. JANGAN mengulang sapaan. Langsung tembak ke jawaban.

=== DATABASE JAWABAN ===
1. CARA DAFTAR: Gampang banget! Isi data diri & rekening valid, akun langsung aktif.
2. MINIMAL DEPO/WD: Modal receh bisa jadi sultan! Minimal Deposit 10rb, Minimal WD 50rb. Gas depo sekarang!
3. PROMO: Ada Garansi Anti Rungkad, depo pertama gagal WD modal 100% kembali.
4. DEPO/WD LAMA: Mohon maaf antriannya! Standar proses 1-3 menit. Ketik Username & Nominal, saya prioritaskan.
5. LUPA PASSWORD: Kirimkan Username, Nama Rekening, & Nomor Rekening. Reset detik ini juga.
6. RTP/POLA: RTP update tiap jam! Bocoran pola kita selalu akurat.
7. KENDALA AKSES / SITUS ERROR (IKUTI ALUR INI): 
   - TAHAP 1 (Awal komplain): JANGAN langsung kasih solusi. Minta member mengirimkan SCREENSHOT (SS) kendala yang dialami agar bisa dicek.
   - TAHAP 2 (Coba bantu): Berikan panduan dasar seperti clear cache, ganti browser, atau pakai VPN.
   - TAHAP 3 (Mentok/Masih Gagal): Beritahu bahwa kendala sedang diteruskan ke Tim IT. Suruh member menunggu sebentar, lalu arahkan untuk mencoba akses alternatif. JANGAN ngarang instruksi aneh-aneh!`;

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from?.first_name || "Bosku";
  chatHistory.set(chatId, []);
  try {
    await bot.sendPhoto(chatId, "https://i.postimg.cc/HsR3ZV4Q/brand.png", {
      caption: `🔥 <b>JANGAN SAMPAI KETINGGALAN, ${firstName.toUpperCase()}!</b> 🔥\n\nSikat penawaran eksklusif ini sekarang juga!\n\n⚡️ <i>Langsung gas sikat bossku!</i> 👇`,
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
      
      // Filter Sapu Bersih (Mencegah AI bandel ngasih link atau ngomongin tombol)
      aiResponseText = aiResponseText
        .replace(/https?:\/\/\S+/g, "")
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
        .replace(/\*/g, '')
        .replace(/klik tombol.*/gi, "langsung gas aja bosku!")
        .replace(/tombol/gi, "akses")
        .trim();

      history.push({ role: "assistant", content: aiResponseText });

      let dynamicMarkup = { inline_keyboard: [] };
      const textLower = aiResponseText.toLowerCase();
      
      // LOGIKA TOMBOL OTOMATIS BERDASARKAN KONTEKS JAWABAN AI
      // 1. Tombol RTP & Pola
      if (textLower.includes("rtp") || textLower.includes("pola") || textLower.includes("bocoran")) {
        dynamicMarkup.inline_keyboard.push([{ text: "📊 CEK RTP & POLA", url: "https://lite.link/ayowd99" }]);
      }
      
      // 2. Tombol Daftar & Login (Biasa)
      if (textLower.includes("daftar") || textLower.includes("akun") || textLower.includes("depo") || textLower.includes("aktif")) {
        dynamicMarkup.inline_keyboard.push([
          { text: "📝 DAFTAR", url: "https://ayowdlogin.pages.dev/" },
          { text: "🔐 LOGIN", url: "https://mez.ink/ayowd99" }
        ]);
      }

      // 3. Tombol Solusi Akses (Hanya muncul jika AI menyarankan solusi Cache/VPN, atau meneruskan ke Tim IT)
      if (textLower.includes("vpn") || textLower.includes("cache") || textLower.includes("browser") || textLower.includes("it") || textLower.includes("server") || textLower.includes("alternatif") || textLower.includes("tunggu")) {
        dynamicMarkup.inline_keyboard.push([{ text: "🔗 COBA LINK ALTERNATIF INI", url: "https://mez.ink/ayowd99" }]);
      }

      // Pastikan ada indikator panah ke bawah jika sistem memunculkan tombol
      if (dynamicMarkup.inline_keyboard.length > 0) {
        aiResponseText += "\n\n👇 <i>Gunakan akses cepat ini:</i>";
      }

      bot.sendMessage(chatId, aiResponseText, { 
        parse_mode: "HTML",
        reply_markup: dynamicMarkup.inline_keyboard.length > 0 ? dynamicMarkup : undefined
      });
      bot.sendMessage(groupId, `🤖 <b>AI Membalas:</b>\n${aiResponseText}`, { message_thread_id: threadId, parse_mode: "HTML" });
    } catch (error) { 
      bot.sendMessage(chatId, "Waduh Bosku, server lagi agak padat nih. Bisa diulang pesannya? 🙏"); 
    }
  }
});

bot.on("polling_error", (error) => console.error(error));
console.log("🚀 AYOWD Bot (Alur CS IT) siap tempur!");
