const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

async function stickerFromImage(sock, m) {
    const mediaDir = './media';
    if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir);

    const buffer = await downloadMediaMessage(m, 'buffer');
    const tempJpg = path.join(mediaDir, 'temp.jpg');
    const tempWebp = path.join(mediaDir, 'temp.webp');

    fs.writeFileSync(tempJpg, buffer);

    ffmpeg(tempJpg)
        .outputOptions(['-vcodec', 'libwebp', '-vf', 'scale=512:512'])
        .toFormat('webp')
        .save(tempWebp)
        .on('end', () => {
            sock.sendMessage(m.key.remoteJid, { sticker: fs.readFileSync(tempWebp) }, { quoted: m });
            fs.unlinkSync(tempJpg);
            fs.unlinkSync(tempWebp);
        })
        .on('error', (err) => {
            console.error('Error al crear sticker:', err);
        });
}

module.exports = { stickerFromImage };
