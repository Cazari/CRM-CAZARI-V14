
import { GoogleGenAI } from "@google/genai";
import { Proposal } from "../types";

export const auditProposals = async (proposals: Proposal[]): Promise<string> => {
  // Initialize the Google GenAI client using the API key from environment variables.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  // Using gemini-3-flash-preview for general text analysis tasks as recommended.
  const model = "gemini-3-flash-preview";

  const dataSummary = proposals.map(p => {
    const currentItems = p.items || [];
    return {
      id: p.id,
      status: p.status,
      returnDate: p.returnDate,
      value: currentItems.reduce((acc, i) => acc + ((i.unitValue || 0) * (i.slots || 0)), 0),
      company: p.company
    };
  });

  const prompt = `
    Analise a seguinte lista de propostas comerciais B2B e forneça um breve relatório de "Auditoria Inteligente" (máximo 4 parágrafos).
    Foque em:
    1. Propostas com data de retorno expirada (hoje é ${new Date().toISOString().split('T')[0]}).
    2. Concentração de valor no funil (qual status tem mais dinheiro parado).
    3. Sugestões rápidas de priorização de follow-up.
    Seja profissional e direto em português brasileiro.

    Dados:
    ${JSON.stringify(dataSummary, null, 2)}
  `;

  try {
    // Call generateContent to get the analysis from Gemini.
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    // Access the .text property directly from the response object.
    return response.text || "Não foi possível gerar a análise no momento.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Erro ao conectar com a inteligência artificial para auditoria.";
  }
};
