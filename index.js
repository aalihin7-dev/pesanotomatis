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