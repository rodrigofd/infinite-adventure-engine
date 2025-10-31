import { GoogleGenAI, Type, Modality } from "@google/genai";
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
      description: 'A detailed prompt for an image generator, focusing only on the content of the scene (characters, action, environment). This prompt must be in English. Do NOT include art style descriptions.',
    },
    mood: {
      type: Type.STRING,
      description: "A single keyword in English classifying the mood of the scene (e.g., 'calm', 'tense', 'action', 'mysterious', 'uplifting', 'sad')."
    },
  },
  required: ['title', 'story', 'choices', 'inventory', 'currentQuest', 'imagePrompt', 'mood'],
};

const getSystemInstruction = (language: 'en' | 'es' | 'pt'): string => {
    const commonRules = `RULES:
1.  **Title:** Generate a short, catchy title for the adventure (max 5-7 words).
2.  **Story:** The story should be immersive, descriptive, and well-written.
3.  **Choices:** Provide 3 distinct and meaningful choices that will genuinely alter the plot.
4.  **Inventory & Quest:** Accurately update the inventory and current quest. The inventory is an array of objects, each with a 'name' and an 'imagePrompt'.
5.  **Image Prompts:** The 'imagePrompt' (for the main scene) and all 'imagePrompt's for inventory items are critical. They must describe the scene/item vividly and MUST be in ENGLISH. For the main 'imagePrompt', focus only on the content of the scene (characters, action, environment). Do NOT include art style descriptions like "digital painting" or "comic book style", as the visual style will be added separately. Inventory prompts should be simple and clear (e.g., "A glowing blue potion in a corked glass vial.").
6.  **Mood:** Classify the scene's mood with a single English keyword (e.g., 'calm', 'tense', 'action', 'mysterious', 'uplifting', 'sad'). This must be in English.
7.  **Consistency:** Maintain consistency with characters, plot, inventory, and quests throughout the game. Use the provided story history to inform your next response. Do not repeat story elements. Be creative.`;

    switch (language) {
      case 'es':
        return `Eres un experto narrador y director de juego para un juego infinito de 'elige tu propia aventura' basado en texto. Tu objetivo es crear una narrativa atractiva, dinámica y en constante evolución basada en las elecciones del usuario. Por cada turno, DEBES responder con un objeto JSON que se adhiera al esquema proporcionado. El texto de 'title', 'story', 'choices', 'inventory.name', y 'currentQuest' DEBE estar en español. ${commonRules}`;
      case 'pt':
        return `És um contador de histórias especialista e mestre de jogo para um jogo de aventura de texto infinito do tipo 'escolhe a tua própria aventura'. O teu objetivo é criar uma narrativa envolvente, dinâmica e em constante evolução com base nas escolhas do utilizador. Para cada turno, DEVES responder com um objeto JSON que cumpra o esquema fornecido. O texto de 'title', 'story', 'choices', 'inventory.name', e 'currentQuest' DEVE estar em português. ${commonRules}`;
      default: // en
        return `You are an expert storyteller and game master for an infinite, text-based, choose-your-own-adventure game. Your goal is to create an engaging, dynamic, and ever-evolving narrative based on the user's choices. For every turn, you MUST respond with a JSON object that adheres to the provided schema. ${commonRules}`;
    }
};


const generateImage = async (prompt: string, visualStyle: string, model: 'high-quality' | 'fast' = 'high-quality', aspectRatio: '16:9' | '1:1' = '16:9'): Promise<string> => {
    const combinedPrompt = `${prompt}, in the style of ${visualStyle}`;
    
    if (model === 'fast') {
        const response = await ai.models.generateContent({
            model: fastImageModel,
            contents: { parts: [{ text: combinedPrompt }] },
            config: { responseModalities: [Modality.IMAGE] },
        });
        const base64ImageBytes = response.candidates[0].content.parts[0].inlineData.data;
        return `data:image/jpeg;base64,${base64ImageBytes}`;
    }

    const response = await ai.models.generateImages({
      model: highQualityImageModel,
      prompt: combinedPrompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio,
      },
    });

    const base64ImageBytes = response.generatedImages[0].image.imageBytes;
    return `data:image/jpeg;base64,${base64ImageBytes}`;
};

export const generateBannerImage = async (prompt: string, visualStyle: string): Promise<string> => {
    const bannerPrompt = `Create a cinematic, banner-style image that serves as the title screen for an adventure. The scene should be epic, widescreen, and visually stunning, capturing the core essence of this prompt: "${prompt}". Focus on the atmosphere and key elements.`
    return generateImage(bannerPrompt, visualStyle, 'high-quality', '16:9');
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
    previousInventory: InventoryItem[],
    visualStyle: string,
): Promise<InventoryItem[]> => {
    const prevItemNames = new Set(previousInventory.map(item => item.name));
    const newItemsToGenerate = newInventory.filter(item => !prevItemNames.has(item.name));
    
    const generatedImages = await Promise.all(
        newItemsToGenerate.map(item => generateImage(item.imagePrompt, visualStyle, 'fast', '1:1'))
    );

    const newInventoryWithImages: InventoryItem[] = newItemsToGenerate.map((item, index) => ({
        name: item.name,
        imageUrl: generatedImages[index],
    }));

    const oldItems = previousInventory.filter(item => newInventory.some(newItem => newItem.name === item.name));

    return [...oldItems, ...newInventoryWithImages];
};

export const generateAdventureStart = async (playerInput: string, language: 'en' | 'es' | 'pt', visualStyle: string): Promise<{ scene: Omit<GeminiResponse, 'inventory'> & { inventory: InventoryItem[] }, imageUrl: string, bannerUrl: string }> => {
    const prompt = {
      es: `Inicia una nueva aventura. El prompt inicial del usuario es: "${playerInput}". Crea un título corto y atractivo para la aventura y la primera escena. El jugador debe comenzar con un inventario vacío y una misión inicial clara.`,
      pt: `Inicia uma nova aventura. O prompt inicial do utilizador é: "${playerInput}". Cria um título curto e cativante para a aventura e a primeira cena. O jogador deve começar com um inventário vazio e uma missão inicial clara.`,
      en: `Start a new adventure. The user's initial prompt is: "${playerInput}". Create a short, catchy title for the adventure and the very first scene. The player should start with an empty inventory and a clear starting quest.`,
    }[language];
    
    // Start banner generation immediately, but don't wait for it.
    const bannerUrlPromise = generateBannerImage(playerInput, visualStyle);

    // Generate the story content.
    const scene = await generateStoryContent(prompt, language);
    
    // Once we have the story, we can generate the scene image.
    // We can do this in parallel with the banner generation which is already running.
    const imageUrl = await generateImage(scene.imagePrompt, visualStyle, 'fast');

    // Now, wait for the banner to complete if it hasn't already.
    const bannerUrl = await bannerUrlPromise;
    
    return { scene: { ...scene, inventory: [] }, imageUrl, bannerUrl };
};

export const generateNextStep = async (history: StoryStep[], choice: string, language: 'en' | 'es' | 'pt', visualStyle: string): Promise<{ scene: Omit<GeminiResponse, 'inventory'> & { inventory: InventoryItem[] }, imageUrl: string }> => {
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
        generateImage(scene.imagePrompt, visualStyle, 'fast'),
        processInventoryImages(scene.inventory, inventory, visualStyle)
    ]);

    return { scene: { ...scene, inventory: processedInventory }, imageUrl };
};

export const generateRandomPrompt = async (userInput: string, language: 'en' | 'es' | 'pt'): Promise<string> => {
  const prompt = {
    es: userInput.trim()
      ? `Basado en estas ideas/palabras clave: "${userInput}", genera un prompt de inicio creativo y atractivo para un juego de "elige tu propia aventura". El prompt debe describir un personaje, un escenario y un objetivo inicial. La respuesta debe ser un solo párrafo de texto, listo para ser copiado en un cuadro de texto. No incluyas nada más que el texto del prompt.`
      : `Genera un prompt de inicio completamente aleatorio, creativo y atractivo para un juego de "elige tu propia aventura". El prompt debe describir un personaje, un escenario y un objetivo inicial. La respuesta debe ser un solo párrafo de texto, listo para ser copiado en un cuadro de texto. No incluyas nada más que el texto del prompt.`,
    pt: userInput.trim()
      ? `Com base nestas ideias/palavras-chave: "${userInput}", gera um prompt de início criativo e envolvente para um jogo de 'escolhe a tua própria aventura'. O prompt deve descrever uma personagem, um cenário e um objetivo inicial. A resposta deve ser um único parágrafo de texto, pronto para ser colado numa caixa de texto. Não incluas nada além do próprio texto do prompt.`
      : `Gera um prompt de início completamente aleatório, criativo e envolvente para um jogo de 'escolhe a tua própria aventura'. O prompt deve descrever uma personagem, um cenário e um objetivo inicial. A resposta deve ser um único parágrafo de texto, pronto para ser colado numa caixa de texto. Não incluas nada além do próprio texto do prompt.`,
    en: userInput.trim()
      ? `Based on these ideas/keywords: "${userInput}", generate a creative and engaging starter prompt for a choose-your-own-adventure game. The prompt should describe a character, a setting, and an initial goal. The response should be a single paragraph of text, ready to be pasted into a textbox. Do not include anything other than the prompt text itself.`
      : `Generate a completely random, creative, and engaging starter prompt for a choose-your-own-adventure game. The prompt should describe a character, a setting, and an initial goal. The response should be a single paragraph of text, ready to be pasted into a textbox. Do not include anything other than the prompt text itself.`,
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

export const generateRandomVisualStylePrompt = async (userInput: string, language: 'en' | 'es' | 'pt'): Promise<string> => {
    const prompt = {
        es: userInput.trim()
          ? `Basado en estas ideas/palabras clave: "${userInput}", genera una descripción de estilo de arte visual concisa pero evocadora para un generador de imágenes de IA. La respuesta debe ser solo una frase corta o una oración.`
          : `Genera una descripción de estilo de arte visual completamente aleatoria, concisa pero evocadora para un generador de imágenes de IA. Ejemplos: 'Pintura al óleo gótica', 'Arte de cómic de ciencia ficción retro', 'Estilo de anime exuberante de Studio Ghibli'. La respuesta debe ser solo una frase corta o una oración.`,
        pt: userInput.trim()
          ? `Com base nestas ideias/palavras-chave: "${userInput}", gera uma descrição de estilo de arte visual concisa mas evocativa para um gerador de imagens de IA. A resposta deve ser apenas uma frase curta ou sentença.`
          : `Gera uma descrição de estilo de arte visual completamente aleatória, concisa mas evocativa para um gerador de imagens de IA. Exemplos: 'Pintura a óleo gótica', 'Arte de banda desenhada de ficção científica retro', 'Estilo de anime exuberante do Studio Ghibli'. A resposta deve ser apenas uma frase curta ou sentença.`,
        en: userInput.trim()
          ? `Based on these ideas/keywords: "${userInput}", generate a concise but evocative visual art style description for an AI image generator. The response must be a short phrase or sentence only.`
          : `Generate a completely random, concise but evocative visual art style description for an AI image generator. Examples: 'Gothic oil painting', 'Retro sci-fi comic book art', 'Lush Studio Ghibli anime style'. The response must be a short phrase or sentence only.`,
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

export const generateSpeech = async (text: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Kore' }, // A versatile, clear voice.
                },
            },
        },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
        throw new Error("No audio data received from TTS API.");
    }
    return base64Audio;
};

export const interpretUserChoice = async (
    speech: string,
    choices: string[],
    storyText: string,
    language: 'en' | 'es' | 'pt'
): Promise<string> => {
    const prompt = {
        en: `You are an AI assistant in a choose-your-own-adventure game. Your task is to interpret the user's spoken response and match it to one of the available choices. Be flexible with phrasing.
        
Context: The current story scene is: "${storyText}"
The user said: "${speech}"
The available choices are: [${choices.map(c => `"${c}"`).join(', ')}]

Which choice did the user most likely pick?
Your response MUST BE the exact text of one of the choices, or the word "UNCLEAR" if it's ambiguous or none of the choices match. Do not add any explanation or punctuation.`,
        es: `Eres un asistente de IA en un juego de 'elige tu propia aventura'. Tu tarea es interpretar la respuesta hablada del usuario y asociarla con una de las opciones disponibles. Sé flexible con la redacción.
        
Contexto: La escena actual de la historia es: "${storyText}"
El usuario dijo: "${speech}"
Las opciones disponibles son: [${choices.map(c => `"${c}"`).join(', ')}]

¿Qué opción es más probable que el usuario haya elegido?
Tu respuesta DEBE SER el texto exacto de una de las opciones, o la palabra "UNCLEAR" si es ambiguo o ninguna opción coincide. No agregues ninguna explicación ni puntuación.`,
        pt: `Você é um assistente de IA em um jogo de 'escolha sua própria aventura'. Sua tarefa é interpretar a resposta falada do usuário e associá-la a uma das opções disponíveis. Seja flexível com a formulação.
        
Contexto: A cena atual da história é: "${storyText}"
O usuário disse: "${speech}"
As opções disponíveis são: [${choices.map(c => `"${c}"`).join(', ')}]

Qual opção o usuário provavelmente escolheu?
Sua resposta DEVE SER o texto exato de uma das opções, ou a palavra "UNCLEAR" se for ambíguo ou nenhuma das opções corresponder. Não adicione nenhuma explicação ou pontuação.`,
    }[language];

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            temperature: 0.1
        }
    });

    const result = response.text.trim().replace(/^"|"$/g, ''); // Trim and remove quotes
    
    // Validate if the result is one of the choices or 'UNCLEAR'
    if (choices.includes(result) || result === 'UNCLEAR') {
        return result;
    }
    
    // Fallback check: find if any choice is a substring of the result, for robustness
    const foundChoice = choices.find(c => result.includes(c));
    if (foundChoice) {
        return foundChoice;
    }

    return 'UNCLEAR'; // Default to unclear if model hallucinates or provides a non-matching response.
};
