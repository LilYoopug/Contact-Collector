
import { GoogleGenAI, Type } from "@google/genai";
import { OcrResultRow } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = () => reject(new Error("Failed to read file buffer."));
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

export const processAttendanceList = async (imageFile: File): Promise<OcrResultRow[]> => {
  try {
    // Basic pre-flight check
    if (imageFile.size > 10 * 1024 * 1024) {
      throw new Error("ocrError_tooLarge");
    }

    const imagePart = await fileToGenerativePart(imageFile);

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          imagePart,
          { text: "You are an expert data entry specialist. Analyze this image of an attendance list. Extract the full name, phone number, email address, and company for each person. Normalize phone numbers to E.164 format, starting with a country code (e.g., +62 for Indonesia). If a field is not present, leave it as an empty string. Return the data as a JSON array of objects. Be extremely precise." },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              fullName: { type: Type.STRING },
              phone: { type: Type.STRING },
              email: { type: Type.STRING },
              company: { type: Type.STRING },
            },
            required: ["fullName", "phone", "email", "company"]
          },
        },
      },
    });
    
    const jsonText = response.text?.trim();
    if (!jsonText) {
      throw new Error("ocrError_apiError");
    }

    const parsedData = JSON.parse(jsonText);

    if (!Array.isArray(parsedData) || parsedData.length === 0) {
      throw new Error("ocrError_noData");
    }

    // Clean and normalize
    return parsedData.map((item: OcrResultRow) => ({
        fullName: item.fullName?.trim() || "",
        email: item.email?.trim().toLowerCase() || "",
        company: item.company?.trim() || "",
        phone: item.phone ? item.phone.replace(/[^0-9+]/g, '').replace(/^0/, '62') : ""
    }));

  } catch (error: any) {
    console.error("Gemini OCR Error:", error);
    
    // Pass specific error keys to UI
    if (error.message && error.message.startsWith('ocrError_')) {
      throw error;
    }
    
    if (error.status === 429) {
      throw new Error("API Limit reached. Please wait a minute.");
    }

    throw new Error("ocrError_apiError");
  }
};
