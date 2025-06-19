const Jimp = require('jimp');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const path = require('path');

async function stickerFromText(sock, m) {
    const mensaje = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
    const texto = mensaje.replace('.qc', '').trim();

    if (!texto) {
        await sock.sendMessage(m.key.remoteJid, {
            text: '❗ Escribe un texto después de `.qc` para generar el sticker.'
        });
        return;
    }

    // Cargar fuente grande (asegúrate que la ruta es correcta)
    const fuenteGrande = await Jimp.loadFont(path.join(__dirname, '../fonts/nunito/nunito.fnt'));
    // Si falla, puedes usar esta fuente estándar:
    // const fuenteGrande = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);

    // Medir el texto principal
    const anchoTexto = Jimp.measureText(fuenteGrande, texto);
    const altoTexto = Jimp.measureTextHeight(fuenteGrande, texto, anchoTexto);

    const padding = 20;
    const anchoFinal = anchoTexto + padding * 2;
    const altoFinal = altoTexto + padding * 2;

    // Crear imagen transparente con fondo negro semi-transparente
    const imagen = new Jimp(anchoFinal, altoFinal, 0x000000CC);

    // Crear máscara para bordes redondeados
    const radius = 30;
    const mask = new Jimp(anchoFinal, altoFinal, 0xFFFFFFFF);

    mask.scan(0, 0, mask.bitmap.width, mask.bitmap.height, function (x, y, idx) {
        if (x < radius && y < radius) {
            const dx = radius - x;
            const dy = radius - y;
            if (dx * dx + dy * dy > radius * radius) this.bitmap.data[idx + 3] = 0;
        }
        if (x > mask.bitmap.width - radius && y < radius) {
            const dx = x - (mask.bitmap.width - radius);
            const dy = radius - y;
            if (dx * dx + dy * dy > radius * radius) this.bitmap.data[idx + 3] = 0;
        }
        if (x < radius && y > mask.bitmap.height - radius) {
            const dx = radius - x;
            const dy = y - (mask.bitmap.height - radius);
            if (dx * dx + dy * dy > radius * radius) this.bitmap.data[idx + 3] = 0;
        }
        if (x > mask.bitmap.width - radius && y > mask.bitmap.height - radius) {
            const dx = x - (mask.bitmap.width - radius);
            const dy = y - (mask.bitmap.height - radius);
            if (dx * dx + dy * dy > radius * radius) this.bitmap.data[idx + 3] = 0;
        }
    });

    // Aplicar máscara para redondear bordes
    imagen.mask(mask, 0, 0);

    // Calcular posición Y para centrar verticalmente pero dejando más espacio abajo
    const yPos = (altoFinal - altoTexto) / 2 - 5; // Ajusta 5 para subir texto

    // Limitar que yPos no sea negativo para que no se salga arriba
    const yPosAjustado = yPos < 0 ? 0 : yPos;

    // Imprimir el texto centrado horizontal y ajustado verticalmente
    imagen.print(
        fuenteGrande,
        0,
        yPosAjustado,
        {
            text: texto,
            alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
        },
        anchoFinal,
        altoTexto
    );


    // Obtener buffer PNG
    const buffer = await imagen.getBufferAsync(Jimp.MIME_PNG);

    // Crear sticker sin autor (autor vacío para que no aparezca nada)
    const sticker = new Sticker(buffer, {
        pack: 'MrX Bot',
        author: '',
        type: StickerTypes.FULL,
        quality: 80,
        crop: false,
        keepScale: true
    });

    const stickerBuffer = await sticker.toBuffer();
    await sock.sendMessage(m.key.remoteJid, { sticker: stickerBuffer }, { quoted: m });
}

module.exports = { stickerFromText };
