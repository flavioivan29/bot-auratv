const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

const IPTV_URL = "http://zonacero.lat:8080/get.php?username=NOVA73R45&password=rEpYABmMbDMw&type=m3u_plus";

// Expresión regular para detectar formatos de series (ej: S01E02, Temporada, etc.)
const regexFormatoSerie = /\b(S\d+E\d+|temporada|temp|t\d+|capitulo|cap)\b/i;

// ==========================================
// ENDPOINT DE CINE (Películas VOD 2025-2026)
// ==========================================
app.get('/api/cine', async (req, res) => {
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
                
                // Filtro estricto: Descartar TV en vivo, deportes en vivo o categorías de series
                if (grupoMin.includes('en vivo') || grupoMin.includes('live') || 
                    grupoMin.includes('tv') || grupoMin.includes('canales') || 
                    grupoMin.includes('deportes') || grupoMin.includes('sport') ||
                    grupoMin.includes('serie') || grupoMin.includes('temporada')) {
                    continue;
                }

                const partes = linea.split(',');
                const nombre = partes[partes.length - 1].trim();
                const nombreMin = nombre.toLowerCase();

                // Debe ser explícitamente 2025 o 2026
                const es2025_2026 = nombre.includes('2025') || nombre.includes('2026') || grupo.includes('2025') || grupo.includes('2026');
                if (!es2025_2026) continue;

                // Evitar que se filtren series o transmisiones en vivo dentro de cine
                if (regexFormatoSerie.test(nombre) || nombreMin.includes('vs') || nombreMin.includes(' partido ')) {
                    continue;
                }

                const logoMatch = linea.match(/tvg-logo="([^"]+)"/);
                const poster = logoMatch ? logoMatch[1].trim() : "";

                if (i + 1 < lineas.length) {
                    const urlVideo = lineas[i + 1].trim();
                    // Validar que sea un enlace directo de video VOD (que contenga '/movie/')
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

        res.json({
            status: "ok",
            total: peliculas.length,
            peliculas: peliculas
        });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

// ==========================================
// ENDPOINT DE SERIES (2025-2026)
// ==========================================
app.get('/api/series', async (req, res) => {
    try {
        const respuesta = await axios.get(IPTV_URL, { timeout: 30000, headers: { 'User-Agent': 'VLC/3.0.16' } });
        const lineas = respuesta.data.split('\n');
        const series = [];
        const vistos = new Set();

        for (let i = 0; i < lineas.length; i++) {
            const linea = lineas[i].trim();
            if (linea.startsWith('#EXTINF:')) {
                const groupMatch = linea.match(/group-title="([^"]+)"/);
                const grupo = groupMatch ? groupMatch[1] : "Otros";
                const grupoMin = grupo.toLowerCase();

                const esGrupoSeries = grupoMin.includes('serie') || grupoMin.includes('temporada') || linea.includes('/series/');
                const tieneFormatoSerie = regexFormatoSerie.test(linea);

                if (esGrupoSeries || tieneFormatoSerie) {
                    const partes = linea.split(',');
                    const nombre = partes[partes.length - 1].trim();
                    
                    const es2025_2026 = grupo.includes('2025') || grupo.includes('2026') || nombre.includes('2025') || nombre.includes('2026');
                    if (!es2025_2026) continue;

                    const logoMatch = linea.match(/tvg-logo="([^"]+)"/);
                    const poster = logoMatch ? logoMatch[1].trim() : "";

                    if (i + 1 < lineas.length) {
                        const urlVideo = lineas[i + 1].trim();
                        if (urlVideo.startsWith('http')) {
                            if (!vistos.has(nombre)) {
                                vistos.add(nombre);
                                series.push({
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
        }

        res.json({
            status: "ok",
            total: series.length,
            series: series
        });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

app.get('/api/version', (req, res) => {
    res.json({ versionCode: 1, versionName: "1.0.0", notas: "AuraTV Backend Operativo" });
});

app.get('/', (req, res) => {
    res.send("Servidor de AuraTV (Catálogo 2025-2026) operando correctamente.");
});

app.listen(PORT, () => {
    console.log(`Servidor operando en el puerto ${PORT}`);
});
