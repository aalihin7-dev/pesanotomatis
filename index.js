const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');

// Lokasi penyimpanan data autentikasi (session)
const authFolder = './auth_info_baileys';

async function connectToWhatsApp() {
    // Ambil state autentikasi yang tersimpan
    const { state, saveCreds } = await useMultiFileAuthState(authFolder);

    // Ambil versi Baileys terbaru
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`Using Baileys version ${version}, latest: ${isLatest}`);

    // Buat socket koneksi
    const sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
        },
        printQRInTerminal: true, // Cetak QR code di terminal
        logger: pino({ level: 'silent' }), // Nonaktifkan log berlebih
        browser: ['Nero Chatbot', 'Chrome', '1.0.0'] // Nama device yang akan tampil di WhatsApp Web
    });

    // Listener untuk update koneksi
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log("QR Code diterima, silakan scan menggunakan WhatsApp Anda:");
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Koneksi terputus karena:', lastDisconnect.error, ', mencoba menghubungkan kembali:', shouldReconnect);

            // Jika bukan karena logout, coba sambungkan kembali
            if (shouldReconnect) {
                connectToWhatsApp();
            } else {
                console.log("Koneksi terputus permanen (Logged out), hapus folder auth dan restart.");
                // Di sini Anda mungkin perlu membersihkan folder auth secara manual atau otomatis jika terjadi logout
            }
        } else if (connection === 'open') {
            console.log('Koneksi WhatsApp berhasil terbuka!');
        }
    });

    // Simpan kredensial setiap kali diperbarui
    sock.ev.on('creds.update', saveCreds);

    // Listener untuk pesan baru
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];

        // Abaikan jika pesan kosong atau pesan status broadcast
        if (!msg.message) return;

        // Dapatkan JID (ID unik user/group) dan teks pesan
        const remoteJid = msg.key.remoteJid;
        const messageText = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

// --- Logika Chatbot Percetakan ---

// Pastikan hanya balas pesan dari user, bukan dari bot sendiri
if (msg.key.fromMe) return;

console.log(`[PESAN MASUK] Dari: ${remoteJid} | Pesan: ${messageText}`);

// Normalisasi pesan ke huruf kecil
const pesan = messageText.toLowerCase();

// Balasan otomatis percetakan
if (pesan.includes('harga cetak')) {
    await sock.sendMessage(remoteJid, { text: '💰 Harga cetak bervariasi tergantung ukuran & jenis kertas. Bisa kasih detail ukuran dan jumlah? 😊' });
} 
else if (pesan.includes('brosur')) {
    await sock.sendMessage(remoteJid, { text: '📄 Untuk cetak brosur, kami sediakan ukuran A4 lipat 3 atau custom. Mau full color ya? 🎨' });
} 
else if (pesan.includes('spanduk')) {
    await sock.sendMessage(remoteJid, { text: '📢 Cetak spanduk mulai dari Rp25.000/meter dengan bahan flexi kualitas outdoor.' });
} 
else if (pesan.includes('kartu nama')) {
    await sock.sendMessage(remoteJid, { text: '💼 Kartu nama standar 1 box isi 100 lembar mulai Rp35.000. Bisa pakai desain sendiri atau minta kami buatkan.' });
} 
else if (pesan.includes('nota')) {
    await sock.sendMessage(remoteJid, { text: '📝 Cetak nota bisa NCR (rangkap otomatis) atau kertas HVS. Mau rangkap berapa?' });
} 
else if (pesan.includes('banner')) {
    await sock.sendMessage(remoteJid, { text: '🎪 Banner roll-up tersedia ukuran 60x160 cm dan 80x200 cm. Cocok untuk promosi acara!' });
} 
else if (pesan.includes('print warna')) {
    await sock.sendMessage(remoteJid, { text: '🖨️ Print warna A4 Rp2.000/lbr, A3 Rp5.000/lbr. Untuk jumlah banyak bisa dapat diskon 😍' });
} 
else if (pesan.includes('laminating')) {
    await sock.sendMessage(remoteJid, { text: '✨ Laminating tersedia doff/glossy. Mulai Rp3.000/lbr.' });
} 
else if (pesan.includes('stempel')) {
    await sock.sendMessage(remoteJid, { text: '🖋️ Cetak stempel kilat 10 menit jadi! Mau yang otomatis atau manual ya?' });
} 
else if (pesan.includes('alamat toko')) {
    await sock.sendMessage(remoteJid, { text: '📍 Alamat percetakan kami: Jl. Contoh No.123, Metro Lampung. Buka setiap hari 08:00–21:00 🏠' });
} 
else {
    // Balasan default kalau pesan tidak cocok
    await sock.sendMessage(remoteJid, { text: '🙏 Terima kasih sudah menghubungi Nero Print. Untuk info lebih detail, silakan ketik kata kunci seperti: harga cetak, brosur, spanduk, kartu nama, nota, banner, print warna, laminating, stempel, atau alamat toko.' });
}

// --- Akhir Logika Chatbot Percetakan ---
    });
}

// Jalankan fungsi koneksi
connectToWhatsApp();