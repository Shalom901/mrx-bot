// events/groupChanges.js

async function handleGroupUpdate(sock, update) {
    const groupId = update.id;
    
    try {
        // Obtener metadata del grupo
        const metadata = await sock.groupMetadata(groupId);
        const groupName = metadata.subject;
        
        // Detectar qué cambió
        if (update.subject !== undefined) {
            // Cambio de nombre del grupo
            const oldName = groupName;
            const newName = update.subject;
            const author = update.author;
            
            await sock.sendMessage(groupId, {
    text:
`📢 *ACTUALIZACIÓN DEL GRUPO*

📝 *Nombre del grupo modificado*

• *Nombre anterior:* ${oldName}
• *Nombre nuevo:* ${newName}
• *Modificado por:* @${author.split('@')[0]}

🕒 Fecha: ${new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })}`,
    mentions: [author]
});


        }
        
        if (update.desc !== undefined) {
            // Cambio de descripción del grupo
            const newDesc = update.desc || 'Sin descripción';
            const author = update.author;
            
            await sock.sendMessage(groupId, {
    text:
`📢 *ACTUALIZACIÓN DE LA DESCRIPCIÓN DEL GRUPO*

📝 *Nueva descripción:*
"${newDesc}"

👤 *Modificado por:* @${author.split('@')[0]}

🕒 *Fecha:* ${new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })}`,
    mentions: [author]
});


        
        if (update.announce !== undefined) {
            // Cambio en configuración de mensajes (solo admins o todos)
            const isRestricted = update.announce;
            const author = update.author;
            const status = isRestricted ? 'Solo administradores pueden enviar mensajes' : 'Todos pueden enviar mensajes';
            
            await sock.sendMessage(groupId, {
    text:
`⚙️ *CAMBIO EN LA CONFIGURACIÓN DE MENSAJES DEL GRUPO*

📢 *Nuevo estado:* ${status}

👤 *Modificado por:* @${author.split('@')[0]}
🕒 *Fecha:* ${new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })}`,
    mentions: [author]
});

            }
        }
        
        if (update.restrict !== undefined) {
            // Cambio en configuración de edición de info (solo admins o todos)
            const isRestricted = update.restrict;
            const author = update.author;
            const status = isRestricted ? 'Solo administradores pueden editar info del grupo' : 'Todos pueden editar info del grupo';
            
            await sock.sendMessage(groupId, {
    text:
`🔧 *CAMBIO EN LA CONFIGURACIÓN DE EDICIÓN DEL GRUPO*

✏️ *Nuevo estado:* ${status}

👤 *Modificado por:* @${author.split('@')[0]}
🕒 *Fecha:* ${new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })}`,
    mentions: [author]
});


        }
        
    } catch (error) {
        console.error('Error al manejar actualización del grupo:', error);
    }
}
// Función para manejar cambios de foto del grupo
async function handleGroupPictureUpdate(sock, update) {
    const groupId = update.id;
    const author = update.author;

    console.log('🔔 Se detectó un cambio de foto en el grupo:', groupId);

    try {
        await sock.sendMessage(groupId, {
            text: 
`🖼️ *FOTO DEL GRUPO ACTUALIZADA*

📸 La imagen del grupo fue cambiada correctamente.

👤 *Modificado por:* @${author.split('@')[0]}
🕒 *Hora del cambio:* ${new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })}`,
            mentions: [author]
        });
    } catch (error) {
        console.error('❌ Error al notificar cambio de foto:', error);
    }
}


// Función para manejar promociones/degradaciones de admin
async function handleGroupParticipantsAdmin(sock, update) {
    const groupId = update.id;
    
    try {
        const metadata = await sock.groupMetadata(groupId);
        
        for (const participant of update.participants) {
            if (update.action === 'promote') {
                await sock.sendMessage(groupId, {
    text: 
`👑 *NUEVO ADMINISTRADOR DESIGNADO*

🎉 El miembro @${participant.split('@')[0]} ha sido promovido como *administrador del grupo*.

👤 *Acción realizada por:* @${update.author.split('@')[0]}
🕒 *Fecha:* ${new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })}`,
    mentions: [participant, update.author]
});

            } else if (update.action === 'demote') {
                await sock.sendMessage(groupId, {
    text: 
`⚠️ *ADMINISTRADOR REMOVIDO*

📉 El miembro @${participant.split('@')[0]} ha sido *removido de su rol de administrador*.

👤 *Acción realizada por:* @${update.author.split('@')[0]}
🕒 *Fecha:* ${new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })}`,
    mentions: [participant, update.author]
});


            }
        }
    } catch (error) {
        console.error('Error al manejar cambios de admin:', error);
    }
}

module.exports = {
    handleGroupUpdate,
    handleGroupPictureUpdate,
    handleGroupParticipantsAdmin
};