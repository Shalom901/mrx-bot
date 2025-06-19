// First, uninstall old ytdl-core and install the working fork
// Run these commands in your terminal:
// npm uninstall ytdl-core
// npm install @distube/ytdl-core

const ytdl = require('@distube/ytdl-core'); // Changed from 'ytdl-core'
const yts = require('yt-search');
const fs = require('fs');
const path = require('path');

// Alternative: You can also try @ybd-project/ytdl-core
// const ytdl = require('@ybd-project/ytdl-core');

const playMusic = async (sock, message, args) => {
    try {
        const query = args.join(' ');
        if (!query) {
            await sock.sendMessage(message.key.remoteJid, {
                text: '❌ Por favor proporciona el nombre de la canción'
            });
            return;
        }

        console.log(`🔍 Buscando en YouTube: ${query}`);
        
        // Search for the video
        const search = await yts(query);
        if (!search.videos.length) {
            await sock.sendMessage(message.key.remoteJid, {
                text: '❌ No se encontraron resultados'
            });
            return;
        }

        const video = search.videos[0];
        console.log(`✅ Encontrado: ${video.title}`);
        console.log(`🔗 URL: ${video.url}`);

        // Send "downloading" message
        await sock.sendMessage(message.key.remoteJid, {
            text: `🎵 Descargando: ${video.title}\n⏱️ Duración: ${video.timestamp}\n👤 Canal: ${video.author.name}`
        });

        // Validate video URL
        if (!ytdl.validateURL(video.url)) {
            throw new Error('URL de video inválida');
        }

        // Get video info to check availability
        const info = await ytdl.getInfo(video.url);
        console.log('✅ Información del video obtenida');

        // Create temp directory if it doesn't exist
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // Generate filename
        const fileName = `${Date.now()}_audio.mp3`;
        const filePath = path.join(tempDir, fileName);

        // Download options
        const downloadOptions = {
            filter: 'audioonly',
            quality: 'highestaudio',
            format: 'mp3'
        };

        console.log('🔄 Iniciando descarga...');

        // Create download stream
        const stream = ytdl(video.url, downloadOptions);
        const writeStream = fs.createWriteStream(filePath);

        // Handle stream events
        stream.pipe(writeStream);

        stream.on('error', (error) => {
            console.error('❌ Error en stream:', error);
            throw new Error(`Error de descarga: ${error.message}`);
        });

        writeStream.on('error', (error) => {
            console.error('❌ Error escribiendo archivo:', error);
            throw new Error(`Error guardando archivo: ${error.message}`);
        });

        // Wait for download to complete
        await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
            stream.on('error', reject);
        });

        console.log('✅ Descarga completada');

        // Check if file exists and has content
        if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
            throw new Error('El archivo descargado está vacío o no existe');
        }

        // Send audio file
        await sock.sendMessage(message.key.remoteJid, {
            audio: fs.readFileSync(filePath),
            mimetype: 'audio/mp4',
            ptt: false, // Set to true for voice message
            fileName: `${video.title}.mp3`
        });

        console.log('✅ Audio enviado exitosamente');

        // Clean up - delete temp file
        setTimeout(() => {
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log('🗑️ Archivo temporal eliminado');
                }
            } catch (error) {
                console.error('⚠️ Error eliminando archivo temporal:', error);
            }
        }, 5000);

    } catch (error) {
        console.error('❌ Error al procesar la canción:', error);
        
        let errorMessage = '❌ Error al descargar la canción. ';
        
        if (error.message.includes('Video unavailable')) {
            errorMessage += 'El video no está disponible.';
        } else if (error.message.includes('private')) {
            errorMessage += 'El video es privado.';
        } else if (error.message.includes('age')) {
            errorMessage += 'El video tiene restricción de edad.';
        } else if (error.message.includes('copyright')) {
            errorMessage += 'El video tiene restricciones de copyright.';
        } else {
            errorMessage += 'Intenta con otra canción.';
        }

        await sock.sendMessage(message.key.remoteJid, {
            text: errorMessage
        });
    }
};

module.exports = playMusic;

// Additional helper functions for better error handling

// Function to check if video is available
const checkVideoAvailability = async (url) => {
    try {
        const info = await ytdl.getInfo(url);
        return {
            available: true,
            title: info.videoDetails.title,
            duration: info.videoDetails.lengthSeconds
        };
    } catch (error) {
        return {
            available: false,
            error: error.message
        };
    }
};

// Function to get best audio format
const getBestAudioFormat = (formats) => {
    // Filter audio-only formats
    const audioFormats = formats.filter(format => 
        format.hasAudio && !format.hasVideo
    );
    
    // Sort by audio quality (bitrate)
    audioFormats.sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0));
    
    return audioFormats[0] || formats.find(f => f.hasAudio);
};

module.exports = {
  playMusic,
  checkVideoAvailability,
  getBestAudioFormat
};
