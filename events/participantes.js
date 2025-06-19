const fs = require('fs');
const Jimp = require('jimp');

// ──────── 🎉 MENSAJE DE BIENVENIDA ────────
async function mensajeBienvenida(sock, participant, groupName, groupId) {
    try {
        const user = await sock.onWhatsApp(participant);
        const nombre = user?.[0]?.notify || participant.split('@')[0];

        const metadata = await sock.groupMetadata(groupId);
        const descripcion = metadata.desc || 'Este grupo aún no tiene una descripción.';

        const imagen = await Jimp.read('./assets/logo.png');
        const fontTitle = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
        const fontSmall = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);

        // 🌟 Escribir texto en la imagen
        imagen.print(fontTitle, 20, 20, `👋 ¡Bienvenido ${nombre}!`, 400);

        const descripcionCorta = descripcion.length > 120
            ? descripcion.slice(0, 120) + '...'
            : descripcion;

        imagen.print(fontSmall, 20, 70, `📋 Descripción:`, 400);
        imagen.print(fontSmall, 20, 90, descripcionCorta, 400);

        const temp = './media/bienvenida.jpg';
        await imagen.writeAsync(temp);

        const caption = 
`🎊 *¡Bienvenido al grupo ${groupName}!* 🎊

👤 Usuario: @${nombre}
📋 *Descripción del grupo:*
${descripcion}

✨ ¡𝐁𝐢𝐞𝐧𝐯𝐞𝐧𝐢𝐝@ 𝐝𝐢𝐬𝐟𝐫𝐮𝐭𝐚 𝐭𝐮 𝐞𝐬𝐭𝐚𝐝𝐢𝐚 !`;

        await sock.sendMessage(groupId, {
            image: fs.readFileSync(temp),
            caption: caption,
            mentions: [participant]
        });

        fs.unlinkSync(temp);
    } catch (error) {
        console.error('❌ Error en mensajeBienvenida:', error);
    }
}

// ──────── 🛫 MENSAJE DE DESPEDIDA ────────
async function mensajeDespedida(sock, participant, groupName, groupId) {
    try {
        const nombre = participant.split('@')[0];

        const imagen = await Jimp.read('./assets/logo.png');
        const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);

        imagen.print(font, 20, 20, `👋 Adiós, ${nombre}`, 400);

        const temp = './media/despedida.jpg';
        await imagen.writeAsync(temp);

        const caption = 
`📤 *${nombre} 𝐡𝐚 𝐬𝐚𝐥𝐢𝐝𝐨 𝐝𝐞𝐥 𝐠𝐫𝐮𝐩𝐨 ${groupName}.*

🚪 ¡𝐎𝐣𝐚𝐥𝐚 𝐧𝐨 𝐯𝐮𝐞𝐥𝐯𝐚𝐬 𝐩𝐞𝐫𝐫@!`;

        await sock.sendMessage(groupId, {
            image: fs.readFileSync(temp),
            caption: caption,
            mentions: [participant]
        });

        fs.unlinkSync(temp);
    } catch (error) {
        console.error('❌ Error en mensajeDespedida:', error);
    }
}

module.exports = { mensajeBienvenida, mensajeDespedida };
