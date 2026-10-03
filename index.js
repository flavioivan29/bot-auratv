const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// NUEVA URL DEL PROVEEDOR
const IPTV_URL = "http://zonacero.lat:8080/get.php?username=NOVA73R45&password=rEpYABmMbDMw&type=m3u_plus";

// Expresión regular para detectar estructuras de series (ej: S01E02, S1E1, etc.)
const regexFormatoSerie = /\bS\d+E\d+\b/i;

// =========================================================================
// PARSEADOR DE PELÍCULAS (CINE) - AÑOS 2025 Y 2026
// =========================================================================
function parsearPeliculasM3U(datosM3U) {
    if (!datosM3U || typeof datosM3U !== 'string') return [];
    const lineas = datosM3U.split('\n');
    const peliculas = [];
    const titulosVistos = new Set();
    
    for (let i = 0; i < lineas.length; i++) {
        const linea = lineas[i].trim();
        
        if (linea.startsWith('#EXTINF:')) {
            const groupTitleMatch = linea.match(/group-title="([^"]+)"/);
            const grupo = groupTitleMatch ? groupTitleMatch[1] : "Otros";
            const grupoMinuscula = grupo.toLowerCase();
            
            // Filtros de categorías prohibidas en Cine
            if (grupoMinuscula.includes('en vivo') || 
                grupoMinuscula.includes('live') || 
                grupoMinuscula.includes('tv argentina') || 
                grupoMinuscula.includes('canales') || 
                grupoMinuscula.includes('24/7') ||
                grupoMinuscula.includes('series') ||
                grupoMinuscula.includes('temporada') ||
                grupoMinuscula.includes('daleplay') || 
                grupoMinuscula.includes('premium')) {
                continue; 
            }
            
            const partesLineas = linea.split(',');
            const nombreCompleto = partesLineas[partesLineas.length - 1].trim();
            const nombreMinuscula = nombreCompleto.toLowerCase();
            
            // Filtro exclusivo: Debe figurar 2025 o 2026 en el nombre o grupo
            const es2025 = nombreCompleto.includes('2025') || grupo.includes('2025');
            const es2026 = nombreCompleto.includes('2026') || grupo.includes('2026');
            if (!es2025 && !es2026) {
                continue;
            }
            
            // Candado para evitar que se filtren series en la sección de cine
            if (regexFormatoSerie.test(nombreCompleto)) {
                continue;
            }
            
            if (nombreMinuscula.includes('fhd') || nombreMinuscula.includes('hdtv') || nombreMinuscula.includes('ch:') || nombreMinuscula.includes('canal')) {
                continue;
            }
            
            const logoMatch = linea.match(/tvg-logo="([^"]+)"/);
            const poster = logoMatch ? logoMatch[1].trim() : "";
            const posterMinuscula = poster.toLowerCase();
            
            // Validar póster real
            if (!poster || !poster.startsWith('http') || 
                posterMinuscula.includes('null') || 
                posterMinuscula.includes('n/a') || 
                posterMinuscula.includes('placeholder')) {
                continue;
            }
            
            if (titulosVistos.has(nombreMinuscula)) {
                continue;
            }
            
            if (i + 1 < lineas.length) {
                const urlVideo = lineas[i + 1].trim();
                if (urlVideo.startsWith('http')) {
                    if (urlVideo.toLowerCase().includes('/live/') || urlVideo.endsWith('.m3u8')) continue;
                    
                    titulosVistos.add(nombreMinuscula);
                    peliculas.push({
                        titulo: nombreCompleto,
                        categoria: grupo,
                        poster: poster,
                        url_video: urlVideo
                    });
                }
            }
        }
    }
    return peliculas;
}

// =========================================================================
// PARSEADOR DE SERIES - AÑOS 2025 Y 2026
// =========================================================================
function parsearSeriesM3U(datosM3U) {
    if (!datosM3U || typeof datosM3U !== 'string') return [];
    const lineas = datosM3U.split('\n');
    const series = [];
    
    for (let i = 0; i < lineas.length; i++) {
        const linea = lineas[i].trim();
        
        if (linea.startsWith('#EXTINF:')) {
            const groupTitleMatch = linea.match(/group-title="([^"]+)"/);
            const grupo = groupTitleMatch ? groupTitleMatch[1] : "Otros";
            const grupoMinuscula = grupo.toLowerCase();
            
            const esGrupoSeries = (grupoMinuscula.includes('series') || grupoMinuscula.includes('temporada') || linea.includes('/series/'));
            const tieneFormatoSerie = regexFormatoSerie.test(linea);

            if ((esGrupoSeries || tieneFormatoSerie) && !grupoMinuscula.includes('daleplay')) {
                
                const partesLineas = linea.split(',');
                const nombreCompleto = partesLineas[partesLineas.length - 1].trim();
                
                // Filtro exclusivo: Debe figurar 2025 o 2026
                const es2025 = grupo.includes('2025') || nombreCompleto.includes('2025');
                const es2026 = grupo.includes('2026') || nombreCompleto.includes('2026');
                if (!es2025 && !es2026) {
                    continue;
                }

                const logoMatch = linea.match(/tvg-logo="([^"]+)"/);
                const poster = logoMatch ? logoMatch[1] : "";
                
                if (i + 1 < lineas.length) {
                    const urlVideo = lineas[i + 1].trim();
                    if (urlVideo.startsWith('http')) {
                        
                        let parteIzquierda = nombreCompleto.includes(" - ") 
                            ? nombreCompleto.split(" - ")[0].trim() 
                            : nombreCompleto;

                        const regexLimpieza = /\b(temporada|temp|t\d+|s\d+|capitulo|cap|ep|episodio|multi|latino|castellano|sub|dual|hd|fhd|4k)\b.*|[\(\[][12]\d{3}[\)\]]/gi;
                        let nombreLimpio = parteIzquierda.replace(regexLimpieza, "").trim();

                        const palabras = nombreLimpio.split(" ");
                        if (palabras.length > 2 && palabras.slice(0, palabras.length / 2).join(" ") === palabras.slice(palabras.length / 2).join(" ")) {
                            nombreLimpio = palabras.slice(0, palabras.length / 2).join(" ");
                        }
                        
                        if (nombreLimpio.length < 2) {
                            nombreLimpio = grupo.replace(regexLimpieza, "").trim();
                        }

                        nombreLimpio = nombreLimpio.replace(/[-–—\s]+$/, "").replace(/\s+/g, " ").trim();

                        const matchCodigo = nombreCompleto.match(regexFormatoSerie);
                        const codigoCapitulo = matchCodigo ? matchCodigo[0].toUpperCase() : "";

                        const capituloDetalle = nombreCompleto.includes(" - ") 
                            ? nombreCompleto.split(" - ").slice(1).join(" - ").trim()
                            : nombreCompleto;

                        let tituloFormateadoParaTele = `${nombreLimpio} - ${capituloDetalle}`;
                        if (codigoCapitulo && !capituloDetalle.toUpperCase().includes(codigoCapitulo)) {
                            tituloFormateadoParaTele = `${nombreLimpio} - ${codigoCapitulo} ${capituloDetalle}`;
                        }

                        series.push({
                            titulo: tituloFormateadoParaTele, 
                            categoria: grupo,
                            poster: poster,
                            url_video: urlVideo
                        });
                    }
                }
            }
        }
    }
    return series;
}

// ==========================================
// ENDPOINTS DE LA API
// ==========================================
app.get('/api/cine', async (req, res) => {
    try {
        const respuesta = await axios.get(IPTV_URL, { timeout: 0, headers: { 'User-Agent': 'Mozilla/5.0' } });
        const catalogoPeliculas = parsearPeliculasM3U(respuesta.data);
        res.json({ status: "ok", total: catalogoPeliculas.length, peliculas: catalogoPeliculas });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

app.get('/api/series', async (req, res) => {
    try {
        const respuesta = await axios.get(IPTV_URL, { timeout: 0, headers: { 'User-Agent': 'Mozilla/5.0' } });
        const catalogoSeries = parsearSeriesM3U(respuesta.data);
        res.json({ status: "ok", total: catalogoSeries.length, series: catalogoSeries });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

// === RUTA DE VERSIÓN Y ACTUALIZACIÓN PARA AURATV ===
app.get('/api/version', (req, res) => {
    res.json({
        "version_codigo": 1, 
        "versionCode": 1,
        "version_nombre": "1.0.0",
        "versionName": "1.0.0",
        "url_apk": "", 
        "url": "",
        "nota_cambios": "Lanzamiento oficial de AuraTV con contenido 2025-2026.",
        "notas": "Lanzamiento oficial de AuraTV con contenido 2025-2026."
    });
});

app.get('/', (req, res) => {
    res.send("Servidor de AuraTV (Catálogo 2025-2026) operando correctamente.");
});

app.listen(PORT, () => {
    console.log(`Servidor AuraTV operando en el puerto ${PORT}`);
});
