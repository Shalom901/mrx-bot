// commands/menu.js

const menuTexto = 
`╭───────👾 *MrX Bot* 👾───────╮
│
│ 🤖 *Versión:* v1.0
│ 🧠 *Desarrollador:* MrX
│
├───🎯 *Comandos Disponibles* ───
│
│ 📌 *Stickers*
│   • .s → Responde a una imagen para crear un sticker
│   • .qc → Convierte texto en sticker
│
│ 🎵 *Música*
│   • .play [nombre] → Reproduce música de YouTube
│
│ 🛡️ *Administración de Grupos*
│   • .kick @usuario → Expulsa a un miembro
│     También puedes responder a su mensaje
│
│ 👋 *Automatización*
│   • Mensajes de bienvenida y despedida automáticos
│
│ 🧰 *Próximamente...*
│   • Nuevas herramientas y utilidades en camino
│
╰───────────────✦───────────────╯
ℹ️ Escribe *.help* para más detalles o asistencia.`;

async function mostrarMenu(sock, m) {
    const jid = m.key.remoteJid;
    await sock.sendMessage(jid, { text: menuTexto }, { quoted: m });
}

module.exports = { mostrarMenu };
