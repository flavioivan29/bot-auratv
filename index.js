const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

const IPTV_URL = "http://zonacero.lat:8080/get.php?username=NOVA73R45&password=rEpYABmMbDMw&type=m3u_plus";

// Ruta de diagnóstico segura con manejo de errores y timeout
app.get('/api/debug', async (req, res) => {
    try {
        console.log("Intentando conectar con el proveedor IPTV...");
        const respuesta = await axios.get(IPTV_URL, { 
            timeout: 10000, // 10 segundos máximo de espera
            headers: { 'User-Agent': 'VLC/3.0.16' } 
        });
        
        const lineas = respuesta.data.split('\n');
        res.json({
            status: "ok",
            mensaje: "Conexión exitosa con el proveedor",
            total_lineas: lineas.length,
            muestra: lineas.slice(0, 10) // Primeras 10 líneas
        });
    } catch (error) {
        console.error("Error al conectar con el IPTV:", error.message);
        res.status(500).json({ 
            status: "error", 
            message: "No se pudo conectar con el servidor IPTV o tardó demasiado.",
            detalle: error.message 
        });
    }
});

app.get('/', (req, res) => {
    res.send("Servidor de AuraTV (Catálogo 2025-2026) operando correctamente.");
});

app.listen(PORT, () => {
    console.log(`Servidor operando en el puerto ${PORT}`);
});
