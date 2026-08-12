import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Gemini Mechanical Assistance Endpoint
  app.post('/api/ai/auxilio-mecanico', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({
          error: 'GEMINI_API_KEY_MISSING',
          message: 'No se detectó la clave GEMINI_API_KEY. Configure la clave en la configuración de la aplicación.',
        });
      }

      const { problemDescription, vehicleInfo, imageBase64, imageMimeType } = req.body;

      if (!problemDescription && !imageBase64) {
        return res.status(400).json({
          error: 'MISSING_INPUT',
          message: 'Por favor, ingrese la descripción del problema o una imagen del síntoma.',
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      let vehicleDetailsText = '';
      if (vehicleInfo) {
        const parts = [];
        if (vehicleInfo.make) parts.push(`Marca: ${vehicleInfo.make}`);
        if (vehicleInfo.model) parts.push(`Modelo: ${vehicleInfo.model}`);
        if (vehicleInfo.year) parts.push(`Año: ${vehicleInfo.year}`);
        if (vehicleInfo.fuelType) parts.push(`Motor/Combustible: ${vehicleInfo.fuelType}`);
        if (parts.length > 0) {
          vehicleDetailsText = `\nDATOS DEL VEHÍCULO EN CUESTIÓN:\n- ${parts.join('\n- ')}`;
        }
      }

      const promptText = `
Sos un Asistente Técnico Mecánico Experto de Emergencia y Auxilio Vial de la plataforma "Mi Taller".
Un usuario o taller te consulta sobre un vehículo con problemas técnicos o que se ha quedado varado en la vía pública.

SÍNTOMA / PROBLEMA REPORTADO:
"${problemDescription || 'El usuario envió una fotografía del tablero o componente mecánico.'}"
${vehicleDetailsText}

Genera un diagnóstico de emergencia y guía de auxilio estructurada con los siguientes apartados en formato Markdown legible:

1. 🔍 **Diagnóstico Probable**: Explicación sencilla de las causas más comunes de esta falla.
2. 🛠️ **Pasos de Chequeo Rápido en Ruta**: Lista de 3 a 5 comprobaciones sencillas e inmediatas (fusibles, agua/refrigerante, aceite, cables de batería, fajas/correas visibles, etc.).
3. 🚨 **¿Se puede intentar seguir marcha?**: Indicación clara de si es seguro continuar viaje despacio o si requiere grúa o taller de inmediato.
4. ⚠️ **Precauciones Importantes de Seguridad**: Qué NO hacer (ejemplo: jamás destapar el radiador caliente, no dar arranque continuo para no quemar el motor de arranque, etc.).

Utiliza un tono empático, sumamente claro y estructurado con viñetas y textos destacados.
`;

      let contents: any[] = [promptText];

      if (imageBase64 && imageMimeType) {
        const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
        contents = [
          promptText,
          {
            inlineData: {
              data: cleanBase64,
              mimeType: imageMimeType,
            },
          },
        ];
      }

      const result = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: contents,
      });

      return res.json({
        response: result.text || 'No se pudo obtener respuesta del asistente.',
      });
    } catch (error: any) {
      console.error('Error in Gemini Auxilio API:', error);
      return res.status(500).json({
        error: 'GEMINI_API_ERROR',
        message: error?.message || 'Ocurrió un error al consultar a la IA de Gemini.',
      });
    }
  });

  // Vite Middleware in Development, Static Serving in Production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
