<div align="center">

<img src="https://upload.nyzz.my.id/PBeCj.jpeg" alt="Nyzzpedia" width="100%" />

<br/>
<br/>

<p>
  <a href="https://wa.me/6287713472756"><img src="https://img.shields.io/badge/WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" /></a>
  <a href="https://t.me/nyzzpedia"><img src="https://img.shields.io/badge/Telegram-26A5E4?style=for-the-badge&logo=telegram&logoColor=white" /></a>
</p>

# Baileys New

<p>
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" />
  <img src="https://img.shields.io/badge/WebSocket-010101?style=for-the-badge&logo=socketdotio&logoColor=white" />
  <img src="https://img.shields.io/badge/Nyzzpedia-8A2BE2?style=for-the-badge" />
  <img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge" />
</p>

**Library WhatsApp automation berbasis WebSocket — tanpa browser, ringan, dan mudah dikustomisasi.**

> 🚀 Nyzzpedia WhatsApp Engine
> 📦 v1.0.0 — @nyzzpedia/baileys

[Instalasi](#-instalasi) •
[Mulai Cepat](#-mulai-cepat) •
[Tipe Pesan](#-tipe-pesan-yang-didukung) •
[Grup](#-manajemen-grup) •
[Event](#-event-system) •
[Saluran](#-saluran-resmi) •
[FAQ](#-faq--troubleshooting)

</div>

---

## 📡 Saluran Resmi

**WhatsApp Channel**

<p>
  <a href="https://whatsapp.com/channel/0029Vb84kbJGOj9qjSVl6d1c"><img src="https://img.shields.io/badge/Official%201-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" /></a>
  <a href="https://whatsapp.com/channel/0029Vb80DSe7tkjI8yFI0b3R"><img src="https://img.shields.io/badge/Official%202-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" /></a>
  <a href="https://whatsapp.com/channel/0029Vb7z6C68KMqn4bvuml0P"><img src="https://img.shields.io/badge/Official%203-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" /></a>
  <a href="https://whatsapp.com/channel/0029VbCWJJVLY6d1HEis8a3r"><img src="https://img.shields.io/badge/Official%204-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" /></a>
  <a href="https://whatsapp.com/channel/0029Vb7z4x5JP217c3zydG2N"><img src="https://img.shields.io/badge/Official%205-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" /></a>
  <br/>
  <a href="https://whatsapp.com/channel/0029Vb7ztOK0G0XYvrTVTa44"><img src="https://img.shields.io/badge/Testimoni-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" /></a>
  <a href="https://whatsapp.com/channel/0029Vb8qbBp1iUxUoTTM8j1Q"><img src="https://img.shields.io/badge/Tentang-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" /></a>
</p>

**Telegram Channel**

<p>
  <a href="https://t.me/nyzzpedia_official"><img src="https://img.shields.io/badge/Official-26A5E4?style=for-the-badge&logo=telegram&logoColor=white" /></a>
  <a href="https://t.me/nyzzpedia_testimoni"><img src="https://img.shields.io/badge/Testimoni-26A5E4?style=for-the-badge&logo=telegram&logoColor=white" /></a>
  <a href="https://t.me/nyzzpedia_tentang"><img src="https://img.shields.io/badge/Tentang-26A5E4?style=for-the-badge&logo=telegram&logoColor=white" /></a>
</p>

---

## 📖 Tentang

**Baileys New** adalah library WhatsApp automation berbasis WebSocket multi-device, dikembangkan dan dirawat oleh **Nyzzpedia**. Tanpa Puppeteer/Chromium, sehingga jauh lebih ringan dan cocok dijalankan di VPS kecil, Termux, atau container terbatas.

Cocok dipakai untuk:
- 🤖 Bot chat & customer service otomatis
- 📢 Sistem broadcast / notifikasi massal
- 🛒 Integrasi e-commerce (konfirmasi pesanan, invoice, dsb.)
- 🔧 Tools internal tim / automasi personal

---

## ✨ Fitur Utama

| Fitur | Keterangan |
|---|---|
| **Multi-Device** | Kompatibel penuh dengan sistem multi-device WhatsApp terbaru |
| **Pairing Code & QR** | Login pakai kode pairing custom maupun scan QR |
| **Pesan Interaktif** | Button, list, native flow, dan pesan template lainnya |
| **Manajemen Sesi** | Auth state tersimpan rapi, reconnect otomatis saat putus |
| **Signal Protocol Lokal** | Enkripsi end-to-end via modul signal yang di-vendor lokal |
| **Ringan & Modular** | Minim dependency berat, gampang diintegrasikan ke project apapun |
| **Dukungan Media Lengkap** | Gambar, video, stiker, dokumen, audio/voice note, lokasi, kontak, poll |

---

## 📦 Instalasi

Persyaratan: Node.js `>= 20.0.0`.

```bash
npm install @nyzzpedia/baileys
```

atau kalau pakai yarn:

```bash
yarn add @nyzzpedia/baileys
```

### Dependency Opsional (Peer)

```bash
npm install sharp        # pemrosesan gambar performa tinggi
npm install jimp         # alternatif pemrosesan gambar (pure JS)
npm install link-preview-js   # preview link otomatis
npm install qrcode-terminal   # tampilkan QR di terminal
```

---

## 🚀 Mulai Cepat

### Koneksi dengan QR Code

```js
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@nyzzpedia/baileys')
const { Boom } = require('@hapi/boom')

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info')

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error instanceof Boom)
                ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
                : true
            console.log('Koneksi terputus, reconnect:', shouldReconnect)
            if (shouldReconnect) startBot()
        } else if (connection === 'open') {
            console.log('✅ Berhasil terhubung ke WhatsApp!')
        }
    })

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0]
        if (!msg.message || msg.key.fromMe) return
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text
        console.log('Pesan masuk:', text)
    })
}

startBot()
```

### Koneksi dengan Pairing Code (tanpa scan QR)

```js
const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false
})

if (!sock.authState.creds.registered) {
    const nomor = '628xxxxxxxxxx' // format internasional, tanpa tanda "+"
    const code = await sock.requestPairingCode(nomor)
    console.log('Kode pairing:', code) // masukkan di WhatsApp > Perangkat Tertaut
}
```

---

## 💬 Tipe Pesan yang Didukung

### 1. Teks
```js
await sock.sendMessage(jid, { text: 'Halo dari Baileys New!' })

// Dengan mention
await sock.sendMessage(jid, {
    text: '@628xxxxxxxxxx halo!',
    mentions: ['628xxxxxxxxxx@s.whatsapp.net']
})

// Balas/quote pesan
await sock.sendMessage(jid, { text: 'Ini balasan' }, { quoted: msg })
```

### 2. Gambar
```js
await sock.sendMessage(jid, { image: { url: './gambar.jpg' }, caption: 'Captionnya' })

// View once
await sock.sendMessage(jid, { image: { url: './gambar.jpg' }, viewOnce: true })
```

### 3. Video
```js
await sock.sendMessage(jid, { video: { url: './video.mp4' }, caption: 'Video keren' })

// Sebagai GIF
await sock.sendMessage(jid, { video: { url: './animasi.mp4' }, gifPlayback: true })
```

### 4. Audio / Voice Note
```js
// Audio biasa
await sock.sendMessage(jid, { audio: { url: './audio.mp3' }, mimetype: 'audio/mp4' })

// Voice note
await sock.sendMessage(jid, {
    audio: { url: './voice.ogg' },
    mimetype: 'audio/ogg; codecs=opus',
    ptt: true
})
```

### 5. Dokumen
```js
await sock.sendMessage(jid, {
    document: { url: './file.pdf' },
    mimetype: 'application/pdf',
    fileName: 'laporan.pdf'
})
```

### 6. Sticker
```js
await sock.sendMessage(jid, { sticker: { url: './sticker.webp' } })
```

### 7. Lokasi
```js
await sock.sendMessage(jid, {
    location: {
        degreesLatitude: -6.2088,
        degreesLongitude: 106.8456,
        name: 'Jakarta'
    }
})
```

### 8. Kontak
```js
await sock.sendMessage(jid, {
    contacts: {
        displayName: 'Nama Kontak',
        contacts: [{ vcard: 'BEGIN:VCARD\nVERSION:3.0\nFN:Nama Kontak\nTEL;TYPE=CELL:+628xxxxxxxxxx\nEND:VCARD' }]
    }
})
```

### 9. Poll
```js
await sock.sendMessage(jid, {
    poll: {
        name: 'Pilih makanan favorit',
        values: ['Nasi Goreng', 'Mie Ayam', 'Sate'],
        selectableCount: 1
    }
})
```

### 10. Reaksi
```js
await sock.sendMessage(jid, {
    react: { text: '❤️', key: msg.key }
})
```

### 11. Tombol Interaktif
```js
await sock.sendMessage(jid, {
    text: 'Pilih salah satu:',
    buttons: [
        { buttonId: 'id1', buttonText: { displayText: 'Opsi 1' }, type: 1 },
        { buttonId: 'id2', buttonText: { displayText: 'Opsi 2' }, type: 1 }
    ]
})
```

> `jid` adalah ID tujuan: `628xxxxxxxxxx@s.whatsapp.net` untuk personal, `xxxxxxxxxx@g.us` untuk grup.

---

## ♻️ Mengubah / Menghapus Pesan

```js
// Hapus pesan
await sock.sendMessage(jid, { delete: msg.key })

// Edit pesan (teks saja)
await sock.sendMessage(jid, { text: 'Teks yang sudah diedit', edit: msg.key })
```

---

## 👥 Manajemen Grup

```js
// Buat grup baru
await sock.groupCreate('Nama Grup', ['628xxxxxxxxxx@s.whatsapp.net'])

// Tambah / keluarkan / promote / demote anggota
await sock.groupParticipantsUpdate(groupJid, ['628xxxxxxxxxx@s.whatsapp.net'], 'add')
await sock.groupParticipantsUpdate(groupJid, ['628xxxxxxxxxx@s.whatsapp.net'], 'remove')
await sock.groupParticipantsUpdate(groupJid, ['628xxxxxxxxxx@s.whatsapp.net'], 'promote')
await sock.groupParticipantsUpdate(groupJid, ['628xxxxxxxxxx@s.whatsapp.net'], 'demote')

// Update nama grup
await sock.groupUpdateSubject(groupJid, 'Nama Grup Baru')

// Info grup & invite link
const metadata = await sock.groupMetadata(groupJid)
const inviteCode = await sock.groupInviteCode(groupJid)
console.log(`https://chat.whatsapp.com/${inviteCode}`)

// Keluar dari grup
await sock.groupLeave(groupJid)

// Hanya admin yang bisa kirim pesan
await sock.groupSettingUpdate(groupJid, 'announcement')
await sock.groupSettingUpdate(groupJid, 'not_announcement')
```

---

## 👤 Manajemen Profil & Kontak

```js
// Cek nomor terdaftar di WA
const result = await sock.onWhatsApp('628xxxxxxxxxx')

// Ambil foto profil
const ppUrl = await sock.profilePictureUrl('628xxxxxxxxxx@s.whatsapp.net', 'image')

// Update nama & status profil sendiri
await sock.updateProfileName('Nama Baru')
await sock.updateProfileStatus('Status baru saya')

// Blokir / unblok kontak
await sock.updateBlockStatus('628xxxxxxxxxx@s.whatsapp.net', 'block')
await sock.updateBlockStatus('628xxxxxxxxxx@s.whatsapp.net', 'unblock')
```

---

## 🔐 Manajemen Sesi (Auth State)

```js
const { state, saveCreds } = await useMultiFileAuthState('auth_info')
sock.ev.on('creds.update', saveCreds) // wajib, jangan dihapus!
```

Untuk production, disarankan pindah dari file lokal ke penyimpanan yang lebih stabil (database/Redis) supaya sesi tidak hilang saat server di-restart. Kalau folder auth hilang/corrupt, satu-satunya jalan adalah login ulang.

---

## 📡 Event System

| Event | Kapan dipanggil |
|---|---|
| `connection.update` | Status koneksi berubah (connecting, open, close) |
| `creds.update` | Kredensial auth berubah — wajib disimpan |
| `messages.upsert` | Ada pesan baru masuk/terkirim |
| `messages.update` | Status pesan berubah (dihapus, diedit, dibaca) |
| `messages.reaction` | Ada reaksi baru ke pesan |
| `chats.upsert` / `chats.update` | Chat baru atau berubah |
| `contacts.upsert` / `contacts.update` | Kontak baru atau berubah |
| `groups.upsert` / `groups.update` | Grup baru atau berubah |
| `group-participants.update` | Anggota grup masuk/keluar/di-promote/demote |
| `presence.update` | Status online/mengetik kontak berubah |
| `call` | Ada panggilan masuk |

Contoh dengarin event anggota grup baru masuk:
```js
sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
    if (action === 'add') {
        for (const p of participants) {
            await sock.sendMessage(id, { text: `Selamat datang @${p.split('@')[0]}!`, mentions: [p] })
        }
    }
})
```

---

## 📥 Download Media

```js
const { downloadMediaMessage } = require('@nyzzpedia/baileys')

sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message) return

    const type = Object.keys(msg.message)[0]
    if (['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'].includes(type)) {
        const buffer = await downloadMediaMessage(msg, 'buffer', {})
        require('fs').writeFileSync(`./download.${type === 'imageMessage' ? 'jpg' : 'mp4'}`, buffer)
        console.log('Media berhasil diunduh!')
    }
})
```

---

## ❓ FAQ & Troubleshooting

**Q: Kenapa sering ke-disconnect sendiri?**
A: Pastikan `connection.update` menangani reconnect otomatis seperti contoh di atas, dan cek koneksi internet server stabil.

**Q: Bot ke-banned/logged out terus?**
A: Hindari kirim pesan dalam jumlah besar secara instan. Beri jeda antar pengiriman, terutama untuk broadcast.

**Q: Bisa jalan di Termux/Android?**
A: Bisa, selama dependency yang perlu native build berhasil ter-install. Kalau ada yang gagal build di Termux, biasanya aman di-skip karena hanya fitur opsional (misal `sharp`, ada `jimp` sebagai gantinya).

**Q: Kenapa pairing code tidak muncul?**
A: Pastikan `printQRInTerminal: false`, dan nomor dalam format internasional tanpa tanda `+`.

---

## ⚠️ Disclaimer

Library ini **tidak berafiliasi resmi dengan WhatsApp Inc./Meta**. Dibangun di atas fondasi protokol WhatsApp Web multi-device yang sama dipakai proyek open-source Baileys. Gunakan dengan bijak dan patuhi Ketentuan Layanan WhatsApp — risiko pemblokiran akun sepenuhnya ditanggung pengguna.

---

## 📜 Lisensi

MIT License.

<div align="center">

Dikembangkan & dirawat oleh **Nyzzpedia**

🚀 Nyzzpedia WhatsApp Engine · 📦 v1.0.0 — @nyzzpedia/baileys

</div>


---

## 🔄 Changelog 1.0.0

- Basis library diperbarui ke **Baileys resmi (WhiskeySockets) 7.0.0-rc14**, dikonversi ke CommonJS supaya `require()` tetap jalan.
- Dukungan **LID** penuh (LIDMappingStore + migrasi sesi PN → LID). Ditujukan untuk memperbaiki pesan privat yang berhenti di "Menunggu pesan ini".
- `whatsapp-rust-bridge` diganti implementasi JS murni (`hkdf`, `md5`, LT-Hash) — tanpa modul WASM/ESM-only.
- Fitur kustom Nyzzpedia dipertahankan: tipe pesan dugong (payment, product, interactive, album, event, poll result, group status), opsi `ai`, `filter`, anotasi media bawaan, banner, `makeInMemoryStore`.
- `Browsers('Chrome')` tetap bisa dipanggil seperti dulu, dan `Browsers.macOS('Chrome')` juga tersedia.
- Channel bawaan di `newsletter.js` dikembalikan (auto-follow saat koneksi terbuka). Nonaktifkan dengan opsi socket `autoFollowNewsletters: false`.
- Setelah upgrade: **hapus folder session lama lalu pair ulang**.
