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

// SYSTEM PROMPT ROMBAK TOTAL - ALUR CS FORMAL, RAMAH, & SOPAN
const systemPrompt = `Kamu adalah Customer Service VVIP dari AYOWD. Gaya bahasa: sangat sopan, formal, ramah, profesional, empati, dan sangat membantu.

ATURAN MUTLAK & HARAM DILANGGAR:
1. DILARANG KERAS memberikan link/URL dalam bentuk apapun di dalam teks.
2. DILARANG KERAS mengetik kata "tombol", "klik di bawah", atau menyuruh user mengklik sesuatu. Biarkan sistem yang mengurusnya!
3. DILARANG mengarang posisi fitur atau menu di website.
4. DILARANG KERAS menggunakan kata-kata kasar, agresif, atau menantang. JANGAN pernah menyalahkan atau meragukan member.

=== DATABASE JAWABAN ===
1. CARA DAFTAR: Jelaskan dengan sopan bahwa pendaftaran sangat mudah. Minta member menyiapkan data diri dan rekening yang valid.
2. MINIMAL DEPO/WD: Sampaikan dengan ramah bahwa Minimal Deposit Rp 10.000 dan Minimal Withdraw Rp 50.000.
3. PROMO: Jelaskan secara profesional tentang Garansi Anti Rungkad (depo pertama gagal WD modal 100% kembali).
4. DEPO/WD LAMA: Sampaikan permohonan maaf yang tulus atas keterlambatan. Jelaskan standar proses 1-3 menit. Minta Username & Nominal dengan sopan untuk dibantu prioritaskan.
5. LUPA PASSWORD: Minta Username, Nama Rekening, & Nomor Rekening dengan sopan agar bisa segera dibantu reset.
6. RTP/POLA: Sampaikan dengan ramah bahwa RTP diupdate setiap jam dan persentasenya sangat akurat.
7. KENDALA AKSES / SITUS ERROR (IKUTI ALUR INI): 
   - TAHAP 1 (Awal komplain): Sampaikan permohonan maaf atas ketidaknyamanan. Minta member mengirimkan tangkapan layar (screenshot) kendala dengan bahasa yang sangat halus, contoh: "Mohon maaf atas ketidaknyamanannya. Boleh mohon kesediaannya untuk mengirimkan tangkapan layar (screenshot) kendalanya agar dapat kami bantu cek lebih lanjut?"
   - TAHAP 2 (Coba bantu): Berikan panduan dasar (clear cache, ganti browser, atau menggunakan VPN) dengan bahasa yang runtut dan sangat sopan.
   - TAHAP 3 (Mentok/Masih Gagal): Sampaikan permohonan maaf kembali. Beritahu bahwa kendala sedang diteruskan ke Tim IT kami untuk pengecekan. Mohon member berkenan menunggu sebentar dan mencoba akses alternatif.`;

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
      
      // Filter Sapu Bersih (Mencegah AI bandel ngasih link atau ngomongin tombol)
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
      if (textLower.includes("vpn") || textLower.includes("cache") || textLower.includes("browser") || textLower.includes("it") || textLower.includes("server") || textLower.includes("alternatif") || textLower.includes("tunggu") || textLower.includes("menunggu")) {
        dynamicMarkup.inline_keyboard.push([{ text: "🔗 COBA LINK ALTERNATIF INI", url: "https://mez.ink/ayowd99" }]);
      }

      // Pastikan ada indikator panah ke bawah jika sistem memunculkan tombol, dengan bahasa sopan
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
console.log("🚀 AYOWD Bot (Alur CS Formal & Ramah) siap melayani!");
