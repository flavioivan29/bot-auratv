const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

const IPTV_URL = "http://zonacero.lat:8080/get.php?username=NOVA73R45&password=rEpYABmMbDMw&type=m3u_plus";

// Función general para parsear el catálogo buscando 2025 o 2026
app.get('/api/cine', async (req, res) => {
    try {
        const respuesta = await axios.get(IPTV_URL, { timeout: 25000, headers: { 'User-Agent': 'VLC/3.0.16' } });
        const lineas = respuesta.data.split('\n');
        const peliculas = [];
        const vistos = new Set();

        for (let i = 0; i < lineas.length; i++) {
            const linea = lineas[i].trim();
            if (linea.startsWith('#EXTINF:')) {
                const groupMatch = linea.match(/group-title="([^"]+)"/);
                const grupo = groupMatch ? groupMatch[1] : "Otros";
                const grupoMin = grupo.toLowerCase();
                
                // Ignorar canales en vivo obvios
                if (grupoMin.includes('en vivo') || grupoMin.includes('live') || grupoMin.includes('tv argentina') || grupoMin.includes('canales')) {
                    continue;
                }

                const partes = linea.split(',');
                const nombre = partes[partes.length - 1].trim();
                const nombreMin = nombre.toLowerCase();

                // Buscar contenido de 2025 o 2026
                if (nombre.includes('2025') || nombre.includes('2026') || grupo.includes('2025') || grupo.includes('2026')) {
                    if (!vistos.has(nombreMin)) {
                        if (i + 1 < lineas.length) {
                            const urlVideo = lineas[i + 1].trim();
                            if (urlVideo.startsWith('http') && !urlVideo.includes('/live/')) {
                                vistos.add(nombreMin);
                                peliculas.push({
                                    titulo: nombre,
                                    categoria: grupo,
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
            total: peliculas.length,
            resultados: peliculas.slice(0, 100) // Mostramos hasta 100 resultados para probar
        });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

app.get('/api/version', (req, res) => {
    res.json({ versionCode: 1, versionName: "1.0.0", notas: "AuraTV Activo" });
});

app.get('/', (req, res) => {
    res.send("Servidor de AuraTV operando correctamente.");
});

app.listen(PORT, () => {
    console.log(`Servidor operando en el puerto ${PORT}`);
});
