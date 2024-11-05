'use server'

import { put } from '@vercel/blob'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!)

export async function processImageWithGemini(formData: FormData) {
  const imageData = formData.get('image') as string
  const prompt = formData.get('prompt') as string

  if (!imageData || !prompt) {
    throw new Error('Image and prompt are required')
  }

  // Upload the image to Vercel Blob
  const { url } = await put(`edited-image-${Date.now()}.png`, imageData, { access: 'public' })

  // Fetch the image data
  const response = await fetch(url)
  const buffer = await response.arrayBuffer()

  // Convert ArrayBuffer to base64
  const base64Image = Buffer.from(buffer).toString('base64')

  // Call the Gemini API
  const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' })

  const result = await model.generateContent([
    `The image has been edited. Areas marked in red should be filled with new content based on the following prompt: ${prompt}. Areas that have been erased (transparent or white) should be filled with appropriate content to match the rest of the image. Describe the changes made to the image in detail.`,
    {
      inlineData: {
        mimeType: 'image/png',
        data: base64Image
      }
    }
  ])

  const generatedResponse = await result.response
  const text = generatedResponse.text()

  return text
}