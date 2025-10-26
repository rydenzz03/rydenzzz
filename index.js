/**
 * wa-bot-multifunc - Termux-ready WhatsApp bot (multifunction)
 * Features implemented:
 * - Basic commands: ping, help, menu, echo, owner
 * - AI chat using OpenAI (command: .ai <prompt>)
 * - YouTube info (command: .ytdl <url>) - sends basic info and thumbnail (not full media file)
 * - Placeholders for sticker, translate, broadcast, admin commands
 *
 * Setup (Termux):
 * 1. pkg update && pkg upgrade
 * 2. pkg install nodejs git ffmpeg -y
 * 3. unzip this bundle, cd into folder
 * 4. npm install
 * 5. copy .env.example to .env and fill OPENAI_API_KEY and OWNER_NUMBER
 * 6. npm start
 *
 * Note: You must provide your own OpenAI API key in .env (do NOT share it publicly).
 */

const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion, makeInMemoryStore, Browsers } = require('@adiwajshing/baileys');
const P = require('pino');
const qrcode = require('qrcode-terminal');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const ytdl = require('ytdl-core');
const { OpenAI } = require('openai');

const OPENAI_KEY = process.env.OPENAI_API_KEY || '';
const OWNER = process.env.OWNER_NUMBER || 'owner-number-not-set';

async function startBot() {
    if (!OPENAI_KEY) console.log('⚠️  OPENAI_API_KEY not set. AI commands will fail until you set it in .env');

    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
    const store = makeInMemoryStore({ logger: P().child({ level: 'silent', stream: 'store' }) });
    try { store.readFromFile('./store.json'); } catch {}
    setInterval(() => { try { store.writeToFile('./store.json'); } catch {} }, 10_000);

    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log('Baileys version:', version, 'isLatest:', isLatest);

    const { makeWASocket } = require('@whiskeysockets/baileys')

    const sock = makeWASocket({
        logger: P({ level: 'silent' }),
        printQRInTerminal: false,
        browser: Browsers.macOS('WA-Multifunc-Bot'),
        auth: state,
        version
    });

    store.bind(sock.ev);
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.log('QR received — scan from WhatsApp mobile (Linked Devices).');
            qrcode.generate(qr, { small: true });
        }
        if (connection === 'close') {
            console.log('Connection closed', lastDisconnect?.error?.toString());
            if ((lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut) {
                console.log('Reconnecting...');
                startBot();
            } else {
                console.log('Logged out — remove auth_info to re-authenticate.');
            }
        } else if (connection === 'open') {
            console.log('Connected ✅');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        try {
            const msg = messages[0];
            if (!msg.message || msg.key?.fromMe) return;
            const from = msg.key.remoteJid;
            const isGroup = from.endsWith('@g.us');
            const sender = (msg.key.participant || msg.key.remoteJid) + '';
            const messageType = Object.keys(msg.message)[0];

            let text = '';
            if (messageType === 'conversation') text = msg.message.conversation;
            else if (messageType === 'extendedTextMessage') text = msg.message.extendedTextMessage.text;
            else if (messageType === 'imageMessage' && msg.message.imageMessage.caption) text = msg.message.imageMessage.caption;
            else text = '';

            console.log('Message from', from, ':', text);

            const body = (text || '').trim();
            if (!body) return;

            // basic command parsing
            const parts = body.split(/\s+/);
            const cmd = parts[0].toLowerCase();

            // command handlers
            if (cmd === 'ping') {
                await sock.sendMessage(from, { text: 'Pong!' });
            } else if (cmd === 'help' || cmd === '.help') {
                await sock.sendMessage(from, { text: 'Commands: ping, help, .menu, .ai <prompt>, .ytdl <url>, echo <text>' });
            } else if (cmd === '.menu') {
                const menu = [
                    '*Menu WA Bot*',
                    '• ping',
                    '• help',
                    '• .menu',
                    '• .ai <prompt>  (AI Chat)',
                    '• .ytdl <YouTube URL>  (YouTube info)',
                    '• .sticker (send an image with caption .sticker)',
                    '• echo <text>',
                ].join('\n');
                await sock.sendMessage(from, { text: menu });
            } else if (cmd === 'echo') {
                const reply = parts.slice(1).join(' ') || 'Nothing to echo.';
                await sock.sendMessage(from, { text: reply });
            } else if (cmd === 'owner') {
                await sock.sendMessage(from, { text: `Owner: ${OWNER}` });
            } else if (cmd === '.ai') {
                const prompt = parts.slice(1).join(' ');
                if (!prompt) {
                    await sock.sendMessage(from, { text: 'Kirim: .ai <pertanyaan>' });
                } else {
                    await sock.sendMessage(from, { text: 'Sedang memproses AI...' });
                    try {
                        if (!OPENAI_KEY) throw new Error('OPENAI_API_KEY not set');
                        const client = new OpenAI({ apiKey: OPENAI_KEY });
                        const resp = await client.chat.completions.create({
                            model: 'gpt-3.5-turbo',
                            messages: [{ role: 'user', content: prompt }],
                            max_tokens: 800
                        });
                        const aiText = resp.choices?.[0]?.message?.content || 'AI tidak memberikan jawaban.';
                        await sock.sendMessage(from, { text: aiText });
                    } catch (e) {
                        console.error('AI error', e);
                        await sock.sendMessage(from, { text: 'Error AI: ' + e.message });
                    }
                }
            } else if (cmd === '.ytdl') {
                const url = parts[1];
                if (!url || !ytdl.validateURL(url)) {
                    await sock.sendMessage(from, { text: 'Kirim: .ytdl <YouTube URL> (bot akan kirim info & thumbnail)' });
                } else {
                    try {
                        const info = await ytdl.getInfo(url);
                        const title = info.videoDetails.title;
                        const author = info.videoDetails.author.name;
                        const thumb = info.videoDetails.thumbnails.pop().url;
                        const duration = info.videoDetails.lengthSeconds;
                        const msg = `Title: ${title}\nAuthor: ${author}\nDuration: ${duration}s\nURL: ${url}`;
                        await sock.sendMessage(from, { image: { url: thumb }, caption: msg });
                    } catch (e) {
                        console.error('ytdl error', e);
                        await sock.sendMessage(from, { text: 'Gagal ambil info YouTube: ' + e.message });
                    }
                }
            } else if (cmd === '.sticker') {
                // Placeholder: users should send an image with caption ".sticker"
                await sock.sendMessage(from, { text: 'Fitur sticker: Kirim gambar dengan caption .sticker — butuh ffmpeg & webp tools. Lihat README.' });
            } else {
                // default: ignore or small auto reply
                // await sock.sendMessage(from, { text: "Perintah tidak dikenali. Ketik .menu" });
            }
        } catch (err) {
            console.error('message handler error', err);
        }
    });
}

startBot().catch(err => {
    console.error('Fatal error', err);
    process.exit(1);
});
