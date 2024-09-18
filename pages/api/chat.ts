import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import WebSocket from 'ws';

const openai = new OpenAI();
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

// Helper function to split text into chunks without breaking sentences
async function* textChunker(chunks: AsyncIterable<string>): AsyncGenerator<string> {
  const splitters = /\n/; // Regular expression for valid split characters
  let buffer = '';

  for await (const text of chunks) {
    buffer += text;

    let splitIndex = -1;
    // Find the last valid splitting point in the buffer
    for (let i = buffer.length - 1; i >= 0; i--) {
      if (splitters.test(buffer[i])) {
        splitIndex = i;
        break;
      }
    }

    // If a splitting point is found, yield the chunk and update the buffer
    if (splitIndex !== -1) {
      yield buffer.slice(0, splitIndex + 1); // Yield up to the splitter
      buffer = buffer.slice(splitIndex + 1); // Keep the remaining part in the buffer
    }
  }

  // Yield any remaining text
  if (buffer) {
    yield buffer;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    // Extract messages from URL parameters
    const messages = JSON.parse(req.query.messages) as { content: string; role: string }[];

    if (messages.length === 0) {
      res.status(400).json({ error: 'Message parameter is required' });
      return;
    }

    // 1. Establish WebSocket connection to ElevenLabs
    const elevenLabsWs = new WebSocket(
      `wss://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream-input?model_id=eleven_turbo_v2_5`
    );

    let accumulatedChunk = null; // To accumulate audio data if no alignment is set

    elevenLabsWs.on('open', async () => {
      console.log('Connected to ElevenLabs WebSocket');

      // Send initial voice settings (optional)
      elevenLabsWs.send(
        JSON.stringify({
          text: ' ',
          voice_settings: { stability: 0.8, similarity_boost: 0.8 },
          xi_api_key: ELEVENLABS_API_KEY,
        })
      );

      // 2. Start OpenAI streaming after the WebSocket connection is established
      const openAiStream = await openai.chat.completions.create({
        messages: [{ role: 'system', content: 'You are a helpful assistant.' }, ...messages],
        model: 'gpt-4o-mini',
        stream: true,
      });

      // Create a generator for the OpenAI text stream
      const chunkedStream = textChunker(
        (async function* () {
          for await (const chunk of openAiStream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
              yield delta;
            }
          }
        })()
      );

      for await (const textChunk of chunkedStream) {
        // 3. Send the properly chunked text to ElevenLabs for speech synthesis
        elevenLabsWs.send(JSON.stringify({ text: textChunk }));

        // Also stream the text to the client in real-time
        res.write(`data: ${JSON.stringify({ text: textChunk })}\n\n`);
      }

      console.log('OpenAI stream ended.');
      elevenLabsWs.send(JSON.stringify({ text: '' })); // Signal the end of text to ElevenLabs
    });

    // 4. Listen for audio responses from ElevenLabs and stream them to the client
    elevenLabsWs.on('message', (data: string) => {
      try {
        const parsedData = JSON.parse(data);

        if (parsedData.audio) {
          const chunk = { audio: parsedData.audio, alignment: parsedData.alignment };

          if (parsedData.alignment) {
            // Send the accumulated chunk if a new alignment is received
            if (accumulatedChunk) {
              res.write(`data: ${JSON.stringify(accumulatedChunk)}\n\n`);
              accumulatedChunk = chunk; // Clear accumulated chunk
            } else {
              accumulatedChunk = chunk; // Update the current chunk with alignment
            }
          } else {
            if (accumulatedChunk) {
              accumulatedChunk.audio = Buffer.concat([
                Buffer.from(accumulatedChunk.audio, 'base64'),
                Buffer.from(chunk.audio, 'base64'),
              ]).toString('base64');
            } else {
              res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            }
          }
        }
      } catch (error) {
        console.error('Error processing ElevenLabs WebSocket message:', error);
      }
    });

    elevenLabsWs.on('close', () => {
      console.log('ElevenLabs WebSocket closed.');
      // Send the last accumulated chunk if available
      if (accumulatedChunk) {
        res.write(`data: ${JSON.stringify(accumulatedChunk)}\n\n`);
      }
      res.end(); // Ensure the HTTP response ends if the WebSocket closes
    });

    elevenLabsWs.on('error', (err) => {
      console.error('ElevenLabs WebSocket error:', err);
      res.status(500).json({ error: 'ElevenLabs WebSocket connection error' });
    });
  } catch (error) {
    console.error('Error in handler:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
}
