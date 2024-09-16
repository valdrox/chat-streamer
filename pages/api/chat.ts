import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import WebSocket from 'ws';

const openai = new OpenAI();
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    // Extract message from URL parameters
    const messages = JSON.parse(req.query.messages) as { content: string; role: string }[];

    if (messages.length === 0) {
      res.status(400).json({ error: 'Message parameter is required' });
      return;
    }

    // 1. Establish WebSocket connection to ElevenLabs
    const elevenLabsWs = new WebSocket(
      `wss://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream-input?model_id=eleven_turbo_v2_5`
    );

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
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          ...messages
        ],
        model: 'gpt-4o-mini',
        stream: true,
      });

      for await (const chunk of openAiStream) {
        const delta = chunk.choices[0]?.delta?.content;

        if (delta) {
          // 3. Send the text chunk to ElevenLabs for speech synthesis
          elevenLabsWs.send(JSON.stringify({ text: delta }));

          // Also stream the text to the client in real-time
          res.write(`data: ${JSON.stringify({ text: delta })}\n\n`);
        }
      }

      console.log('OpenAI stream ended.');
      elevenLabsWs.send(JSON.stringify({ text: '' })); // Signal the end of text to ElevenLabs
    });

    // 4. Listen for audio responses from ElevenLabs and stream them to the client
    elevenLabsWs.on('message', (data: string) => {
      const parsedData = JSON.parse(data);

      if (parsedData.audio) {
        res.write(`data: ${JSON.stringify(parsedData)}\n\n`);
      }
    });

    elevenLabsWs.on('close', () => {
      console.log('ElevenLabs WebSocket closed.');
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
