import http from "http";
import TelegramBot from "node-telegram-bot-api";

const port = process.env.PORT || 3000;
http.createServer((_req, res) => {
  res.writeHead(200);
  res.end("AYOWD Bot is running");
}).listen(Number(port));

const token = "8746210235:AAE4rJfSD6xOCa2LBB9gyZaRnZWRgUzytpM";
const bot = new TelegramBot(token, { polling: true });

// Database memori sementara
const userToTopic = new Map(); // Mencatat ID Member -> ID Topik
const topicToUser = new Map(); // Mencatat ID Topik -> ID Member
const humanTakeover = new Set(); // SAKLAR: Mencatat member mana yang sedang dipegang Admin asli

const systemPrompt = `Kamu adalah CS VVIP dari AYOWD. Gaya bahasa: tegas, asik, provokatif, meyakinkan, dan cepat. Sapa user dengan "Bosku" atau "Member VVIP". Operasional 24 jam non-stop.

ATURAN KERAS:
- SELALU jawab langsung sesuai isi pesan user. JANGAN hanya suruh ketik /start tanpa jawaban.
- JANGAN mengarang info yang tidak ada di database di bawah ini.
- JANGAN gunakan sapaan waktu (pagi/siang/malam).
- JANGAN perkenalkan diri di setiap pesan.
- Hanya jawab berdasarkan data berikut:

=== DATABASE JAWABAN AYOWD ===

1. CARA DAFTAR
Trigger: cara daftar, buat akun, link daftar
Jawaban: Gampang banget Bosku! Langsung klik link resmi kita: https://ayowdlogin.pages.dev/ — Isi data diri dan rekening yang valid. Begitu selesai, akun VVIP kamu otomatis aktif dan siap WD hari ini!

2. MINIMAL DEPOSIT & WITHDRAW
Trigger: min depo, minimal WD, depo berapa
Jawaban: Di AYOWD modal receh bisa jadi sultan! Minimal Deposit: Rp 10.000 | Minimal Withdraw: Rp 50.000. Gas depo sekarang, mumpung winrate lagi max!

3. PROMO & BONUS
Trigger: promo, bonus, garansi, rollingan
Jawaban: AYOWD ngasih promo paling berani, Bosku! Rollingan Slot hingga 100 JUTA! Garansi Anti Rungkad: 100% modal kembali kalau depo pertama gagal WD. Bonus Depo awal dengan TO paling rendah. Klaim di menu promosi setelah deposit!

4. DEPO/WD LAMA
Trigger: depo belum masuk, WD lama, proses lelet
Jawaban: Mohon maaf atas antriannya Bosku! Standar proses Depo 1-3 menit dan WD 3-5 menit. Tolong kirim Username dan Nominal kamu, langsung saya prioritaskan!

5. LUPA PASSWORD / AKUN TERKUNCI
Trigger: lupa sandi, akun lock, gak bisa login
Jawaban: Tenang Bosku, jangan panik! Kirimkan: Username + Nama di Rekening + Nomor Rekening — langsung saya bantu reset detik ini juga!

6. REKENING / E-WALLET DEPOSIT
Trigger: rek depo, nomor rekening, depo via dana/ovo/gopay
Jawaban: Kita support semua bank dan e-wallet (BCA, BNI, BRI, Mandiri, DANA, OVO, Gopay, LinkAja)! Cek nomor rekening paling update di menu DEPOSIT setelah login.

7. POLA / INFO GAME GACOR
Trigger: info gacor, pola, game bagus, RTP
Jawaban: RTP AYOWD update tiap jam! Cek bocoran pola terakurat di: https://lite.link/ayowd99 — Sikat game yang persentasenya lagi merah merona!

8. SAPAAN / HALO
Trigger: halo, hai, hi, min, permisi
Jawaban: Halo Bosku! CS VVIP AYOWD siap tempur 24 jam! Ada yang bisa dibantu?`;

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

      // Fitur menghidupkan AI kembali
      if (userText === "/auto") {
        humanTakeover.delete(targetUserId); // Hapus status admin
        bot.sendMessage(groupId, "🤖 <i>AI kembali AKTIF melayani member ini.</i>", { 
          message_thread_id: threadId, 
          parse_mode: "HTML" 
        });
        return;
      }

      // Jika Admin balas biasa, Matikan AI untuk member ini
      if (!humanTakeover.has(targetUserId)) {
        humanTakeover.add(targetUserId);
        bot.sendMessage(groupId, "⚠️ <i>Admin mengambil alih. AI dihentikan sementara. Ketik <b>/auto</b> untuk menghidupkan AI kembali.</i>", { 
          message_thread_id: threadId, 
          parse_mode: "HTML" 
        });
      }

      // Kirim pesan admin ke member
      bot.sendMessage(targetUserId, userText, { reply_markup: quickLinks });
    }
    return; // Selesai urusan Admin
  }

  // ==========================================
  // 2. AREA MEMBER NGE-CHAT BOT
  // ==========================================
  if (groupId && chatId.toString() !== groupId.toString()) {
    try {
      let threadId = userToTopic.get(chatId);

      // Buat topik baru kalau member belum punya kamar
      if (!threadId) {
        const topicName = `👤 ${msg.from?.first_name || "Member"} (${chatId})`;
        const newTopic = await bot.createForumTopic(groupId, topicName);
        threadId = newTopic.message_thread_id;
        
        userToTopic.set(chatId, threadId);
        topicToUser.set(threadId, chatId);
      }

      // Tembuskan pesan member ke kamar Admin
      await bot.sendMessage(groupId, `💬 <b>Member Ngetik:</b>\n${userText}`, { 
        message_thread_id: threadId,
        parse_mode: "HTML" 
      });

      // CEK SAKLAR: Kalau Admin lagi ambil alih, AI disuruh minggir (Return)
      if (humanTakeover.has(chatId)) {
        return; 
      }

      // KALAU AMAN, BIARKAN AI (MISTRAL) MENJAWAB
      bot.sendChatAction(chatId, "typing");
      const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.MISTRAL_API_KEY}`,
        },
        body: JSON.stringify({
          model: "mistral-small-latest",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userText },
          ],
        }),
      });
      
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      
      const aiResponseText = data.choices[0].message.content;
      
      // Kirim jawaban AI ke Member
      bot.sendMessage(chatId, aiResponseText, { reply_markup: quickLinks });

      // Laporan AI membalas ke Admin
      bot.sendMessage(groupId, `🤖 <b>AI Membalas:</b>\n${aiResponseText}`, { 
        message_thread_id: threadId,
        parse_mode: "HTML" 
      });

    } catch (error) {
      console.error("Error Processing:", error.message);
      bot.sendMessage(chatId, "Mohon maaf Bosku, sistem sedang antre. Coba ketik ulang ya!", { reply_markup: quickLinks });
    }
  }
});

bot.on("polling_error", (error) => console.error("[POLLING ERROR]:", error.message));

console.log("🚀 AYOWD Bot (Forum/Topics Mode + Auto Handoff) berjalan!");
