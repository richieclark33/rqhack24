import { AzureOpenAI } from 'openai'
import PDFParser from 'pdf2json';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()


  try {
    const files = await readMultipartFormData(event)
    if (!files || !files.length) {
      throw new Error('No file uploaded')
    }

    const pdfFile = files.find(file => file.name === 'pdf')
    if (!pdfFile) {
      throw new Error('No PDF file found')
    }

  const result = await extractTextFromPDF(pdfFile.data);

  //   // Parse PDF content
  const client = new AzureOpenAI({
    endpoint: "https://ortthackathon.openai.azure.com/openai/deployments/gpt-4/chat/completions?api-version=2024-08-01-preview",
    apiVersion: "2024-08-01-preview",
    apiKey: config.openaiApiKey
  });
        //   //   // Analyze with OpenAI
    const response = await client.chat.completions.create({
      messages: [
        {
          role: "system",
          content:  `You are a language model trained to analyze legal and financial documents, specifically Closing Disclosure Forms (CDF). 
                    When a PDF of the CDF is uploaded, you will analyze the document, keeping in mind that tabular formatting may not be 
                    preserved in the extracted text. Follow these steps:
                    1. Avoid Redundancy:
                      Only mention unique items once unless further clarification is needed. Do not repeat sections or items listed multiple times in the document.
                      If an item appears in several places (e.g., "Total Due from Borrower"), summarize it without unnecessary repetition.
                    2. Extract Key Information:
                      - Identify and extract key data points, such as but not limited to:
                        - Closing Date
                        - Disbursement Date
                        - Seller Name
                        - Loan amount
                        - Load ID
                        - Loan Term
                        - Interest rate
                        - Closing costs (both "At closing" and "Before closing")
                        - Prepaid items or escrow amounts
                        - Credits or adjustments
                    3. Interpret Extracted Text Properly:
                      - Since the tabular format may be lost, ensure you separate and interpret the "At closing" and "Before closing" data, even if 
                        it appears as plain text.
                      - Differentiate between "Borrower-Paid" and "Seller-Paid" items in both columns when performing calculations.
                    4 Verify Total Closing Costs:
                      - Sum the "At closing" and "Before closing" columns: Add the relevant amounts from both columns to calculate total closing costs.
                      - If subtotals are not clearly marked, extract amounts based on their context and groupings.
                      - Compare totals: Ensure that the sum of the "At closing" and "Before closing" columns matches the final total closing costs as listed in the CDF.
                    5. Check for Discrepancies and Inconsistencies:
                      - If totals or subtotals don’t match between sections, detail the specific amounts and sections. For example:
                        - "At closing: $X from 'Loan Costs' section"
                        - "Before closing: $Y from 'Other Costs' section"
                      - Identify how credits or adjustments affect the totals in both columns and ensure they are correctly applied.
                      - Ensure all subtotals are accurate and contribute correctly to the final totals.
                    6. Detailed Discrepancy Identification:
                      - If discrepancies are found, clearly list the specific sections or line items involved, such as:
                        - "At closing: $500 from 'Loan Costs' (line 103)"
                        - "Before closing: $500 from 'Other Costs' (line 204)"
                      - Clarify where the discrepancy arises and provide context for how totals should be derived.
                    7. Clarify Consistency and Accuracy:
                      - Only flag discrepancies that cannot be explained by other sections or totals.
                      - Do not flag items that are consistent across sections or reflect correct adjustments or credits.
                    8. Warning: Missing Key Information:
                      - Warning: If any key data points are missing or incomplete, flag it clearly. This includes critical information such as:
                        - Closing Date
                        - Disbursement Date
                        - Seller Name
                        - Loan amount
                        - Load ID
                        - Loan Term
                        - Interest rate
                        - Closing costs (both "At closing" and "Before closing")
                        - Prepaid items or escrow amounts
                        - Credits or adjustments
                      - For example, if the "Loan Amount" or "Total Closing Costs" is not listed, issue a Warning and alert the user that this 
                        critical information needs to be confirmed.
                      - Similarly, if essential sections like credits, adjustments, or prepaid items are absent, Warning the user that these missing
                        pieces may impact the accuracy of the document.
                    9. Be Thorough, But Clear:
                      - Provide a comprehensive analysis, but ensure the explanations are clear and easy to follow.
                      - Use concrete references to amounts, sections, and line items (e.g., "The $500 credit from Section 2 offsets the $500 cost in Section 3").
                      - Avoid vague terms like "negative values" or "miscellaneous adjustments."
                    10 Final Output:
                      - Your goal is to provide a concise, non-repetitive summary of the CDF. Only discuss items once unless further clarification is required.
                      - The analysis should be free from unnecessary repetition and duplication, with clear references to specific figures and sections.`
        },
        {
          role: "user",
          content:  `Please review this Closing Disclosure Form (CDF) and provide a detailed analysis, focusing on the following:
                    1. Key Financial Information:
                      - Summarize the following key data points from the CDF:
                        - Closing Date
                        - Disbursement Date
                        - Seller Name
                        - Loan Amount
                        - Loan ID
                        - Loan Term
                        - Interest Rate
                        - Closing Costs (both "At closing" and "Before closing")
                        - Prepaid Items or Escrow Amounts
                        - Credits or Adjustments
                      - Warning: If any of the above information is missing or incomplete, please clearly indicate this as a Warning and specify 
                        what key data points are absent.
                    2. Discrepancies or Inconsistencies:
                       Identify any inconsistencies between the "At closing" and "Before closing" sections. Pay special attention to how the total 
                       closing costs, credits, and other related items are presented.
                    3. Verify Total Closing Costs:
                      - Verify that the sum of the "At closing" and "Before closing" columns is correct. Ensure that all relevant subtotals are included, 
                        even if they are not explicitly marked.
                      - Warning: If the final total closing costs are missing or inconsistent, please issue a Warning and specify which data points need further review.
                    4. Credits and Adjustments:
                      - Identify any credits or adjustments mentioned in the form, and confirm that they are correctly applied in both the "Before closing" and "At closing" sections.
                      - Ensure the credits are properly factored into the total closing costs and adjust the amounts accordingly.
                    5. Detailed Discrepancy Identification:
                      - If discrepancies or inconsistencies are found, provide specific references to the sections or line items where these issues occur. For example:
                        - "At closing: $500 from 'Loan Costs' (line 103)"
                        - "Before closing: $500 from 'Other Costs' (line 204)"
                    6. Clarify Consistency and Accuracy:
                      - Flag only discrepancies that cannot be explained by other sections or totals. If an amount appears to be accounted for correctly across both sections,
                        do not flag it as an issue.
                    7. Final Output:
                      - Provide a clear and concise summary of your analysis.
                      - Only mention unique items once, and avoid unnecessary repetition of sections or data points unless further clarification is needed.
                      - The analysis should focus on providing actionable insights and should be based on the content of the document, referencing specific amounts and sections for clarity.
                      - Warning: If critical sections like closing costs, loan amount, or any other key data are missing, provide a Warning and highlight the specific missing details. : ${result.text}`
        }
  ],
      model: "gpt-4.0",
    });
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error processing request:', error)
    throw createError({
      statusCode: 500,
      message: 'Error processing the PDF file'
    })
  }
})

async function extractTextFromPDF(pdfPath) {
  const pdfParser = new PDFParser();

  try {
    const pdfData = await new Promise((resolve, reject) => {
      pdfParser.on('pdfParser_dataReady', resolve);
      pdfParser.on('pdfParser_dataError', reject);
      pdfParser.parseBuffer(pdfPath);
    });

    const pages = pdfData.Pages;
    let text = '';

    // Extract text from each page
    pages.forEach((page, pageIndex) => {
      text += `\n--- Page ${pageIndex + 1} ---\n`;
      
      // Extract text from each text element
      page.Texts.forEach((textItem) => {
        textItem.R.forEach((element) => {
          // Decode the text (pdf2json encodes special characters)
          text += decodeURIComponent(element.T) + ' ';
        });
      });
    });

    return {
      pageCount: pages.length,
      text
    };
  } catch (error) {
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
}