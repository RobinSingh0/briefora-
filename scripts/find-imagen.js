const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();

async function findImagen() {
  const key = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
  try {
    const res = await axios.get(url);
    const imagenModels = res.data.models.filter(m => m.name.toLowerCase().includes("imagen"));
    console.log("Imagen Models:", JSON.stringify(imagenModels, null, 2));
  } catch (err) {
    console.error("Error:", err.response?.data || err.message);
  }
}
findImagen();
