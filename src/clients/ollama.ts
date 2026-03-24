import ollama from 'ollama';

const getModel = (model?: string): string =>
  model || process.env.OLLAMA_MODEL || 'llama3.2';

const getVisionModel = (model?: string): string =>
  model || process.env.OLLAMA_VISION_MODEL || 'llava';

export const chat = async (
  systemPrompt: string,
  userPrompt: string,
  model?: string
): Promise<string> => {
  const response = await ollama.chat({
    model: getModel(model),
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });
  return response.message.content;
};

export const chatWithImage = async (
  systemPrompt: string,
  userPrompt: string,
  imageBase64: string,
  model?: string
): Promise<string> => {
  const response = await ollama.chat({
    model: getVisionModel(model),
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: userPrompt,
        images: [imageBase64],
      },
    ],
  });
  return response.message.content;
};

export const checkConnection = async (model?: string): Promise<boolean> => {
  try {
    const models = await ollama.list();
    const modelName = getModel(model);
    const hasModel = models.models.some((m: { name: string }) => m.name.includes(modelName));
    if (!hasModel) {
      console.warn(`Warning: Model "${modelName}" not found. Available:`, models.models.map((m: { name: string }) => m.name));
    }
    return true;
  } catch (error) {
    console.error('Failed to connect to Ollama:', error);
    return false;
  }
};
