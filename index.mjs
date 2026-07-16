import http from "http";
import TelegramBot from "node-telegram-bot-api";
import fetch from "node-fetch"; // Pastikan sudah install: npm install node-fetch

const port = process.env.PORT || 3000;
http.createServer((_req, res) => {
  res.writeHead(200);
  res.end("AYOWD Bot is running");
}).listen(Number(port));

const token = "8746210235:AAEWUolYwnnM535nonnqjAx5-2BmmEsu5cA";
const bot = new TelegramBot(token, { 
  polling: { 
    polling: true,
    drop_pending_updates: true 
  } 
});

// ==========================================
// MENGAKTIFKAN TOMBOL MENU COMMAND (IKON ⌘)
// ==========================================
bot.setMyCommands([
  { command: "/start", description: "🔄 Mulai ulang Bot & Buka Menu" }
]);

// Database memori sementara
const userToTopic = new Map();
const topicToUser = new Map();
const humanTakeover = new Set(); 
const chatHistory = new Map(); // <--- BARU: Memori percakapan agar bot ingat konteks

// ==========================================
// SYSTEM PROMPT MISTRAL (KARAKTER & ATURAN)
// ==========================================
const systemPrompt = `Kamu adalah CS VVIP dari AYOWD. Gaya bahasa: asik, santai, meyakinkan, dan to the point. Sapa user dengan "Bosku".

ATURAN KERAS (WAJIB DIPATUHI):
1. JANGAN PERNAH mengulang sapaan (seperti "Halo Bosku", "Hai") jika percakapan sudah berlangsung. Langsung jawab intinya saja!
2. JANGAN menggunakan format markdown bintang ganda (**teks**). Gunakan teks biasa yang rapi.
3. INGAT KONTEKS PERCAKAPAN. Jika user bertanya kelanjutan dari pesan sebelumnya (misal "di mana itu?"), jawab sesuai obrolan terakhir.
4. JANGAN mengarang info, promo, atau link yang tidak ada di database. 
5. JIKA user komplain panjang, marah, atau kendala sistem yang tidak ada di database, katakan bahwa kamu akan memanggil CS asli untuk mengeceknya, lalu suruh menunggu.

=== DATABASE JAWABAN AYOWD ===

1. CARA DAFTAR
Trigger: cara daftar, buat akun, link daftar
Jawaban: Gampang banget! Langsung klik link resmi kita: https://ayowdlogin.pages.dev/ — Isi data diri dan rekening yang valid. Begitu selesai, akun otomatis aktif.

2. MINIMAL DEPOSIT & WITHDRAW
Trigger: min depo, minimal WD, depo berapa
Jawaban: Di AYOWD modal receh bisa jadi sultan! Minimal Deposit: Rp 10.000 | Minimal Withdraw: Rp 50.000. Gas depo sekarang!

3. PROMO, BONUS & RUNGKAD
Trigger: promo, bonus, garansi, rollingan, kalah terus, rungkad
Jawaban: Jangan emosi dulu, di AYOWD ada jaminan Garansi Anti Rungkad! Kalau depo pertama gagal WD, modal 100% kembali. Ada juga Rollingan Slot hingga 100 JUTA. Langsung aja cek menu "Promosi" di web setelah login buat klaim!

4. DEPO/WD LAMA
Trigger: depo belum masuk, WD lama, proses lelet
Jawaban: Mohon maaf antriannya! Standar proses Depo 1-3 menit dan WD 3-5 menit. Tolong ketik Username dan Nominal kamu, langsung saya prioritaskan.

5. LUPA PASSWORD / AKUN TERKUNCI
Trigger: lupa sandi, akun lock, gak bisa login
Jawaban: Tenang, jangan panik! Kirimkan: Username + Nama di Rekening + Nomor Rekening, biar langsung dibantu reset detik ini juga.

6. REKENING / E-WALLET DEPOSIT
Trigger: rek depo, nomor rekening, depo via dana
Jawaban: Kita support semua bank dan e-wallet (BCA, BNI, BRI, Mandiri, DANA, OVO, Gopay, dll). Cek nomor rekening paling update di menu DEPOSIT setelah login ya.

7. POLA / INFO GAME GACOR
Trigger: info gacor, pola, game bagus, RTP
Jawaban: RTP AYOWD update tiap jam! Cek bocoran pola terakurat di: https://lite.link/ayowd99 — Sikat game yang persentasenya lagi merah merona.

8. SAPAAN / HALO
Trigger: halo, hai, hi, min, permisi
Jawaban: Halo Bosku! CS VVIP AYOWD siap tempur 24 jam. Ada yang bisa dibantu hari ini?`;

const quickLinks = {
  inline_keyboard: [
    [
      { text: "📝 Daftar", url: "https://ayowdlogin.pages.dev/" },
      { text: "🔐 Login", url: "https://lite.link/ayowd99" },
    ],
    [
      { text: "👥 Masuk Group", url: "https://t.me/AYOWD_OFFICIAL" },
      { text: "🎁 Info Promo", url: "https://t.me/ayowdvip" },
    ],
  ],
};

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from?.first_name || "Bosku";
  
  // Reset memori kalau user ketik /start lagi
  chatHistory.set(chatId, []);

  try {
    await bot.sendPhoto(chatId, "https://i.postimg.cc/HsR3ZV4Q/brand.png", {
      caption: `🔥 <b>JANGAN SAMPAI KETINGGALAN, ${firstName.toUpperCase()}!</b> 🔥\n\nIni bukan promo biasa. Member VIP yang lain udah pada ngerasain hasilnya, sekarang giliran lo yang ambil kendali!\n\nGak usah banyak mikir, sikat penawaran eksklusif ini sekarang juga!\n\n⚡️ <i>Ambil posisi lo sebelum kehabisan! Langsung gas klik tombol di bawah!</i> 👇`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🎯 GASS MASUK SITUS", url: "https://ayowdlogin.pages.dev/" }],
          [
            { text: "📝 DAFTAR SEKARANG", url: "https://lite.link/ayowd99" },
            { text: "🔐 LOGIN & SIKAT", url: "https://mez.ink/ayowd99" },
          ],
        ],
      },
    });
    
    await bot.sendMessage(chatId, "⬇️ Akses cepat link resmi AYOWD:", { reply_markup: quickLinks });
  } catch (error) {
    console.error("[ERROR /start]:", error.message);
  }
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const userText = msg.text;
  const groupId = process.env.ADMIN_GROUP_ID;

  if (!userText || userText.startsWith("/start")) return;

  // ==========================================
  // 1. AREA ADMIN (DI DALAM GRUP/TOPIK)
  // ==========================================
  if (groupId && chatId.toString() === groupId.toString()) {
    const threadId = msg.message_thread_id;
    if (threadId && topicToUser.has(threadId)) {
      const targetUserId = topicToUser.get(threadId);

      if (userText === "/auto") {
        humanTakeover.delete(targetUserId); 
        bot.sendMessage(groupId, "🤖 <i>AI kembali AKTIF melayani member ini.</i>", { 
          message_thread_id: threadId, 
          parse_mode: "HTML" 
        });
        return;
      }

      if (!humanTakeover.has(targetUserId)) {
        humanTakeover.add(targetUserId);
        bot.sendMessage(groupId, "⚠️ <i>Admin mengambil alih. AI dihentikan sementara. Ketik <b>/auto</b> untuk menghidupkan AI kembali.</i>", { 
          message_thread_id: threadId, 
          parse_mode: "HTML" 
        });
      }

      bot.sendMessage(targetUserId, userText);
    }
    return; 
  }

  // ==========================================
  // 2. AREA MEMBER NGE-CHAT BOT
  // ==========================================
  if (groupId && chatId.toString() !== groupId.toString()) {
    try {
      let threadId = userToTopic.get(chatId);

      if (!threadId) {
        const topicName = `👤 ${msg.from?.first_name || "Member"} (${chatId})`;
        const newTopic = await bot.createForumTopic(groupId, topicName);
        threadId = newTopic.message_thread_id;
        
        userToTopic.set(chatId, threadId);
        topicToUser.set(threadId, chatId);
      }

      await bot.sendMessage(groupId, `💬 <b>Member Ngetik:</b>\n${userText}`, { 
        message_thread_id: threadId,
        parse_mode: "HTML" 
      });

      if (humanTakeover.has(chatId)) {
        return; 
      }

      // --- LOGIK MEMORI PERCAKAPAN ---
      if (!chatHistory.has(chatId)) {
        chatHistory.set(chatId, []);
      }
      const history = chatHistory.get(chatId);
      
      // Masukkan chat user ke memori
      history.push({ role: "user", content: userText });
      
      // Batasi memori hanya 10 pesan terakhir agar tidak berat
      if (history.length > 10) history.shift();

      bot.sendChatAction(chatId, "typing");
      
      // Siapkan payload dengan memori
      const apiMessages = [
        { role: "system", content: systemPrompt },
        ...history
      ];

      const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.MISTRAL_API_KEY}`,
        },
        body: JSON.stringify({
          model: "mistral-small-latest",
          messages: apiMessages,
        }),
      });
      
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      
      let aiResponseText = data.choices[0].message.content;
      
      // --- PEMBERSIH TEKS (Menghapus ** yang nyasar) ---
      aiResponseText = aiResponseText.replace(/\*\*/g, ""); 
      
      // Simpan jawaban AI ke memori
      history.push({ role: "assistant", content: aiResponseText });

      bot.sendMessage(chatId, aiResponseText);

      bot.sendMessage(groupId, `🤖 <b>AI Membalas:</b>\n${aiResponseText}`, { 
        message_thread_id: threadId,
        parse_mode: "HTML" 
      });

    } catch (error) {
      console.error("Error Processing:", error.message);
      bot.sendMessage(chatId, "Waduh Bosku, server lagi agak padat nih antreannya. Boleh diketik ulang ya pesannya! 🙏");
    }
  }
});

bot.on("polling_error", (error) => console.error("[POLLING ERROR]:", error.message));

console.log("🚀 AYOWD Bot (Smart Memory + Clean Text) berjalan!");
