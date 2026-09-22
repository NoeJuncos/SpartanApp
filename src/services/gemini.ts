import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return null;
  }

  return new GoogleGenAI({ apiKey });
};

export const buildExerciseEmbeddingText = (exercise: {
  nombre: string;
  grupoMuscular?: string | null;
  tecnica?: string | null;
  erroresComunes?: string | null;
  alternativas?: string | null;
}) => {
  const parts = [
    `Ejercicio: ${exercise.nombre}`,
    exercise.grupoMuscular ? `Grupo muscular: ${exercise.grupoMuscular}` : null,
    exercise.tecnica ? `Técnica: ${exercise.tecnica}` : null,
    exercise.erroresComunes ? `Errores comunes: ${exercise.erroresComunes}` : null,
    exercise.alternativas ? `Alternativas: ${exercise.alternativas}` : null,
  ].filter(Boolean) as string[];

  return parts.join(". ");
};

export const generateEmbeddingVector = async (
  text: string,
  taskType: "RETRIEVAL_QUERY" | "RETRIEVAL_DOCUMENT" = "RETRIEVAL_DOCUMENT",
) => {
  const client = getClient();

  if (!client || !text.trim()) {
    return null;
  }

  const model = process.env.GEMINI_EMBEDDING_MODEL ?? "text-embedding-004";

  try {
    const response = await client.models.embedContent({
      model,
      contents: text,
      config: {
        outputDimensionality: 768,
        taskType,
      },
    });

    const values = response.embeddings?.[0]?.values;

    if (!values || values.length === 0) {
      return null;
    }

    return values.map((value) => Number(value));
  } catch (error) {
    console.error("Gemini embedding failed:", error);
    return null;
  }
};

export const generateExerciseEmbedding = async (exerciseId: string) => {
  const client = getClient();

  if (!client) {
    return null;
  }

  const model = process.env.GEMINI_EMBEDDING_MODEL ?? "text-embedding-004";

  try {
    const response = await client.models.embedContent({
      model,
      contents: `Ejercicio: ${exerciseId}`,
      config: {
        outputDimensionality: 768,
        taskType: "RETRIEVAL_DOCUMENT",
      },
    });

    const values = response.embeddings?.[0]?.values;
    return values ? values.map((value) => Number(value)) : null;
  } catch (error) {
    console.error("Gemini exercise embedding failed:", error);
    return null;
  }
};

const parseGeminiText = (response: any) => {
  if (!response) {
    return null;
  }

  if (typeof response.text === "string" && response.text.trim()) {
    return response.text;
  }

  const candidatesText = response.candidates
    ?.map((candidate: any) =>
      candidate?.content?.parts
        ?.map((part: any) => (typeof part?.text === "string" ? part.text : ""))
        .join(""),
    )
    .join("")
    .trim();

  if (candidatesText) {
    return candidatesText;
  }

  return null;
};

export const generateGeminiChatResponse = async (contextText: string, question: string) => {
  const client = getClient();

  if (!client) {
    return null;
  }

  const model = process.env.GEMINI_CHAT_MODEL ?? "gemini-1.5-flash";
  const prompt = `Eres el asistente virtual técnico de Spartan App. Tu objetivo es responder la duda del alumno utilizando ÚNICAMENTE la siguiente información de la biblioteca de ejercicios de su entrenador.

CONTEXTO DE EJERCICIOS:
---
${contextText}
---

PREGUNTA DEL ALUMNO: ${question}

REGLAS:
1. Responde de forma clara, concisa y profesional.
2. Fundamenta tu respuesta estrictamente en el contexto provisto. Si la información no está en el contexto, indica amablemente que no dispones de esa información en la biblioteca.`;

  try {
    const response = await client.models.generateContent({
      model,
      contents: prompt,
    });

    return parseGeminiText(response) ?? null;
  } catch (error) {
    console.error("Gemini chat generation failed:", error);
    return null;
  }
};
