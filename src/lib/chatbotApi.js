import { retrieveContext } from '../services/ragService';

export async function askGemini({ prompt }) {
  const result = await retrieveContext(prompt, { topK: 5 });
  if (result.answer) {
    return result.answer;
  }
  if (result.chunks?.length) {
    return `I found relevant academic information, but the AI generator is currently unavailable.\n\n${result.chunks.slice(0, 3).map((chunk) => chunk.text).join('\n\n')}`;
  }
  throw new Error('No academic answer or relevant knowledge was found.');
}
