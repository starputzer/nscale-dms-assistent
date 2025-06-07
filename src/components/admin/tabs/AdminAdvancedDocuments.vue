<template>
  <div class="admin-advanced-documents">
    <div class="section-header">
      <h2>{{ t('admin.advancedDocuments.title') }}</h2>
      <p class="section-description">{{ t('admin.advancedDocuments.description') }}</p>
    </div>

    <!-- OCR Status Section -->
    <div class="card mb-4">
      <div class="card-header">
        <h3>{{ t('admin.advancedDocuments.ocrStatus.title') }}</h3>
      </div>
      <div class="card-body">
        <div class="status-grid">
          <div class="status-item">
            <span class="status-label">{{ t('admin.advancedDocuments.ocrStatus.available') }}:</span>
            <span :class="['status-value', ocrStatus.ocr_functional ? 'text-success' : 'text-danger']">
              {{ ocrStatus.ocr_functional ? t('admin.common.yes') : t('admin.common.no') }}
            </span>
          </div>
          <div class="status-item">
            <span class="status-label">{{ t('admin.advancedDocuments.ocrStatus.languages') }}:</span>
            <span class="status-value">{{ ocrStatus.default_languages }}</span>
          </div>
          <div class="status-item">
            <span class="status-label">{{ t('admin.advancedDocuments.ocrStatus.formats') }}:</span>
            <span class="status-value">{{ ocrStatus.supported_formats?.join(', ') }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Document Upload with OCR -->
    <div class="card mb-4">
      <div class="card-header">
        <h3>{{ t('admin.advancedDocuments.upload.title') }}</h3>
      </div>
      <div class="card-body">
        <div class="upload-form">
          <div class="form-group">
            <label>{{ t('admin.advancedDocuments.upload.selectFile') }}</label>
            <input 
              type="file" 
              ref="fileInput"
              @change="handleFileSelect"
              :accept="acceptedFormats"
              class="form-control"
            >
          </div>

          <div class="form-group">
            <label>
              <input 
                type="checkbox" 
                v-model="uploadOptions.enableOcr"
                :disabled="!ocrStatus.ocr_functional"
              >
              {{ t('admin.advancedDocuments.upload.enableOcr') }}
            </label>
          </div>

          <div class="form-group" v-if="uploadOptions.enableOcr">
            <label>{{ t('admin.advancedDocuments.upload.ocrLanguages') }}</label>
            <select v-model="uploadOptions.ocrLanguages" class="form-control">
              <option value="deu+eng">Deutsch + English</option>
              <option value="deu">Deutsch</option>
              <option value="eng">English</option>
              <option value="fra">Français</option>
              <option value="spa">Español</option>
            </select>
          </div>

          <button 
            @click="uploadDocument"
            :disabled="!selectedFile || isUploading"
            class="btn btn-primary"
          >
            <span v-if="isUploading">
              <i class="fas fa-spinner fa-spin"></i> {{ t('admin.advancedDocuments.upload.processing') }}
            </span>
            <span v-else>
              <i class="fas fa-upload"></i> {{ t('admin.advancedDocuments.upload.button') }}
            </span>
          </button>
        </div>

        <!-- Upload Results -->
        <div v-if="uploadResult" class="upload-result mt-4">
          <h4>{{ t('admin.advancedDocuments.results.title') }}</h4>
          
          <div v-if="uploadResult.success" class="alert alert-success">
            <strong>{{ t('admin.advancedDocuments.results.success') }}</strong>
            
            <!-- Processing Steps -->
            <div v-if="uploadResult.processing_steps?.length" class="mt-2">
              <strong>{{ t('admin.advancedDocuments.results.steps') }}:</strong>
              <ul class="mb-0">
                <li v-for="step in uploadResult.processing_steps" :key="step">
                  {{ t(`admin.advancedDocuments.steps.${step}`) }}
                </li>
              </ul>
            </div>

            <!-- OCR Results -->
            <div v-if="uploadResult.ocr_result" class="mt-2">
              <strong>{{ t('admin.advancedDocuments.results.ocr') }}:</strong>
              <ul class="mb-0">
                <li>{{ t('admin.advancedDocuments.results.pages') }}: {{ uploadResult.ocr_result.pages }}</li>
                <li>{{ t('admin.advancedDocuments.results.confidence') }}: {{ (uploadResult.ocr_result.confidence * 100).toFixed(1) }}%</li>
                <li>{{ t('admin.advancedDocuments.results.textLength') }}: {{ uploadResult.ocr_result.text_length }} {{ t('admin.common.characters') }}</li>
              </ul>
            </div>

            <!-- Language Detection -->
            <div v-if="uploadResult.language" class="mt-2">
              <strong>{{ t('admin.advancedDocuments.results.language') }}:</strong>
              <span class="badge badge-info">
                {{ uploadResult.language.language_name }} 
                ({{ (uploadResult.language.confidence * 100).toFixed(1) }}%)
              </span>
            </div>

            <!-- Document Type -->
            <div v-if="uploadResult.metadata?.document_type" class="mt-2">
              <strong>{{ t('admin.advancedDocuments.results.documentType') }}:</strong>
              <span class="badge badge-secondary">
                {{ t(`admin.advancedDocuments.documentTypes.${uploadResult.metadata.document_type.type}`) }}
                ({{ (uploadResult.metadata.document_type.confidence * 100).toFixed(1) }}%)
              </span>
            </div>

            <!-- Extracted Metadata -->
            <div v-if="uploadResult.metadata?.extracted_patterns" class="mt-2">
              <strong>{{ t('admin.advancedDocuments.results.extractedData') }}:</strong>
              <div class="extracted-patterns">
                <div v-for="(values, pattern) in uploadResult.metadata.extracted_patterns" :key="pattern" class="pattern-group">
                  <strong>{{ t(`admin.advancedDocuments.patterns.${pattern}`) }}:</strong>
                  <span v-for="(value, index) in values" :key="index" class="pattern-value">
                    {{ value }}{{ index < values.length - 1 ? ', ' : '' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="alert alert-danger">
            <strong>{{ t('admin.advancedDocuments.results.error') }}:</strong> {{ uploadResult.error }}
          </div>
        </div>
      </div>
    </div>

    <!-- Processing Statistics -->
    <div class="card">
      <div class="card-header">
        <h3>{{ t('admin.advancedDocuments.statistics.title') }}</h3>
      </div>
      <div class="card-body">
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">{{ processingStats.stats?.total_processed || 0 }}</div>
            <div class="stat-label">{{ t('admin.advancedDocuments.statistics.totalProcessed') }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ processingStats.stats?.ocr_processed || 0 }}</div>
            <div class="stat-label">{{ t('admin.advancedDocuments.statistics.ocrProcessed') }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ processingStats.stats?.processing_errors || 0 }}</div>
            <div class="stat-label">{{ t('admin.advancedDocuments.statistics.errors') }}</div>
          </div>
        </div>

        <!-- Language Distribution -->
        <div v-if="Object.keys(processingStats.stats?.languages_detected || {}).length" class="mt-4">
          <h4>{{ t('admin.advancedDocuments.statistics.languageDistribution') }}</h4>
          <div class="language-stats">
            <div 
              v-for="(count, lang) in processingStats.stats.languages_detected" 
              :key="lang"
              class="language-item"
            >
              <span class="language-name">{{ getLanguageName(lang) }}:</span>
              <span class="language-count">{{ count }}</span>
            </div>
          </div>
        </div>

        <!-- Document Type Distribution -->
        <div v-if="Object.keys(processingStats.stats?.document_types || {}).length" class="mt-4">
          <h4>{{ t('admin.advancedDocuments.statistics.documentTypeDistribution') }}</h4>
          <div class="doctype-stats">
            <div 
              v-for="(count, type) in processingStats.stats.document_types" 
              :key="type"
              class="doctype-item"
            >
              <span class="doctype-name">{{ t(`admin.advancedDocuments.documentTypes.${type}`) }}:</span>
              <span class="doctype-count">{{ count }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quality Analysis Section -->
    <div class="card mb-4">
      <div class="card-header">
        <h3>{{ t('admin.advancedDocuments.qualityAnalysis.title') }}</h3>
      </div>
      <div class="card-body">
        <div v-if="uploadResult && uploadResult.document_id" class="quality-section">
          <button 
            @click="fetchQualityReport" 
            class="btn btn-primary"
            :disabled="isLoadingQuality"
          >
            {{ t('admin.advancedDocuments.qualityAnalysis.analyze') }}
          </button>
          
          <div v-if="qualityReport" class="quality-report mt-3">
            <h4>{{ t('admin.advancedDocuments.qualityAnalysis.report') }}</h4>
            <div class="quality-scores">
              <div class="score-item">
                <span class="score-label">{{ t('admin.advancedDocuments.qualityAnalysis.overall') }}:</span>
                <span class="score-value" :class="getQualityClass(qualityReport.overall_quality)">
                  {{ (qualityReport.overall_quality * 100).toFixed(0) }}%
                </span>
              </div>
              <div class="score-item">
                <span class="score-label">{{ t('admin.advancedDocuments.qualityAnalysis.readability') }}:</span>
                <span class="score-value">{{ (qualityReport.readability_score * 100).toFixed(0) }}%</span>
              </div>
              <div class="score-item">
                <span class="score-label">{{ t('admin.advancedDocuments.qualityAnalysis.structure') }}:</span>
                <span class="score-value">{{ (qualityReport.structure_score * 100).toFixed(0) }}%</span>
              </div>
              <div class="score-item">
                <span class="score-label">{{ t('admin.advancedDocuments.qualityAnalysis.completeness') }}:</span>
                <span class="score-value">{{ (qualityReport.completeness_score * 100).toFixed(0) }}%</span>
              </div>
            </div>
            
            <div v-if="qualityReport.issues.length > 0" class="issues-section mt-3">
              <h5>{{ t('admin.advancedDocuments.qualityAnalysis.issues') }}:</h5>
              <ul>
                <li v-for="(issue, index) in qualityReport.issues" :key="index">{{ issue }}</li>
              </ul>
            </div>
            
            <div v-if="qualityReport.recommendations.length > 0" class="recommendations-section mt-3">
              <h5>{{ t('admin.advancedDocuments.qualityAnalysis.recommendations') }}:</h5>
              <ul>
                <li v-for="(rec, index) in qualityReport.recommendations" :key="index">{{ rec }}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Extraction Patterns Section -->
    <div class="card">
      <div class="card-header">
        <h3>{{ t('admin.advancedDocuments.extractionPatterns.title') }}</h3>
      </div>
      <div class="card-body">
        <div v-if="extractionPatterns.length > 0" class="patterns-list">
          <div v-for="pattern in extractionPatterns" :key="pattern.pattern_id" class="pattern-item">
            <div class="pattern-header">
              <h5>{{ pattern.name }}</h5>
              <span class="badge" :class="pattern.is_active ? 'badge-success' : 'badge-secondary'">
                {{ pattern.is_active ? t('admin.common.active') : t('admin.common.inactive') }}
              </span>
            </div>
            <p class="pattern-description">{{ pattern.description }}</p>
            <p class="pattern-category">
              <strong>{{ t('admin.advancedDocuments.extractionPatterns.category') }}:</strong> 
              {{ t(`admin.advancedDocuments.categories.${pattern.category}`) }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import axios from 'axios'

const { t } = useI18n()
const toast = useToast()
const authStore = useAuthStore()

// State
const ocrStatus = ref({
  ocr_functional: false,
  default_languages: 'deu+eng',
  supported_formats: []
})

const processingStats = ref({
  stats: {
    total_processed: 0,
    ocr_processed: 0,
    processing_errors: 0,
    languages_detected: {},
    document_types: {}
  }
})

const selectedFile = ref(null)
const isUploading = ref(false)
const uploadResult = ref(null)

const uploadOptions = ref({
  enableOcr: true,
  ocrLanguages: 'deu+eng'
})

const qualityReport = ref(null)
const isLoadingQuality = ref(false)
const extractionPatterns = ref([])

// Computed
const acceptedFormats = computed(() => {
  return ocrStatus.value.supported_formats?.join(',') || '.pdf,.png,.jpg,.jpeg,.tiff,.bmp'
})

// Methods
const handleFileSelect = (event) => {
  selectedFile.value = event.target.files[0]
  uploadResult.value = null
}

const uploadDocument = async () => {
  if (!selectedFile.value) return

  isUploading.value = true
  uploadResult.value = null

  const formData = new FormData()
  formData.append('file', selectedFile.value)

  try {
    const response = await axios.post(
      '/api/advanced-documents/process-with-ocr',
      formData,
      {
        params: {
          enable_ocr: uploadOptions.value.enableOcr,
          ocr_languages: uploadOptions.value.ocrLanguages
        },
        headers: {
          'Authorization': `Bearer ${authStore.token}`,
          'Content-Type': 'multipart/form-data'
        }
      }
    )

    uploadResult.value = response.data
    toast.success(t('admin.advancedDocuments.upload.success'))
    
    // Refresh statistics
    await fetchProcessingStats()
  } catch (error) {
    console.error('Upload error:', error)
    uploadResult.value = {
      success: false,
      error: error.response?.data?.detail || error.message
    }
    toast.error(t('admin.advancedDocuments.upload.error'))
  } finally {
    isUploading.value = false
  }
}

const fetchOcrStatus = async () => {
  try {
    const response = await axios.get('/api/advanced-documents/ocr-status', {
      headers: {
        'Authorization': `Bearer ${authStore.token}`
      }
    })
    ocrStatus.value = response.data
  } catch (error) {
    console.error('Failed to fetch OCR status:', error)
  }
}

const fetchProcessingStats = async () => {
  try {
    const response = await axios.get('/api/advanced-documents/processing-stats', {
      headers: {
        'Authorization': `Bearer ${authStore.token}`
      }
    })
    processingStats.value = response.data
  } catch (error) {
    console.error('Failed to fetch processing stats:', error)
  }
}

const getLanguageName = (langCode) => {
  const languageNames = {
    de: 'Deutsch',
    en: 'English',
    fr: 'Français',
    es: 'Español',
    it: 'Italiano',
    unknown: 'Unknown'
  }
  return languageNames[langCode] || langCode.toUpperCase()
}

const fetchQualityReport = async () => {
  if (!uploadResult.value?.document_id) return
  
  isLoadingQuality.value = true
  try {
    const response = await axios.get(
      `/api/advanced-documents/quality-report/${uploadResult.value.document_id}`,
      {
        headers: {
          'Authorization': `Bearer ${authStore.token}`
        }
      }
    )
    qualityReport.value = response.data
  } catch (error) {
    console.error('Failed to fetch quality report:', error)
    toast.error(t('admin.advancedDocuments.qualityAnalysis.error'))
  } finally {
    isLoadingQuality.value = false
  }
}

const fetchExtractionPatterns = async () => {
  try {
    const response = await axios.get('/api/advanced-documents/extraction-patterns', {
      headers: {
        'Authorization': `Bearer ${authStore.token}`
      }
    })
    extractionPatterns.value = response.data
  } catch (error) {
    console.error('Failed to fetch extraction patterns:', error)
  }
}

const getQualityClass = (score) => {
  if (score >= 0.8) return 'text-success'
  if (score >= 0.6) return 'text-warning'
  return 'text-danger'
}

// Lifecycle
onMounted(async () => {
  await Promise.all([
    fetchOcrStatus(),
    fetchProcessingStats(),
    fetchExtractionPatterns()
  ])
})
</script>

<style scoped>
.admin-advanced-documents {
  padding: 20px;
}

.section-header {
  margin-bottom: 30px;
}

.section-description {
  color: #666;
  margin-top: 10px;
}

.card {
  border: 1px solid #ddd;
  border-radius: 8px;
  margin-bottom: 20px;
}

.card-header {
  background-color: #f8f9fa;
  padding: 15px 20px;
  border-bottom: 1px solid #ddd;
  border-radius: 8px 8px 0 0;
}

.card-header h3 {
  margin: 0;
  font-size: 1.2rem;
}

.card-body {
  padding: 20px;
}

.status-grid,
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-label {
  font-weight: 500;
  color: #666;
}

.status-value {
  font-weight: 600;
}

.text-success {
  color: #28a745;
}

.text-danger {
  color: #dc3545;
}

.upload-form {
  max-width: 600px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
}

.form-control {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
}

.btn {
  padding: 8px 16px;
  font-size: 14px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #0056b3;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.upload-result {
  border-top: 1px solid #e9ecef;
  padding-top: 20px;
}

.alert {
  padding: 12px 20px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.alert-success {
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
  color: #155724;
}

.alert-danger {
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
}

.badge {
  display: inline-block;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 4px;
  margin-left: 5px;
}

.badge-info {
  background-color: #17a2b8;
  color: white;
}

.badge-secondary {
  background-color: #6c757d;
  color: white;
}

.extracted-patterns {
  margin-top: 10px;
}

.pattern-group {
  margin-bottom: 8px;
  padding: 8px;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.pattern-value {
  margin-left: 5px;
  color: #495057;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 2.5rem;
  font-weight: 700;
  color: #007bff;
}

.stat-label {
  font-size: 0.9rem;
  color: #666;
  margin-top: 5px;
}

.language-stats,
.doctype-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
}

.language-item,
.doctype-item {
  background-color: #f8f9fa;
  padding: 8px 16px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.language-count,
.doctype-count {
  font-weight: 600;
  color: #007bff;
}

/* Quality Analysis Styles */
.quality-section {
  padding: 15px 0;
}

.quality-report {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
}

.quality-scores {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.score-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: white;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}

.score-label {
  font-weight: 500;
  color: #495057;
}

.score-value {
  font-size: 1.2em;
  font-weight: 600;
}

.text-warning {
  color: #ffc107;
}

.issues-section,
.recommendations-section {
  background: white;
  padding: 15px;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}

.issues-section h5,
.recommendations-section h5 {
  margin-bottom: 10px;
  color: #495057;
}

.issues-section ul,
.recommendations-section ul {
  margin: 0;
  padding-left: 20px;
}

/* Extraction Patterns Styles */
.patterns-list {
  display: grid;
  gap: 15px;
}

.pattern-item {
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 15px;
  background: #f8f9fa;
}

.pattern-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.pattern-header h5 {
  margin: 0;
  color: #495057;
}

.pattern-description {
  margin: 10px 0;
  color: #6c757d;
}

.pattern-category {
  margin: 0;
  font-size: 0.9em;
}

.badge-success {
  background-color: #28a745;
  color: white;
}
</style>