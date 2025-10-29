
import { GoogleGenAI, Type } from "@google/genai";
import { GeminiResponse, StoryStep, InventoryItem } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const textModel = 'gemini-2.5-flash';
const highQualityImageModel = 'imagen-4.0-generate-001';
const fastImageModel = 'gemini-2.5-flash-image';


const responseSchema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: 'A short, catchy title for the adventure. Max 5-7 words.'
    },
    story: {
      type: Type.STRING,
      description: 'The next part of the story. Should be 1-2 paragraphs long.'
    },
    choices: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'An array of 3 distinct and meaningful choices for the player.',
    },
    inventory: {
      type: Type.ARRAY,
      items: {
          type: Type.OBJECT,
          properties: {
              name: { type: Type.STRING },
              imagePrompt: { type: Type.STRING, description: 'A detailed, brief EN-US prompt for an image generator for this specific item. E.g., "A glowing blue potion in a corked glass vial."' }
          },
          required: ['name', 'imagePrompt']
      },
      description: "An array of objects representing the player's current inventory. Must include all previous items unless they were used.",
    },
    currentQuest: {
      type: Type.STRING,
      description: 'A single string describing the current main quest or objective.',
    },
    imagePrompt: {
      type: Type.STRING,
      description: 'A detailed prompt for an image generator, including character description and a consistent art style. This prompt must be in English.',
    },
  },
  required: ['title', 'story', 'choices', 'inventory', 'currentQuest', 'imagePrompt'],
};

const getSystemInstruction = (language: 'en' | 'es' | 'pt'): string => {
    const commonRules = `RULES:
1.  **Title:** Generate a short, catchy title for the adventure (max 5-7 words).
2.  **Story:** The story should be immersive, descriptive, and well-written.
3.  **Choices:** Provide 3 distinct and meaningful choices that will genuinely alter the plot.
4.  **Inventory & Quest:** Accurately update the inventory and current quest. The inventory is an array of objects, each with a 'name' and an 'imagePrompt'.
5.  **Image Prompts:** The 'imagePrompt' (for the main scene) and all 'imagePrompt's for inventory items are critical. They must describe the scene/item vividly and MUST be in ENGLISH. The main 'imagePrompt' MUST always include a consistent art style token to ensure visual cohesion. For example: "A lone warrior with a glowing sword, in a vibrant, detailed, digital painting style with a fantasy theme." Inventory prompts should be simple and clear.
6.  **Consistency:** Maintain consistency with characters, plot, inventory, and quests throughout the game. Use the provided story history to inform your next response. Do not repeat story elements. Be creative.`;

    switch (language) {
      case 'es':
        return `Eres un experto narrador y director de juego para un juego infinito de 'elige tu propia aventura' basado en texto. Tu objetivo es crear una narrativa atractiva, dinámica y en constante evolución basada en las elecciones del usuario. Por cada turno, DEBES responder con un objeto JSON que se adhiera al esquema proporcionado. El texto de 'title', 'story', 'choices', 'inventory.name', y 'currentQuest' DEBE estar en español. ${commonRules}`;
      case 'pt':
        return `És um contador de histórias especialista e mestre de jogo para um jogo de aventura de texto infinito do tipo 'escolhe a tua própria aventura'. O teu objetivo é criar uma narrativa envolvente, dinâmica e em constante evolução com base nas escolhas do utilizador. Para cada turno, DEVES responder com um objeto JSON que cumpra o esquema fornecido. O texto de 'title', 'story', 'choices', 'inventory.name', e 'currentQuest' DEVE estar em português. ${commonRules}`;
      default: // en
        return `You are an expert storyteller and game master for an infinite, text-based, choose-your-own-adventure game. Your goal is to create an engaging, dynamic, and ever-evolving narrative based on the user's choices. For every turn, you MUST respond with a JSON object that adheres to the provided schema. ${commonRules}`;
    }
};


const generateImage = async (prompt: string, model: 'high-quality' | 'fast' = 'high-quality', aspectRatio: '16:9' | '1:1' = '16:9'): Promise<string> => {
    if (model === 'fast') {
        const response = await ai.models.generateContent({
            model: fastImageModel,
            contents: { parts: [{ text: prompt }] },
            config: { responseModalities: ['IMAGE'] },
        });
        const base64ImageBytes = response.candidates[0].content.parts[0].inlineData.data;
        return `data:image/jpeg;base64,${base64ImageBytes}`;
    }

    const response = await ai.models.generateImages({
      model: highQualityImageModel,
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio,
      },
    });

    const base64ImageBytes = response.generatedImages[0].image.imageBytes;
    return `data:image/jpeg;base64,${base64ImageBytes}`;
};

export const generateBannerImage = async (prompt: string): Promise<string> => {
    const bannerPrompt = `Create a cinematic, banner-style digital painting that serves as the title screen for an adventure. The scene should be epic, widescreen, and visually stunning, capturing the core essence of this prompt: "${prompt}". Focus on the atmosphere and key elements. Style: dramatic lighting, detailed, fantasy art.`
    return generateImage(bannerPrompt, 'high-quality', '16:9');
}

const generateStoryContent = async (prompt: string, language: 'en' | 'es' | 'pt'): Promise<GeminiResponse> => {
    const response = await ai.models.generateContent({
        model: textModel,
        contents: prompt,
        config: {
            systemInstruction: getSystemInstruction(language),
            responseMimeType: "application/json",
            responseSchema: responseSchema,
            temperature: 0.9,
        }
    });
    
    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as GeminiResponse;
};

const processInventoryImages = async (
    newInventory: Array<{ name: string; imagePrompt: string }>,
    previousInventory: InventoryItem[]
): Promise<InventoryItem[]> => {
    const prevItemNames = new Set(previousInventory.map(item => item.name));
    const newItemsToGenerate = newInventory.filter(item => !prevItemNames.has(item.name));
    
    const generatedImages = await Promise.all(
        newItemsToGenerate.map(item => generateImage(item.imagePrompt, 'high-quality', '1:1'))
    );

    const newInventoryWithImages: InventoryItem[] = newItemsToGenerate.map((item, index) => ({
        name: item.name,
        imageUrl: generatedImages[index],
    }));

    const oldItems = previousInventory.filter(item => newInventory.some(newItem => newItem.name === item.name));

    return [...oldItems, ...newInventoryWithImages];
};

export const generateAdventureStart = async (playerInput: string, language: 'en' | 'es' | 'pt'): Promise<{ scene: Omit<GeminiResponse, 'inventory'> & { inventory: InventoryItem[] }, imageUrl: string, bannerUrl: string }> => {
    const prompt = {
      es: `Inicia una nueva aventura. El prompt inicial del usuario es: "${playerInput}". Crea un título corto y atractivo para la aventura y la primera escena. El jugador debe comenzar con un inventario vacío y una misión inicial clara.`,
      pt: `Inicia uma nova aventura. O prompt inicial do utilizador é: "${playerInput}". Cria um título curto e cativante para a aventura e a primeira cena. O jogador deve começar com um inventário vazio e uma missão inicial clara.`,
      en: `Start a new adventure. The user's initial prompt is: "${playerInput}". Create a short, catchy title for the adventure and the very first scene. The player should start with an empty inventory and a clear starting quest.`,
    }[language];
    
    // Generate text and banner in parallel
    const [scene, bannerUrl] = await Promise.all([
        generateStoryContent(prompt, language),
        generateBannerImage(playerInput)
    ]);

    // Generate scene image (faster model) after getting the prompt
    const imageUrl = await generateImage(scene.imagePrompt, 'fast');
    
    return { scene: { ...scene, inventory: [] }, imageUrl, bannerUrl };
};

export const generateNextStep = async (history: StoryStep[], choice: string, language: 'en' | 'es' | 'pt'): Promise<{ scene: Omit<GeminiResponse, 'inventory'> & { inventory: InventoryItem[] }, imageUrl: string }> => {
    const simplifiedHistory = history.map(h => `Scene: ${h.story.substring(0,100)}... Choice: ${h.choiceMade}`).join('\n');
    const lastStep = history[history.length - 1];
    const inventory = lastStep.inventory;
    const quest = lastStep.currentQuest;

    const prompt = {
        es: `Aquí hay un resumen de la historia hasta ahora:\n${simplifiedHistory}\n\nEl inventario actual del jugador es [${inventory.map(i=>i.name).join(', ')}] y su misión es "${quest}".\n\nEl jugador acaba de tomar la decisión: "${choice}".\n\nContinúa la historia con la siguiente escena. No generes un nuevo título, la aventura ya tiene uno.`,
        pt: `Aqui está um resumo da história até agora:\n${simplifiedHistory}\n\nO inventário atual do jogador é [${inventory.map(i=>i.name).join(', ')}] e a sua missão é "${quest}".\n\nO jogador acabou de fazer a escolha: "${choice}".\n\nContinua a história com a próxima cena. Não geres um novo título, a aventura já tem um.`,
        en: `Here is a summary of the story so far:\n${simplifiedHistory}\n\nThe player's current inventory is [${inventory.map(i=>i.name).join(', ')}] and their quest is "${quest}".\n\nThe player has just made the choice: "${choice}".\n\nContinue the story with the next scene. Do not generate a new title, the adventure already has one.`,
    }[language];
    
    const scene = await generateStoryContent(prompt, language);
    
    const [imageUrl, processedInventory] = await Promise.all([
        generateImage(scene.imagePrompt, 'fast'),
        processInventoryImages(scene.inventory, inventory)
    ]);

    return { scene: { ...scene, inventory: processedInventory }, imageUrl };
};

export const generateRandomPrompt = async (userInput: string, language: 'en' | 'es' | 'pt'): Promise<string> => {
  const prompt = {
    es: userInput.trim()
      ? `Basado en estas ideas/palabras clave: "${userInput}", genera un prompt de inicio creativo y atractivo para un juego de "elige tu propia aventura". El prompt debe describir un personaje, un escenario y un objetivo inicial. También debe sugerir un estilo de arte visual. La respuesta debe ser un solo párrafo de texto, listo para ser copiado en un cuadro de texto. No incluyas nada más que el texto del prompt.`
      : `Genera un prompt de inicio completamente aleatorio, creativo y atractivo para un juego de "elige tu propia aventura". El prompt debe describir un personaje, un escenario y un objetivo inicial. También debe sugerir un estilo de arte visual. La respuesta debe ser un solo párrafo de texto, listo para ser copiado en un cuadro de texto. No incluyas nada más que el texto del prompt.`,
    pt: userInput.trim()
      ? `Com base nestas ideias/palavras-chave: "${userInput}", gera um prompt de início criativo e envolvente para um jogo de 'escolhe a tua própria aventura'. O prompt deve descrever uma personagem, um cenário e um objetivo inicial. Deve também sugerir um estilo de arte visual. A resposta deve ser um único parágrafo de texto, pronto para ser colado numa caixa de texto. Não incluas nada além do próprio texto do prompt.`
      : `Gera um prompt de início completamente aleatório, criativo e envolvente para um jogo de 'escolhe a tua própria aventura'. O prompt deve descrever uma personagem, um cenário e um objetivo inicial. Deve também sugerir um estilo de arte visual. A resposta deve ser um único parágrafo de texto, pronto para ser colado numa caixa de texto. Não incluas nada além do próprio texto do prompt.`,
    en: userInput.trim()
      ? `Based on these ideas/keywords: "${userInput}", generate a creative and engaging starter prompt for a choose-your-own-adventure game. The prompt should describe a character, a setting, and an initial goal. It should also suggest a visual art style. The response should be a single paragraph of text, ready to be pasted into a textbox. Do not include anything other than the prompt text itself.`
      : `Generate a completely random, creative, and engaging starter prompt for a choose-your-own-adventure game. The prompt should describe a character, a setting, and an initial goal. It should also suggest a visual art style. The response should be a single paragraph of text, ready to be pasted into a textbox. Do not include anything other than the prompt text itself.`,
  }[language];

  const response = await ai.models.generateContent({
    model: 'gemini-flash-lite-latest',
    contents: prompt,
    config: {
        temperature: 1.0,
    }
  });

  return response.text.trim();
};