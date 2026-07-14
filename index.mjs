import http from "http";
import TelegramBot from "node-telegram-bot-api";

const port = process.env.PORT || 3000;
http.createServer((_req, res) => {
  res.writeHead(200);
  res.end("AYOWD Bot is running");
}).listen(Number(port));

const token = "8746210235:AAE4rJfSD6xOCa2LBB9gyZaRnZWRgUzytpM";
const bot = new TelegramBot(token, { polling: true });

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
  const captionText = `🔥 <b>JANGAN SAMPAI KETINGGALAN, ${firstName.toUpperCase()}!</b> 🔥

Ini bukan promo biasa. Member VIP yang lain udah pada ngerasain hasilnya, sekarang giliran lo yang ambil kendali!

Gak usah banyak mikir, sikat penawaran eksklusif ini sekarang juga!

⚡️ <i>Ambil posisi lo sebelum kehabisan! Langsung gas klik tombol di bawah!</i> 👇`;

  try {
    await bot.sendPhoto(chatId, "https://i.postimg.cc/HsR3ZV4Q/brand.png", {
      caption: captionText,
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
  const adminId = process.env.ADMIN_ID; // Mengambil ID admin dari Render

  if (!userText || userText.startsWith("/")) return;

  // 1. LOGIKA ADMIN MEMBALAS MANUAL (TAKEOVER)
  if (adminId && chatId.toString() === adminId.toString()) {
    // Mengecek apakah admin menggunakan fitur "Reply" pada pesan laporan bot
    if (msg.reply_to_message && msg.reply_to_message.text) {
      // Mengekstrak Chat ID member dari teks laporan
      const match = msg.reply_to_message.text.match(/\(ID: (\d+)\)/);
      if (match && match[1]) {
        const targetUserId = match[1];
        // Mengirimkan balasan manual ke member
        bot.sendMessage(targetUserId, userText, { reply_markup: quickLinks });
        bot.sendMessage(adminId, "✅ <i>Balasan manual berhasil dikirim ke member! (AI dihentikan untuk pesan ini)</i>", { parse_mode: "HTML" });
        return; // Hentikan di sini, AI tidak perlu menjawab
      }
    }
    return; // Jika admin hanya ngetik di bot tanpa me-reply, abaikan
  }

  // 2. LOGIKA FORWARD (PENYADAP) KE ADMIN
  if (adminId && chatId.toString() !== adminId.toString()) {
    const forwardText = `💬 <b>Pesan Masuk!</b>\nDari: ${msg.from?.first_name || "Member"} (ID: ${chatId})\nPesan: <i>${userText}</i>\n\n💡 <i>(Balas/Reply pesan ini untuk chat manual ke member)</i>`;
    bot.sendMessage(adminId, forwardText, { parse_mode: "HTML" }).catch(err => console.error("Gagal forward:", err));
  }

  // 3. LOGIKA AI MENJAWAB (BERJALAN SEPERTI BIASA)
  try {
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
    
    // Kirim balasan AI ke member
    bot.sendMessage(chatId, aiResponseText, { reply_markup: quickLinks });

    // Tembuskan balasan AI ke Admin agar Bosku bisa memantau kinerja AI
    if (adminId && chatId.toString() !== adminId.toString()) {
       bot.sendMessage(adminId, `🤖 <b>AI membalas:</b>\n${aiResponseText}`, { parse_mode: "HTML" });
    }

  } catch (error) {
    console.error("Fetch Error:", error.message);
    bot.sendMessage(chatId, "Mohon maaf Bosku, sistem sedang antre sebentar. Coba ketik ulang ya!", { reply_markup: quickLinks });
  }
});

bot.on("polling_error", (error) => console.error("[POLLING ERROR]:", error.message));

console.log("🚀 AYOWD Bot dengan Fitur Admin berjalan!");
