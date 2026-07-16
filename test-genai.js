const { GoogleGenAI } = require('@google/genai');
try {
  console.log('Instantiating GoogleGenAI...');
  const ai = new GoogleGenAI({ apiKey: undefined });
  console.log('Success!');
} catch (e) {
  console.error('THREW AN ERROR:', e.message);
}
