function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function splitText(text: string, maxLen = 300): string[] {
  const sentences = text.match(/[^\.!\?]+[\.!\?]+/g) || [text]; // sentence regex
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if ((current + sentence).length < maxLen) {
      current += sentence;
    } else {
      if (current) chunks.push(current.trim());
      current = sentence;
    }
  }
  if (current) chunks.push(current.trim());

  return chunks;
}