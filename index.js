const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

const IPTV_URL = "http://zonacero.lat:8080/get.php?username=NOVA73R45&password=rEpYABmMbDMw&type=m3u_plus";

// Credenciales configuradas de JSONBin
const JSONBIN_ID = "69e8cb4236566621a8dd85a8"; 
const JSONBIN_MASTER_KEY = "$2a$10$5T6xpO62IpSN1VJp5x0pQO8lUna4ew3PbmUPU10sCTJuC2chh8T3i"; 

const regexFormatoSerie = /\b(S\d+E\d+|temporada|temp|t\d+|capitulo|cap)\b/i;

// Función para extraer y filtrar películas de la lista IPTV
async function obtenerPeliculasActualizadas() {
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
    return peliculas;
}

// ==========================================
// ENDPOINT PARA SINCRONIZAR AUTOMÁTICAMENTE A JSONBIN
// ==========================================
app.get('/api/sincronizar', async (req, res) => {
    try {
        const peliculas = await obtenerPeliculasActualizadas();

        const payload = {
            peliculas: peliculas,
            series: [] 
        };

        // Enviar actualización a JSONBin via PUT
        await axios.put(`https://api.jsonbin.io/v3/b/${JSONBIN_ID}`, payload, {
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': JSONBIN_MASTER_KEY
            }
        });

        res.json({
            status: "ok",
            mensaje: "¡JSONBin actualizado con éxito!",
            total_peliculas_subidas: peliculas.length
        });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

// ==========================================
// ENDPOINT DE CINE (JSON API tradicional)
// ==========================================
app.get('/api/cine', async (req, res) => {
    try {
        const peliculas = await obtenerPeliculasActualizadas();
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
// VISTA WEB VISUAL (Para verificar pósters)
// ==========================================
app.get('/catalogo', async (req, res) => {
    try {
        const peliculas = await obtenerPeliculasActualizadas();

        let html = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>AuraTV - Cartelera 2025/2026</title>
            <style>
                body { background: #0f172a; color: #fff; font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                h1 { text-align: center; color: #38bdf8; }
                .acciones { text-align: center; margin-bottom: 20px; }
                .btn { background: #38bdf8; color: #0f172a; padding: 10px 20px; text-decoration: none; font-weight: bold; border-radius: 5px; display: inline-block; }
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
            <div class="acciones">
                <p>Total de películas encontradas: <strong>${peliculas.length}</strong></p>
                <a href="/api/sincronizar" class="btn" target="_blank">🔄 Sincronizar con JSONBin Ahora</a>
            </div>
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
    res.send(`Servidor bot operando correctamente.<br><br>
              - Ver catálogo web: <a href="/catalogo">/catalogo</a><br>
              - Sincronizar a JSONBin: <a href="/api/sincronizar">/api/sincronizar</a>`);
});

app.listen(PORT, () => {
    console.log(`Bot operando en el puerto ${PORT}`);
});
