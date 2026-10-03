const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

const IPTV_URL = "http://zonacero.lat:8080/get.php?username=NOVA73R45&password=rEpYABmMbDMw&type=m3u_plus";

// Ruta para inspeccionar las primeras 30 líneas crudas del proveedor
app.get('/api/debug', async (req, res) => {
    try {
        const respuesta = await axios.get(IPTV_URL, { timeout: 15000, headers: { 'User-Agent': 'VLC/3.0.16' } });
        const lineas = respuesta.data.split('\n').slice(0, 50); // Primeras 50 líneas
        res.json({
            status: "ok",
            total_lineas_aproximadas: respuesta.data.split('\n').length,
            muestra_contenido: lineas
        });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

app.get('/', (req, res) => {
    res.send("Servidor de diagnóstico AuraTV operando correctamente.");
});

app.listen(PORT, () => {
    console.log(`Servidor operando en el puerto ${PORT}`);
});
