const qrcode = require('qrcode-terminal');
const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { mensajeBienvenida, mensajeDespedida } = require('./events/participantes');
const { handleGroupUpdate, handleGroupPictureUpdate, handleGroupParticipantsAdmin } = require('./events/groupChanges');
const { stickerFromImage } = require('./commands/sticker');
const { stickerFromText } = require('./commands/qc');
const { playMusic } = require('./commands/play');
const { mostrarMenu } = require('./commands/menu');
const { kickMember } = require('./commands/kick');
const fs = require('fs');
const QRCode = require('qrcode');
const ffmpeg = require('fluent-ffmpeg');

ffmpeg.setFfmpegPath('C:/ffmpeg/bin/ffmpeg.exe');
ffmpeg.setFfprobePath('C:/ffmpeg/bin/ffprobe.exe');

async function abrirQR(ruta) {
    const { default: open } = await import('open');
    open(ruta);
}

async function iniciarMrX() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth');
    const sock = makeWASocket({
        auth: state,
        browser: ['MrX Bot', 'Chrome', '1.0.0']
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, qr } = update;

        if (qr) {
            console.log('📱 Abriendo QR en imagen...');
            QRCode.toFile('qr.png', qr, {
                color: { dark: '#000', light: '#FFF' }
            }, function (err) {
                if (err) throw err;
                abrirQR('qr.png');
            });
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'open') {
            console.log('✅ Bot conectado exitosamente a WhatsApp');
        } else if (connection === 'close') {
            console.log('❌ Conexión cerrada. Intentando reconectar...');
            iniciarMrX();
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // Escuchar mensajes
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.fromMe) return;

        // Evitar procesar mensajes duplicados
        if (m.messageStubType) return;

        const tipo = Object.keys(m.message)[0];
        const contenido = m.message[tipo];
        
        // Mejorar la obtención del texto
        const texto = contenido?.caption || 
                     contenido?.text || 
                     m.message?.conversation || 
                     m.message?.extendedTextMessage?.text || "";
        
        const comando = texto.toLowerCase().trim();

        const isGroup = m.key.remoteJid.endsWith('@g.us');
        let sender = m.key.participant || m.key.remoteJid;

        // Debug para ver qué se está recibiendo
        console.log('Mensaje recibido:', {
            texto: texto,
            comando: comando,
            tipo: tipo,
            isGroup: isGroup,
            sender: sender
        });

        // --- Comando .kick (se maneja primero para evitar conflictos)
        if (comando.startsWith('.kick') || comando === '.kick') {
            console.log('Ejecutando comando kick...');
            await kickMember(sock, m);
            return;
        }
        
        if (comando === '.debugadmin') {
            const metadata = await sock.groupMetadata(m.key.remoteJid);
            const admins = metadata.participants.filter(p => p.admin);
            let botId = sock.user.id;
            if (botId.includes(':')) botId = botId.split(':')[0];
            const botJid = botId.includes('@') ? botId : `${botId}@s.whatsapp.net`;

            await sock.sendMessage(m.key.remoteJid, {
                text: `🤖 ID del Bot: ${botJid}\nAdmins del grupo:\n${admins.map(a => a.id).join('\n')}`
            });
        }


        // --- Comando .s como subtítulo de imagen
        if (comando === '.s' && tipo === 'imageMessage') {
            await stickerFromImage(sock, m);
            return;
        }

        // --- Comando .s como respuesta a imagen
        if (comando === '.s' && m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
            const quoted = {
                key: {
                    remoteJid: m.key.remoteJid,
                    id: m.message.extendedTextMessage.contextInfo.stanzaId,
                    fromMe: false
                },
                message: m.message.extendedTextMessage.contextInfo.quotedMessage
            };
            await stickerFromImage(sock, quoted);
            return;
        }

        // --- Comando .qc
        if (comando.startsWith('.qc')) {
            const textoSticker = comando.replace('.qc', '').trim();

            if (!textoSticker) {
                await sock.sendMessage(m.key.remoteJid, { text: '❗ Escribe algo después de `.qc` para crear el sticker.' });
                return;
            }

            await stickerFromText(sock, m, textoSticker);
            return;
        }

        // --- Comando .play
        if (comando.startsWith('.play')) {
            const nombre = comando.replace('.play', '').trim();
            const args = typeof nombre === 'string' ? nombre.split(' ') : [];
            await playMusic(sock, m, args);
            return;
        }

        // --- Comando .menu
        if (comando === '.menu') {
            await mostrarMenu(sock, m);
            return;
        }
    });

    // Evento de participantes
    sock.ev.on('group-participants.update', async (update) => {
        if (update.action === 'add' || update.action === 'remove') {
            const metadata = await sock.groupMetadata(update.id);
            const groupName = metadata.subject;

            for (const participant of update.participants) {
                if (update.action === 'add') {
                    await mensajeBienvenida(sock, participant, groupName, update.id);
                } else if (update.action === 'remove') {
                    await mensajeDespedida(sock, participant, groupName, update.id);
                }
            }
        } else if (update.action === 'promote' || update.action === 'demote') {
            // Manejar promociones y degradaciones de admin
            await handleGroupParticipantsAdmin(sock, update);
        }
    });

    // Evento para cambios en el grupo (nombre, descripción, configuraciones)
    sock.ev.on('groups.update', async (updates) => {
        for (const update of updates) {
            await handleGroupUpdate(sock, update);
        }
    });

    // Evento para cambios de foto del grupo
    sock.ev.on('group-participants.update', async (update) => {
        if (update.action === 'picture') {
            await handleGroupPictureUpdate(sock, update);
        }
    });
}

iniciarMrX();