WA Bot Multifungsi (Termux-ready)
=================================

Fitur yang tersedia (versi ini):
- AI chat via OpenAI (perintah: .ai <prompt>)
- Menu perintah (.menu)
- YouTube info (.ytdl <url>) — mengirim thumbnail & info
- Basic commands: ping, help, echo, owner
- Placeholders untuk sticker/translate/broadcast/admin (lihat README untuk cara lengkapi)

Penting: Anda harus menyediakan sendiri OpenAI API key. Saya TIDAK dapat memberikan API key.
Simpan API key di file .env di folder bot.

Persiapan Termux (HP Android):
1. Buka Termux, jalankan:
   pkg update && pkg upgrade -y
   pkg install nodejs git ffmpeg -y
2. Upload/unzip folder bot di Termux (misal di ~/wa-bot)
3. cd ~/wa-bot
4. npm install
5. cp .env.example .env -> edit .env dan masukkan OPENAI_API_KEY dan OWNER_NUMBER
6. npm start
7. Scan QR code di terminal (Linked Devices) saat pertama run

Catatan tambahan:
- Untuk fitur sticker (mengubah gambar ke webp), butuh ffmpeg & webpmux or sharp; di Termux mungkin perlu instalasi tambahan.
- Untuk downloader media besar, gunakan VPS atau PC karena batas storage dan bandwidth di HP.
- Jangan gunakan bot untuk spam; gunakan akun yang Anda miliki.

Butuh gue tambahkan fitur spesifik (broadcast, auto-reply keyword, auto-download media)? Bilang aja.
