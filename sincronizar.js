const axios = require('axios');
const fs = require('fs');

const IPTV_URL = "http://zonacero.lat:8080/get.php?username=NOVA73R45&password=rEpYABmMbDMw&type=m3u_plus";
const regexFormatoSerie = /\b(S\d+E\d+|temporada|temp|t\d+|capitulo|cap)\b/i;

async function ejecutarSincronizacion() {
    console.log("📥 Conectando a la lista IPTV...");
    try {
        const respuesta = await axios.get(IPTV_URL, { timeout: 30000, headers: { 'User-Agent': 'VLC/3.0.16' } });
        const lineas = respuesta.data.split('\n');
        const peliculas = [];
        const vistos = new Set();

        for (let i = 0; i < lineas.length; i++) {
            const linea = lineas[i].trim();
            if (linea.startsWith('#EXTINF:')) {
                const groupMatch = linea.match(/group-title="([^"]+)"/);
                const grupo = groupMatch ? groupMatch[1] : "Otros";
                const grupoMin = grupo.toLowerCase();
                
                if (grupoMin.includes('en vivo') || grupoMin.includes('live') || 
                    grupoMin.includes('tv') || grupoMin.includes('canales') || 
                    grupoMin.includes('deportes') || grupoMin.includes('sport') ||
                    grupoMin.includes('serie') || grupoMin.includes('temporada')) {
                    continue;
                }

                const partes = linea.split(',');
                const nombre = partes[partes.length - 1].trim();
                const nombreMin = nombre.toLowerCase();

                const es2025_2026 = nombre.includes('2025') || nombre.includes('2026') || grupo.includes('2025') || grupo.includes('2026');
                if (!es2025_2026) continue;

                if (regexFormatoSerie.test(nombre) || nombreMin.includes('vs') || nombreMin.includes(' partido ')) {
                    continue;
                }

                const logoMatch = linea.match(/tvg-logo="([^"]+)"/);
                const poster = logoMatch ? logoMatch[1].trim() : "https://via.placeholder.com/300x450?text=Sin+Poster";

                if (i + 1 < lineas.length) {
                    const urlVideo = lineas[i + 1].trim();
                    if (urlVideo.startsWith('http') && urlVideo.includes('/movie/')) {
                        if (!vistos.has(nombreMin)) {
                            vistos.add(nombreMin);
                            peliculas.push({
                                titulo: nombre,
                                categoria: grupo,
                                poster: poster,
                                url_video: urlVideo
                            });
                        }
                    }
                }
            }
        }

        console.log(`🎬 Películas filtradas encontradas: ${peliculas.length}. Guardando localmente...`);

        const payload = {
            peliculas: peliculas,
            series: [] 
        };

        // Forzar codificación estricta en ASCII plano para evitar normalización de caracteres en GitHub
        const nombreArchivoLimpio = Buffer.from('peliculas.json', 'ascii').toString();
        fs.writeFileSync(nombreArchivoLimpio, JSON.stringify(payload, null, 2), { encoding: 'utf-8', flag: 'w' });

        console.log("¡Archivo peliculas.json generado con éxito!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error durante la sincronización:", error.message);
        process.exit(1);
    }
}

ejecutarSincronizacion();
