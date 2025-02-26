import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'POST') {
      const { transcript } = req.body;
  
      if (!transcript) {
        return res.status(400).json({ error: 'Transcript is required' });
      }
    
      const folderPath = path.join(process.cwd(), 'voice-database');
      const responseFolderPath = path.join(process.cwd(), 'response-database');
      const audioFolderPath = path.join(process.cwd(), 'audio-database');
    
      // Ensure the directory exists
      fs.mkdirSync(folderPath, { recursive: true });
      fs.mkdirSync(responseFolderPath, { recursive: true });
      fs.mkdirSync(audioFolderPath, { recursive: true });
    
      const timestamp = Date.now();
      const transcriptFilePath = path.join(folderPath, `transcript_${timestamp}.txt`);
      const responseFilePath = path.join(responseFolderPath, `response_${timestamp}.txt`);
      const audioFilePath = path.join(audioFolderPath, `audio_${timestamp}.mp3`);
    
      // Write the transcript to the file
      fs.writeFileSync(transcriptFilePath, transcript, 'utf-8');
    
      // Generate a response using OpenAI
    
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: "developer", content: "You are a helpful assistant that will just respond to the person positively whatever they say." },
            {
                role: "user",
                content: transcript,
            },
        ],
        store: true,
      });
    
      const responseText = completion.choices[0].message.content || "";
      fs.writeFileSync(responseFilePath, responseText, 'utf-8');
      
      //  Generate a voice message using OpenAI api's text-to-speech
    
      const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: "alloy",
        input: responseText,
      });
    
      const buffer = Buffer.from(await mp3.arrayBuffer());
      await fs.promises.writeFile(audioFilePath, buffer);
  
      return res.status(200).json({ message: 'Transcript saved successfully' });
    } else {
      res.setHeader('Allow', ['POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}