<template>
  <div class="container mx-auto px-4 py-8">
    <div class="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
      <h1 class="text-2xl font-bold mb-6">PDF Document Analyzer</h1>
      
      <div class="mb-6">
        <label class="block text-gray-700 text-sm font-bold mb-2">
          Upload PDF Document
        </label>
        <input 
          type="file" 
          accept=".pdf"
          @change="handleFileUpload"
          class="w-full p-2 border rounded"
        >
      </div>

      <button 
        @click="analyzePdf"
        :disabled="!selectedFile || loading"
        class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
      >
        {{ loading ? 'Analyzing...' : 'Analyze Document' }}
      </button>

      <div v-if="analysis" class="mt-6">
        <h2 class="text-xl font-semibold mb-3">Analysis Results:</h2>
        <div class="bg-gray-50 p-4 rounded">
          {{ analysis }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const selectedFile = ref(null)
const loading = ref(false)
const analysis = ref('')

const handleFileUpload = (event) => {
  selectedFile.value = event.target.files[0]
}

const analyzePdf = async () => {
  if (!selectedFile.value) return

  loading.value = true
  const formData = new FormData()
  formData.append('pdf', selectedFile.value)

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      body: formData
    })
    
    const data = await response.json()
    analysis.value = data.analysis
  } catch (error) {
    console.error('Error analyzing PDF:', error)
    analysis.value = 'Error analyzing the document. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>