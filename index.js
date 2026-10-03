const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

const IPTV_URL = "http://zonacero.lat:8080/get.php?username=NOVA73R45&password=rEpYABmMbDMw&type=m3u_plus";

const regexFormatoSerie = /\b(S\d+E\d+|temporada|temp|t\d+|capitulo|cap)\b/i;

// ==========================================
// ENDPOINT DE CINE (JSON API)
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
                const poster = logoMatch ? logoMatch[1].trim() : "";

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
// VISTA WEB VISUAL (Para ver los pósters en acción)
// ==========================================
app.get('/catalogo', async (req, res) => {
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
                
                if (grupoMin.includes('en vivo') || grupoMin.includes('live') || grupoMin.includes('tv') || grupoMin.includes('canales') || grupoMin.includes('serie')) continue;

                const partes = linea.split(',');
                const nombre = partes[partes.length - 1].trim();
                const nombreMin = nombre.toLowerCase();

                if (!nombre.includes('2025') && !nombre.includes('2026') && !grupo.includes('2025') && !grupo.includes('2026')) continue;

                const logoMatch = linea.match(/tvg-logo="([^"]+)"/);
                const poster = logoMatch ? logoMatch[1].trim() : "https://via.placeholder.com/300x450?text=Sin+Poster";

                if (i + 1 < lineas.length) {
                    const urlVideo = lineas[i + 1].trim();
                    if (urlVideo.startsWith('http') && urlVideo.includes('/movie/')) {
                        if (!vistos.has(nombreMin)) {
                            vistos.add(nombreMin);
                            peliculas.push({ titulo: nombre, poster, url_video: urlVideo });
                        }
                    }
                }
            }
        }

        let html = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>AuraTV - Cartelera 2025/2026</title>
            <style>
                body { background: #0f172a; color: #fff; font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                h1 { text-align: center; color: #38bdf8; }
                .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 20px; padding: 20px; }
                .card { background: #1e293b; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: flex; flex-direction: column; }
                .card img { width: 100%; height: 260px; object-fit: cover; background: #334155; }
                .card-body { padding: 12px; font-size: 14px; flex-grow: 1; display: flex; flex-direction: column; justify-content: space-between; }
                .card-title { font-weight: bold; margin-bottom: 8px; }
                .card a { color: #38bdf8; text-decoration: none; font-size: 12px; word-break: break-all; }
            </style>
        </head>
        <body>
            <h1>🎬 AuraTV - Cartelera Exclusiva 2025 / 2026</h1>
            <p style="text-align: center;">Total de películas encontradas: ${peliculas.length}</p>
            <div class="grid">
        `;

        peliculas.forEach(p => {
            let imgUrl = p.poster && p.poster.startsWith('http') ? p.poster : 'https://via.placeholder.com/300x450?text=AuraTV';
            html += `
                <div class="card">
                    <img src="${imgUrl}" alt="${p.titulo}" onerror="this.src='https://via.placeholder.com/300x450?text=Sin+Imagen'">
                    <div class="card-body">
                        <div class="card-title">${p.titulo}</div>
                        <a href="${p.url_video}" target="_blank">🔗 Probar Enlace</a>
                    </div>
                </div>
            `;
        });

        html += `</div></body></html>`;
        res.send(html);
    } catch (error) {
        res.status(500).send("Error al generar la cartelera: " + error.message);
    }
});

app.get('/', (req, res) => {
    res.send(`Servidor de AuraTV operando correctamente. Visita <a href="/catalogo">/catalogo</a> para ver la interfaz visual de películas.`);
});

app.listen(PORT, () => {
    console.log(`Servidor operando en el puerto ${PORT}`);
});
