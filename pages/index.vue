<template>
  <div class="container mx-auto px-4 py-8">
    <div class="max-w-3xl mx-auto bg-white border-2 border-purple-900/20 shadow-lg rounded  p-6 px-0 pt-0">
      <h1 class="text-2xl font-bold mb-6 bg-purple-100 border-b-2 text-purple-900 border-purple-900/20 py-4 px-6">
        <transition
        enter-active-class="transition-opacity duration-750"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-750"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
      mode="out-in"
        >
          <span v-if="spot==0" key="0">Analyze your document</span>
          <span v-else-if="spot==1" key="1">Analyzing</span>
          <span v-else-if="spot==2" key="2">Final Analysis</span>
        </transition>
      </h1>
      
      <Transition
      enter-active-class="transition-opacity duration-750"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-750"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
      mode="out-in"
      >
        <div v-if="spot == 0" class="px-6" key="0">
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
            :disabled="!selectedFile"
            class="bg-purple-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            Analyze
          </button>

          <div v-if="analysis" class="mt-6">
            <h2 class="text-xl font-semibold mb-3">Analysis Results:</h2>
            <div class="bg-gray-50 p-4 rounded">
              {{ analysis }}
            </div>
          </div>
        </div>
        <div v-else-if="spot == 1" key="1">
          <img src="/loading.gif" class="w-48 h-48"/>
          <div class="ml-6">
            <div class="flex my-2 mr-6 py-2 border-gray-400 relative border ">
              <div class="pl-2 z-10 font-bold">Parsing file</div>
              <div ref="firstLoader" class="h-full top-0 absolute bg-purple-200 w-0"></div>
            </div>
            <div ref="wrapper2" class="opacity-0 flex my-2 mr-6 py-2 border-gray-400 relative border">
              <div class="pl-2 z-10 font-bold">Discussing with the AI overlords</div>
              <div ref="secondLoader" class="h-full top-0 absolute bg-purple-300 w-0"></div>
            </div>
            <div ref="wrapper3" class="opacity-0 flex my-2 mr-6 py-2 border-gray-400 relative border ">
              <div class="pl-2 z-10 font-bold">Finalizing</div>
              <div ref="thirdLoader" class="h-full top-0 absolute bg-purple-400 w-0"></div>

            </div>
          </div>
        </div>
        <div v-else class="p-6 py-0 final-wrapper" key="2">
          <div v-html="analysis">
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup>
import { animate } from "motion";
import DomPurify from "dompurify";
import * as marked from "marked";

const selectedFile = ref(null)
const loading = ref(false)
const analysis = ref('')
const firstLoader = ref(null);
const secondLoader = ref(null);
const thirdLoader = ref(null);
const wrapper2 = ref(null);
const wrapper3 = ref(null);
let spot = ref(0);
const hasFinished = ref(false);

const handleFileUpload = (event) => {
  selectedFile.value = event.target.files[0]
}

const analyzePdf = async () => {
  if (!selectedFile.value) return

  spot.value++;
  const formData = new FormData()
  formData.append('pdf', selectedFile.value)

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      body: formData
    })
    
    hasFinished.value = true;

    const data = await response.text();
    analysis.value = DomPurify.sanitize(marked.parse(data));
  } catch (error) {
    console.error('Error analyzing PDF:', error)
    analysis.value = 'Error analyzing the document. Please try again.'
  } finally {
    loading.value = false
  }
}
let finalAnimation = null
const finalize = () => {
  if(!hasFinished.value) {
    setTimeout(finalize, 500);
    return;
  }

    finalAnimation.complete()
    spot.value++;

}

watch(spot, (v) => {
  if(v == 1) {
    nextTick(() => {
      setTimeout(() => {
        animate(firstLoader.value, {width: "100%" }, {duration: 1})
        animate(wrapper2.value, {opacity: 1 }, {duration: .2, delay:1})
        animate(secondLoader.value, {width: "100%" }, {duration: 2, delay:1})
        animate(wrapper3.value, {opacity: 1 }, {duration: .2, delay:3})
        finalAnimation = animate(thirdLoader.value, {width: "100%" }, {duration: 30, delay:3})
        }, 1000);
      setTimeout(finalize, 8000);
    });
  }
})

onMounted(() => {

})
</script>

<style lang="scss">
.final-wrapper {
  ul, ol {
    margin-bottom:16px;
    margin-left:0px;

    li {
      margin-left:0px;
      margin-top:2px;
    }

    ul {
      margin-left:10px;
      li {
        margin-left:10px
      }
    }
  }

  h3 {
    font-size:18px;
    margin-bottom:6px;
    border-bottom:2px solid #CCC;
    padding-bottom:2px;
  }

  h4 {
    font-size:24px;
  }
}
</style>

