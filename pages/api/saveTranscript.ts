import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { transcript } = req.body;

    if (!transcript) {
      return res.status(400).json({ error: 'Transcript is required' });
    }

    const folderPath = path.join(process.cwd(), 'voice-database');
    const filePath = path.join(folderPath, 'transcript.txt');

    // Ensure the directory exists
    fs.mkdirSync(folderPath, { recursive: true });

    // Write the transcript to the file
    fs.writeFileSync(filePath, transcript, 'utf-8');

    return res.status(200).json({ message: 'Transcript saved successfully' });
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}