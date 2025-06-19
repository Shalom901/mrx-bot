async function kickMember(sock, m) {
    const groupId = m.key.remoteJid;

    // Verificar si es un grupo
    if (!groupId.endsWith('@g.us')) {
        await sock.sendMessage(groupId, { text: '❌ Este comando solo funciona en grupos.' });
        return;
    }

    // Manejo de errores al obtener metadata
    let metadata;
    try {
        metadata = await sock.groupMetadata(groupId);
    } catch (err) {
        console.error('❌ No se pudo obtener la metadata del grupo:', err?.output?.payload?.message || err.message);
        await sock.sendMessage(groupId, {
            text: '❌ No se pudo obtener la información del grupo. Puede que el bot ya no esté en el grupo o aún esté sincronizando.'
        }).catch(() => {});
        return;
    }

    const admins = metadata.participants.filter(p =>
        p.admin === 'admin' || p.admin === 'superadmin'
    );

    const sender = m.key.participant || m.key.remoteJid;
    const texto = m.message?.conversation ||
        m.message?.extendedTextMessage?.text || '';

    const botNumber = "56972997993";
    let botJid = null;

    const botInGroup = metadata.participants.find(p => {
        const n = p.id.split('@')[0].split(':')[0];
        return n === botNumber;
    });

    if (botInGroup) {
        botJid = botInGroup.id;
    } else if (sock.user?.id) {
        botJid = sock.user.id.includes('@') ? sock.user.id : `${sock.user.id}@s.whatsapp.net`;
    } else {
        botJid = `${botNumber}@s.whatsapp.net`;
    }

    const isSenderAdmin = admins.some(p => p.id === sender);
    let isBotAdmin = false;

    if (botInGroup) {
        isBotAdmin = botInGroup.admin === 'admin' || botInGroup.admin === 'superadmin';
    }

    if (!isBotAdmin) {
        isBotAdmin = admins.some(p => {
            const adminNum = p.id.split('@')[0].split(':')[0];
            return adminNum === botNumber;
        });
    }

    // DEBUG
    if (texto.includes('debugbot') || texto.includes('debugadmin')) {
        const debugInfo = `
🔍 *DIAGNÓSTICO COMPLETO*

🤖 *INFO DEL BOT:*
• ID detectado: ${botJid}
• ID real en grupo: ${botInGroup ? botInGroup.id : 'No encontrado'}
• Número: ${botNumber}
• ¿Está en el grupo? ${botInGroup ? '✅ SÍ' : '❌ NO'}
${botInGroup ? `• Status: ${botInGroup.admin || 'member'}` : ''}

👤 *USUARIO QUE EJECUTA:*
• ID: ${sender}
• ¿Es admin? ${isSenderAdmin ? '✅ SÍ' : '❌ NO'}

📊 *ESTADÍSTICAS DEL GRUPO:*
• Total participantes: ${metadata.participants.length}
• Total admins: ${admins.length}

👥 *LISTA COMPLETA DE PARTICIPANTES:*
${metadata.participants.map((p, i) => {
    const n = p.id.split('@')[0].split(':')[0];
    return `${i + 1}. ${n} - ${p.admin || 'member'} ${n === botNumber ? '← 🤖 BOT' : ''}`;
}).join('\n')}

🔧 *ESTADO ACTUAL:*
${!botInGroup ?
    `❌ EL BOT NO ESTÁ EN EL GRUPO\n\n📋 PASOS:\n1. Agregar +${botNumber} al grupo\n2. Darle admin inmediatamente\n3. Reiniciar bot: node .` :
    `✅ Bot en el grupo como: ${botInGroup.admin || 'member'}\n${(!botInGroup.admin || botInGroup.admin === 'member') ? '⚠️ FALTA: Dar permisos de admin al bot' : '✅ Bot tiene permisos de admin'}`
}

🔍 *DETECCIÓN:*
• Bot detectado por: ${botInGroup ? 'Búsqueda en participantes' : 'Método alternativo'}
• Admin detectado: ${isBotAdmin ? 'SÍ' : 'NO'}
        `;
        await sock.sendMessage(groupId, { text: debugInfo });
        return;
    }

    if (!isSenderAdmin) {
        await sock.sendMessage(groupId, { text: '❌ Solo los administradores pueden usar este comando.' });
        return;
    }

    if (!isBotAdmin) {
        await sock.sendMessage(groupId, {
            text: `⚠️ No puedo expulsar, no soy administrador del grupo.\n\n🔧 Usa: .kick debugbot para más detalles.\n📋 Mi ID: ${botJid}`
        });
        return;
    }

    let userToKick = null;

    if (m.message?.extendedTextMessage?.contextInfo?.participant) {
        userToKick = m.message.extendedTextMessage.contextInfo.participant;
    } else if (m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
        userToKick = m.message.extendedTextMessage.contextInfo.mentionedJid[0];
    } else {
        const match = texto.match(/@(\d+)/);
        if (match) {
            userToKick = `${match[1]}@s.whatsapp.net`;
        }
    }

    if (!userToKick) {
        await sock.sendMessage(groupId, {
            text: '❗ Para usar este comando:\n• Responde a un mensaje del usuario\n• Menciona al usuario con @\n• Usa: .kick @usuario'
        });
        return;
    }

    const isTargetAdmin = admins.some(p => p.id === userToKick);
    if (isTargetAdmin) {
        await sock.sendMessage(groupId, {
            text: '❌ No puedo expulsar a un administrador del grupo.'
        });
        return;
    }

    const isUserInGroup = metadata.participants.some(p => p.id === userToKick);
    if (!isUserInGroup) {
        await sock.sendMessage(groupId, {
            text: '❌ El usuario no está en este grupo.'
        });
        return;
    }

    try {
        await sock.groupParticipantsUpdate(groupId, [userToKick], 'remove');
        await sock.sendMessage(groupId, {
            text: `👢 Usuario eliminado exitosamente: @${userToKick.split('@')[0]}`,
            mentions: [userToKick]
        });
    } catch (error) {
        console.error('❌ Error al expulsar:', error);
        if (error.output?.statusCode === 403) {
            await sock.sendMessage(groupId, {
                text: '❌ Sin permisos. El bot debe ser administrador del grupo.'
            });
        } else if (error.output?.statusCode === 400) {
            await sock.sendMessage(groupId, {
                text: '❌ Usuario no encontrado o ya no está en el grupo.'
            });
        } else {
            await sock.sendMessage(groupId, {
                text: '❌ Error al expulsar al usuario. Intenta de nuevo.'
            });
        }
    }
}

module.exports = { kickMember };
