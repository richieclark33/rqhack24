import { OpenAI } from 'openai'
import * as pdfParse from 'pdf-parse'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const openai = new OpenAI({
    apiKey: config.openaiApiKey
  })

  try {
    const files = await readMultipartFormData(event)
    if (!files || !files.length) {
      throw new Error('No file uploaded')
    }

    const pdfFile = files.find(file => file.name === 'pdf')
    if (!pdfFile) {
      throw new Error('No PDF file found')
    }

  //   // Parse PDF content
  // const pdfData = await pdfParse(pdfFile.data)
  //   const pdfText = pdfData.text

  //   // Analyze with OpenAI
  //   const completion = await openai.chat.completions.create({
  //     messages: [
  //       {
  //         role: "system",
  //         content: "You are a helpful assistant that analyzes PDF documents. Provide a concise summary and key insights from the document."
  //       },
  //       {
  //         role: "user",
  //         content: `Please analyze this document and provide key insights: ${pdfText}`
  //       }
  //     ],
  //     model: "gpt-3.5-turbo",
  //   })

  //   return {
  //     analysis: completion.choices[0].message.content
  //   }
  } catch (error) {
    console.error('Error processing request:', error)
    throw createError({
      statusCode: 500,
      message: 'Error processing the PDF file'
    })
  }
})