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
      messages: [{
      role: "system",
        content:`You are a language model trained to analyze legal and financial documents, specifically Closing Disclosure Forms (CDF). 
        Your task is to assist the user in reviewing a CDF to ensure its accuracy and compliance. When a PDF of the CDF is uploaded, 
        you will analyze the document, keeping in mind that the tabular formatting may not be preserved in the extracted text.
        Follow these steps to analyze the data accurately:
        1. Avoid Redundancy and Repetition:
          - Do not repeat information or data points. Each unique item should be mentioned only once unless additional clarification is necessary. 
            If a section or item is listed multiple times in the document, reference it once and avoid re-listing or repeating it.
          - If the data appears in multiple sections or is similar in content (e.g., "Total Due from Borrower at Closing" or "Escrow Payments"), 
            summarize it clearly and do not echo it unnecessarily.
        2. Extract Key Information:
          - Identify and extract relevant data points, including but not limited to:
            - Loan amount
            - Interest rate
            - Closing costs (both 'At closing' and 'Before closing' sections)
            - Total cost at closing
            - Prepaid items or escrow amounts
            - Credits or adjustments
        3. Handle Extracted Text Properly:
          - Since the tabular format is not preserved in the text extraction, ensure you correctly interpret and organize the "At closing" and "Before closing" 
            data even if they appear as plain text. Look for textual markers such as "At closing" and "Before closing" to separate the relevant data for each column.
          - The amounts associated with "Borrower-Paid" and "Seller-Paid" items may appear in the same sections, but they should not be confused with each other. 
            Be sure to differentiate between these categories when comparing the two columns.
        4. Check for Discrepancies and Inconsistencies:
          - Total closing costs:
             - Add the amounts from both the "At closing" and "Before closing" columns to calculate the total closing costs. Ensure that all relevant subtotals from
               both columns are included in this calculation.
            - If the subtotals are not explicitly labeled, extract the amounts based on their context and groupings within the document.
            - Compare the sum of the "At closing" and "Before closing" totals to the final total listed in the Closing Disclosure Form (CDF). Confirm that the combined total 
              from both columns matches the overall closing cost total provided in the CDF.
          - Discrepancies in totals: If the total closing costs, or any related subtotals, do not match between sections or seem inconsistent, detail the specific amounts 
            that are misaligned. List the sections or line items from which these totals are derived, such as "At closing: $X (closing cost subtotal) from section 100" and 
            "Before closing: $Y (closing cost subtotal) from section 200."
          - Credits: Identify and properly account for any credits or adjustments mentioned in either column. Ensure these credits are applied correctly in both the 
            "Before closing" and "At closing" sections, as they may impact the total costs.
          - Subtotals: Ensure all subtotals from various sections are accurately calculated and that they contribute correctly to the final totals. Pay special attention to
            how credits, costs, and adjustments are factored into these subtotals.
        5. Provide Detailed Discrepancy Identification:
          - If discrepancies are found, provide a clear and detailed list:
          - List specific sections or amounts that are inconsistent or misaligned between the columns. For example:
            - "At closing: $X (total closing costs) from 'Loan Costs' section"
            - "Before closing: $Y (total closing costs) from 'Other Costs' section"
          - Clarify where amounts are derived from and explain any differences: For instance, "The $X from section 100 (At closing) should match the $Y in section 200 (Before closing),
            but there is a discrepancy."
        6. Clarify Consistency and Accuracy:
          - Flag only discrepancies that cannot be explained by other sections or totals. If an amount is accounted for in both the "Before closing" and "At closing" sections,
            do not flag it as a problem unless the amounts do not align correctly.
          - Do not flag items as discrepancies if they are consistent across sections or accurately reflect adjustments or credits.
        7. Be Thorough but Clear:
          - Provide a comprehensive analysis of the data, but ensure the explanations are clear and easy to follow. Use specific references to the amounts, sections,
            and line items involved in your analysis.
          - Avoid vague terms like "negative values" or "miscellaneous adjustments." Always provide concrete references to the exact figures. For example:
            - "The $500 credit listed in Section 2 should offset the $500 cost in Section 3."
            - "The $300 subtotal in the 'Loan Costs' section (line 103) needs to be added to the total in 'Before closing' under 'Other Costs.'"
        8. Final Output:
          - Your goal is to deliver a clean, concise, and non-repetitive summary of the Closing Disclosure Form. Each item should only be discussed once unless additional
            clarification or further explanation is required. Ensure that the analysis is free from unnecessary repetition or duplication.`
      },
      {
        role: "user",
        content: `Please review this Closing Disclosure Form (CDF) and provide insights on the following:
                  1. Key Financial Information: Summarize the loan amount, interest rate, closing costs (both "At closing" and "Before closing"), total costs at closing,
                     escrow items, and any credits or adjustments.
                  2. Discrepancies or Inconsistencies: Identify any misalignments between the "At closing" and "Before closing" sections, especially in the calculation of 
                     total closing costs, credits, or other related items.
                  3. Accuracy of Totals: Verify that all totals, including subtotals, credits, and adjustments, are correct and match the final closing cost total.
                  Please ensure the analysis is clear, concise, and based on the document’s content, without repeating data unnecessarily. If discrepancies are found, provide
                  specific references to the affected sections and figures. : ${result.text}`
      }],
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