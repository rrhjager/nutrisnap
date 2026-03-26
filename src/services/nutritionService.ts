import { GoogleGenAI, Type } from "@google/genai";

export interface NutritionInfo {
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
  servingSize: string;
  ingredients: string[];
}

export const analyzeFoodImage = async (base64Image: string, isBarcode: boolean = false): Promise<NutritionInfo> => {
  // Check for API key in multiple possible locations
  const apiKey = process.env.GEMINI_API_KEY || (process.env as any).API_KEY;
  
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please configure it in the Secrets panel.");
  }
  const ai = new GoogleGenAI({ apiKey });

  const prompt = isBarcode 
    ? "Analyze this image of a food product barcode or nutrition label. Identify the product and extract its nutritional information per standard serving size. If this is not a food product, set foodName to 'Not Food' and all values to 0."
    : "Analyze this image. If it is food, provide nutritional information for a standard serving size. If it is NOT food, set foodName to 'Not Food' and all values to 0. Return the data in JSON format in English.";

  try {
    // Robustly handle base64 data (with or without prefix)
    const base64Data = base64Image.includes(",") 
      ? base64Image.split(",")[1] 
      : base64Image;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Data,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: NUTRITION_SCHEMA,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text) as NutritionInfo;
  } catch (err: any) {
    console.error("Gemini API Error:", err);
    throw new Error(`Failed to call Gemini API: ${err.message || "Unknown error"}`);
  }
};

export const fetchByBarcode = async (barcode: string): Promise<NutritionInfo> => {
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const data = await response.json();

    if (data.status === 1 && data.product) {
      const p = data.product;
      const n = p.nutriments;
      
      return {
        foodName: p.product_name_nl || p.product_name || "Onbekend Product",
        calories: Math.round(n['energy-kcal_100g'] || n['energy-kcal_serving'] || 0),
        protein: Math.round(n.proteins_100g || n.proteins_serving || 0),
        carbs: Math.round(n.carbohydrates_100g || n.carbohydrates_serving || 0),
        fat: Math.round(n.fat_100g || n.fat_serving || 0),
        confidence: 1.0,
        servingSize: p.serving_size || "100g",
        ingredients: p.ingredients_text ? p.ingredients_text.split(',').map((s: string) => s.trim()) : [],
      };
    }
    
    // Fallback to Gemini if not in Open Food Facts
    return await analyzeBarcodeWithGemini(barcode);
  } catch (err) {
    console.error("Barcode API Error:", err);
    // If even Gemini fails, throw the error
    throw new Error("Product niet gevonden. Probeer een foto van het product te maken.");
  }
};

const analyzeBarcodeWithGemini = async (barcode: string): Promise<NutritionInfo> => {
  const apiKey = process.env.GEMINI_API_KEY || (process.env as any).API_KEY;
  if (!apiKey) throw new Error("Gemini API Key missing");
  
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          {
            text: `Identify the food product with barcode ${barcode}. 
            1. Use Google Search to find exactly which product this barcode belongs to.
            2. Once identified, find its nutritional information (calories, protein, carbs, fat) per 100g or per standard serving.
            3. Return the data in JSON format in English.
            If you cannot identify the product with high certainty, set foodName to 'Not Food'.`,
          },
        ],
      },
    ],
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: NUTRITION_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  const data = JSON.parse(text) as NutritionInfo;
  if (data.foodName === "Not Food") throw new Error("Product niet gevonden");
  return data;
};

export const analyzeFoodDescription = async (description: string): Promise<NutritionInfo> => {
  const apiKey = process.env.GEMINI_API_KEY || (process.env as any).API_KEY;
  
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please configure it in the Secrets panel.");
  }
  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              text: `Analyze this description: "${description}". If it describes food, provide nutritional information for a standard serving size. If it is NOT food, set foodName to 'Not Food' and all values to 0. Return the data in JSON format in English.`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: NUTRITION_SCHEMA,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text) as NutritionInfo;
  } catch (err: any) {
    console.error("Gemini API Error:", err);
    throw new Error(`Failed to call Gemini API: ${err.message || "Unknown error"}`);
  }
};

const NUTRITION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    foodName: { type: Type.STRING },
    calories: { type: Type.NUMBER },
    protein: { type: Type.NUMBER },
    carbs: { type: Type.NUMBER },
    fat: { type: Type.NUMBER },
    confidence: { type: Type.NUMBER, description: "Confidence score from 0 to 1" },
    servingSize: { type: Type.STRING },
    ingredients: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: ["foodName", "calories", "protein", "carbs", "fat", "confidence", "servingSize", "ingredients"],
};
