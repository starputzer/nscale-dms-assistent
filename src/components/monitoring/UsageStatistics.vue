<template>
  <div class="usage-statistics">
    <div class="usage-header">
      <h3>{{ t('monitoring.usage.title', 'Nutzungsstatistiken') }}</h3>
      <div class="usage-controls">
        <select v-model="viewMode" class="control-select">
          <option value="time">{{ t('monitoring.usage.viewMode.time', 'Zeitbezogen') }}</option>
          <option value="user">{{ t('monitoring.usage.viewMode.user', 'Benutzerbezogen') }}</option>
          <option value="feedback">{{ t('monitoring.usage.viewMode.feedback', 'Feedback') }}</option>
        </select>
      </div>
    </div>

    <!-- Zeitbezogene Ansicht -->
    <div v-if="viewMode === 'time'" class="usage-time-view">
      <div class="usage-cards">
        <div class="usage-card">
          <div class="usage-card-title">{{ t('monitoring.usage.avgActivationTime', 'Durchschn. Aktivierungszeit') }}</div>
          <div class="usage-card-value">{{ formatDuration(avgActivationTime) }}</div>
          <div class="usage-card-chart">
            <div class="mini-chart">
              <div 
                v-for="(value, index) in activationTrend" 
                :key="index"
                class="mini-chart-bar"
                :style="{ height: `${calculateBarHeight(value, maxActivationTime)}%` }"
              ></div>
            </div>
          </div>
        </div>
        
        <div class="usage-card">
          <div class="usage-card-title">{{ t('monitoring.usage.avgSessionDuration', 'Durchschn. Sitzungsdauer') }}</div>
          <div class="usage-card-value">{{ formatDuration(avgSessionDuration) }}</div>
          <div class="usage-card-chart">
            <div class="mini-chart">
              <div 
                v-for="(value, index) in sessionTrend" 
                :key="index"
                class="mini-chart-bar"
                :style="{ height: `${calculateBarHeight(value, maxSessionDuration)}%` }"
              ></div>
            </div>
          </div>
        </div>
        
        <div class="usage-card">
          <div class="usage-card-title">{{ t('monitoring.usage.toggleOperations', 'Toggle-Operationen') }}</div>
          <div class="usage-card-value">{{ totalToggles }}</div>
          <div class="usage-card-chart">
            <div class="mini-chart">
              <div 
                v-for="(value, index) in toggleTrend" 
                :key="index"
                class="mini-chart-bar"
                :style="{ height: `${calculateBarHeight(value, maxToggles)}%` }"
              ></div>
            </div>
          </div>
        </div>
        
        <div class="usage-card">
          <div class="usage-card-title">{{ t('monitoring.usage.uniqueUsers', 'Eindeutige Benutzer') }}</div>
          <div class="usage-card-value">{{ uniqueUsers }}</div>
          <div class="usage-card-chart">
            <div class="mini-chart">
              <div 
                v-for="(value, index) in userTrend" 
                :key="index"
                class="mini-chart-bar"
                :style="{ height: `${calculateBarHeight(value, maxUsers)}%` }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div class="usage-feature-stats">
        <h4>{{ t('monitoring.usage.featureUsageStats', 'Feature-Nutzungsstatistiken') }}</h4>
        <table class="usage-table">
          <thead>
            <tr>
              <th @click="sortFeatures('name')" :class="{ sorted: sortField === 'name' }">
                {{ t('monitoring.usage.columns.feature', 'Feature') }}
                <span v-if="sortField === 'name'" class="sort-icon">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
              </th>
              <th @click="sortFeatures('activations')" :class="{ sorted: sortField === 'activations' }">
                {{ t('monitoring.usage.columns.activations', 'Aktivierungen') }}
                <span v-if="sortField === 'activations'" class="sort-icon">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
              </th>
              <th @click="sortFeatures('avgDuration')" :class="{ sorted: sortField === 'avgDuration' }">
                {{ t('monitoring.usage.columns.avgDuration', 'Durchschn. Dauer') }}
                <span v-if="sortField === 'avgDuration'" class="sort-icon">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
              </th>
              <th @click="sortFeatures('toggles')" :class="{ sorted: sortField === 'toggles' }">
                {{ t('monitoring.usage.columns.toggles', 'Umschaltungen') }}
                <span v-if="sortField === 'toggles'" class="sort-icon">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
              </th>
              <th @click="sortFeatures('errors')" :class="{ sorted: sortField === 'errors' }">
                {{ t('monitoring.usage.columns.errors', 'Fehler') }}
                <span v-if="sortField === 'errors'" class="sort-icon">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
              </th>
              <th>{{ t('monitoring.usage.columns.status', 'Status') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="feature in sortedFeatures" :key="feature.name">
              <td>{{ formatFeatureName(feature.name) }}</td>
              <td>{{ feature.activations }}</td>
              <td>{{ formatDuration(feature.avgDuration) }}</td>
              <td>{{ feature.toggles }}</td>
              <td>
                <span 
                  :class="feature.errors > 0 ? 'error-count has-errors' : 'error-count'"
                >
                  {{ feature.errors }}
                </span>
              </td>
              <td>
                <span 
                  class="feature-status"
                  :class="feature.active ? 'status-active' : 'status-inactive'"
                >
                  {{ feature.active 
                    ? t('monitoring.usage.status.active', 'Aktiv') 
                    : t('monitoring.usage.status.inactive', 'Inaktiv') 
                  }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Benutzerbezogene Ansicht -->
    <div v-if="viewMode === 'user'" class="usage-user-view">
      <div class="user-segmentation">
        <h4>{{ t('monitoring.usage.userSegmentation', 'Benutzersegmentierung') }}</h4>
        <div class="segmentation-chart">
          <div class="segmentation-item" v-for="(segment, index) in userSegments" :key="index">
            <div class="segment-label">{{ segment.label }}</div>
            <div class="segment-bar-container">
              <div 
                class="segment-bar"
                :style="{ width: `${segment.percentage}%`, backgroundColor: segment.color }"
              ></div>
              <span class="segment-value">{{ segment.count }} ({{ segment.percentage }}%)</span>
            </div>
          </div>
        </div>
      </div>

      <div class="user-sessions">
        <h4>{{ t('monitoring.usage.recentSessions', 'Neueste Sitzungen') }}</h4>
        <table class="sessions-table">
          <thead>
            <tr>
              <th>{{ t('monitoring.usage.columns.user', 'Benutzer') }}</th>
              <th>{{ t('monitoring.usage.columns.startTime', 'Startzeit') }}</th>
              <th>{{ t('monitoring.usage.columns.duration', 'Dauer') }}</th>
              <th>{{ t('monitoring.usage.columns.features', 'Genutzte Features') }}</th>
              <th>{{ t('monitoring.usage.columns.interactions', 'Interaktionen') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(session, index) in recentSessions" :key="index">
              <td>{{ session.userId }}</td>
              <td>{{ formatDate(session.startTime) }}</td>
              <td>{{ formatDuration(session.duration) }}</td>
              <td>
                <div class="feature-tags">
                  <span 
                    v-for="(feature, i) in session.features.slice(0, 3)" 
                    :key="i" 
                    class="feature-tag"
                  >
                    {{ formatFeatureName(feature) }}
                  </span>
                  <span v-if="session.features.length > 3" class="feature-tag more-tag">
                    +{{ session.features.length - 3 }} {{ t('monitoring.usage.more', 'mehr') }}
                  </span>
                </div>
              </td>
              <td>{{ session.interactions }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Feedback-Ansicht -->
    <div v-if="viewMode === 'feedback'" class="usage-feedback-view">
      <div class="feedback-summary">
        <div class="feedback-card">
          <div class="feedback-card-title">{{ t('monitoring.usage.avgRating', 'Durchschn. Bewertung') }}</div>
          <div class="feedback-card-value">{{ averageRating.toFixed(1) }}/5.0</div>
          <div class="rating-stars">
            <div class="stars-container">
              <div class="stars-filled" :style="{ width: `${averageRating * 20}%` }"></div>
            </div>
          </div>
        </div>
        
        <div class="feedback-card">
          <div class="feedback-card-title">{{ t('monitoring.usage.totalFeedback', 'Gesamtanzahl Feedback') }}</div>
          <div class="feedback-card-value">{{ totalFeedback }}</div>
          <div class="feedback-distribution">
            <div 
              v-for="i in 5" 
              :key="i" 
              class="rating-bar-container"
            >
              <div class="rating-label">{{ i }}</div>
              <div class="rating-bar-wrapper">
                <div 
                  class="rating-bar" 
                  :style="{ 
                    width: `${calculateRatingPercentage(i)}%`,
                    backgroundColor: getRatingColor(i)
                  }"
                ></div>
                <span class="rating-count">{{ getRatingCount(i) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="feature-feedback">
        <h4>{{ t('monitoring.usage.featureFeedback', 'Feature-spezifisches Feedback') }}</h4>
        <table class="feedback-table">
          <thead>
            <tr>
              <th>{{ t('monitoring.usage.columns.feature', 'Feature') }}</th>
              <th>{{ t('monitoring.usage.columns.avgRating', 'Bewertung') }}</th>
              <th>{{ t('monitoring.usage.columns.feedbackCount', 'Anzahl') }}</th>
              <th>{{ t('monitoring.usage.columns.sentiment', 'Sentiment') }}</th>
              <th>{{ t('monitoring.usage.columns.comments', 'Kommentare') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="feedback in featureFeedback" :key="feedback.feature">
              <td>{{ formatFeatureName(feedback.feature) }}</td>
              <td>
                <div class="table-rating">
                  <div class="table-stars">
                    <div class="stars-container small">
                      <div class="stars-filled" :style="{ width: `${feedback.rating * 20}%` }"></div>
                    </div>
                  </div>
                  <span>{{ feedback.rating.toFixed(1) }}</span>
                </div>
              </td>
              <td>{{ feedback.count }}</td>
              <td>
                <div class="sentiment-indicator" :class="getSentimentClass(feedback.sentiment)">
                  {{ getSentimentLabel(feedback.sentiment) }}
                </div>
              </td>
              <td>
                <button @click="showFeedbackComments(feedback.feature)" class="comments-button">
                  {{ t('monitoring.usage.viewComments', 'Kommentare anzeigen') }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="selectedFeatureFeedback" class="feedback-comments-modal">
        <div class="feedback-comments-content">
          <div class="feedback-comments-header">
            <h4>
              {{ t('monitoring.usage.commentsFor', 'Kommentare für') }}:
              {{ formatFeatureName(selectedFeatureFeedback) }}
            </h4>
            <button @click="closeComments" class="close-button">&times;</button>
          </div>
          <div class="feedback-comments-list">
            <div 
              v-for="(comment, index) in getFeatureComments(selectedFeatureFeedback)" 
              :key="index"
              class="feedback-comment"
            >
              <div class="comment-header">
                <div class="comment-rating">
                  <div class="stars-container small">
                    <div class="stars-filled" :style="{ width: `${comment.rating * 20}%` }"></div>
                  </div>
                </div>
                <div class="comment-date">{{ formatDate(comment.date) }}</div>
              </div>
              <div class="comment-text">{{ comment.text }}</div>
              <div v-if="comment.userId" class="comment-user">{{ comment.userId }}</div>
            </div>
            <div v-if="getFeatureComments(selectedFeatureFeedback).length === 0" class="no-comments">
              {{ t('monitoring.usage.noComments', 'Keine Kommentare für dieses Feature vorhanden') }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from '@/composables/useI18n';

// Typen
interface FeatureStats {
  name: string;
  activations: number;
  avgDuration: number;
  toggles: number;
  errors: number;
  active: boolean;
}

interface UserSegment {
  label: string;
  count: number;
  percentage: number;
  color: string;
}

interface UserSession {
  userId: string;
  startTime: Date;
  duration: number;
  features: string[];
  interactions: number;
}

interface FeedbackItem {
  feature: string;
  rating: number;
  count: number;
  sentiment: number;
}

interface FeedbackComment {
  rating: number;
  text: string;
  date: Date;
  userId?: string;
}

interface UsageStatisticsData {
  activationTime: {
    average: number;
    trend: number[];
  };
  sessionDuration: {
    average: number;
    trend: number[];
  };
  toggleOperations: {
    total: number;
    trend: number[];
  };
  uniqueUsers: {
    total: number;
    trend: number[];
  };
  featureStats: FeatureStats[];
  userSegments: UserSegment[];
  recentSessions: UserSession[];
  feedback: {
    average: number;
    total: number;
    distribution: Record<string, number>;
    featureFeedback: FeedbackItem[];
    comments: Record<string, FeedbackComment[]>;
  };
}

interface UsageStatisticsProps {
  statistics: UsageStatisticsData;
}

// Props
const props = defineProps<UsageStatisticsProps>();

// Composables
const { t } = useI18n();

// State
const viewMode = ref<'time' | 'user' | 'feedback'>('time');
const sortField = ref<string>('activations');
const sortDirection = ref<'asc' | 'desc'>('desc');
const selectedFeatureFeedback = ref<string | null>(null);

// Berechnete Eigenschaften - Zeitbezogene Ansicht
const avgActivationTime = computed(() => props.statistics.activationTime.average);
const avgSessionDuration = computed(() => props.statistics.sessionDuration.average);
const totalToggles = computed(() => props.statistics.toggleOperations.total);
const uniqueUsers = computed(() => props.statistics.uniqueUsers.total);

const activationTrend = computed(() => props.statistics.activationTime.trend);
const sessionTrend = computed(() => props.statistics.sessionDuration.trend);
const toggleTrend = computed(() => props.statistics.toggleOperations.trend);
const userTrend = computed(() => props.statistics.uniqueUsers.trend);

const maxActivationTime = computed(() => Math.max(...activationTrend.value));
const maxSessionDuration = computed(() => Math.max(...sessionTrend.value));
const maxToggles = computed(() => Math.max(...toggleTrend.value));
const maxUsers = computed(() => Math.max(...userTrend.value));

// Sortierte Features
const sortedFeatures = computed(() => {
  const features = [...props.statistics.featureStats];
  
  features.sort((a, b) => {
    let comparison = 0;
    
    switch (sortField.value) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'activations':
        comparison = a.activations - b.activations;
        break;
      case 'avgDuration':
        comparison = a.avgDuration - b.avgDuration;
        break;
      case 'toggles':
        comparison = a.toggles - b.toggles;
        break;
      case 'errors':
        comparison = a.errors - b.errors;
        break;
      default:
        comparison = 0;
    }
    
    return sortDirection.value === 'asc' ? comparison : -comparison;
  });
  
  return features;
});

// Berechnete Eigenschaften - Benutzerbezogene Ansicht
const userSegments = computed(() => props.statistics.userSegments);
const recentSessions = computed(() => props.statistics.recentSessions);

// Berechnete Eigenschaften - Feedback-Ansicht
const averageRating = computed(() => props.statistics.feedback.average);
const totalFeedback = computed(() => props.statistics.feedback.total);
const featureFeedback = computed(() => props.statistics.feedback.featureFeedback);

// Methoden
function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`;
  }
  
  const seconds = Math.floor(milliseconds / 1000);
  
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return `${hours}h ${remainingMinutes}m`;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function formatFeatureName(feature: string): string {
  return feature
    .replace(/^use/, '')
    .replace(/([A-Z])/g, ' $1')
    .trim();
}

function calculateBarHeight(value: number, max: number): number {
  if (max === 0) return 0;
  return (value / max) * 100;
}

function sortFeatures(field: string): void {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortField.value = field;
    sortDirection.value = 'desc';
  }
}

function calculateRatingPercentage(rating: number): number {
  const count = getRatingCount(rating);
  if (totalFeedback.value === 0) return 0;
  return (count / totalFeedback.value) * 100;
}

function getRatingCount(rating: number): number {
  return props.statistics.feedback.distribution[rating.toString()] || 0;
}

function getRatingColor(rating: number): string {
  const colors = [
    '#ef4444', // 1 - rot
    '#f97316', // 2 - orange
    '#f59e0b', // 3 - bernstein
    '#84cc16', // 4 - hellgrün
    '#10b981'  // 5 - grün
  ];
  
  return colors[rating - 1];
}

function getSentimentClass(sentiment: number): string {
  if (sentiment >= 0.7) return 'sentiment-positive';
  if (sentiment >= 0.4) return 'sentiment-neutral';
  return 'sentiment-negative';
}

function getSentimentLabel(sentiment: number): string {
  if (sentiment >= 0.7) return t('monitoring.usage.sentiment.positive', 'Positiv');
  if (sentiment >= 0.4) return t('monitoring.usage.sentiment.neutral', 'Neutral');
  return t('monitoring.usage.sentiment.negative', 'Negativ');
}

function showFeedbackComments(feature: string): void {
  selectedFeatureFeedback.value = feature;
}

function closeComments(): void {
  selectedFeatureFeedback.value = null;
}

function getFeatureComments(feature: string): FeedbackComment[] {
  return props.statistics.feedback.comments[feature] || [];
}
</script>

<style scoped>
.usage-statistics {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.usage-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.usage-header h3 {
  margin: 0;
  font-size: 1.2rem;
  color: #333;
}

.usage-controls {
  display: flex;
  gap: 10px;
}

.control-select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: white;
  font-size: 0.9rem;
}

/* Zeitbezogene Ansicht */
.usage-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.usage-card {
  background-color: white;
  border-radius: 6px;
  padding: 15px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #eee;
  display: flex;
  flex-direction: column;
}

.usage-card-title {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 8px;
}

.usage-card-value {
  font-size: 1.8rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 15px;
}

.usage-card-chart {
  flex: 1;
  display: flex;
  align-items: flex-end;
}

.mini-chart {
  width: 100%;
  height: 40px;
  display: flex;
  align-items: flex-end;
  gap: 2px;
}

.mini-chart-bar {
  flex: 1;
  background-color: #3b82f6;
  opacity: 0.8;
  border-radius: 2px 2px 0 0;
  transition: height 0.3s;
  min-height: 4px;
}

.usage-feature-stats {
  background-color: white;
  border-radius: 6px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #eee;
}

.usage-feature-stats h4 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 1.1rem;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.usage-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.usage-table th {
  text-align: left;
  padding: 12px 15px;
  background-color: #f9f9f9;
  border-bottom: 1px solid #eee;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
}

.usage-table th.sorted {
  background-color: #f0f0f0;
}

.sort-icon {
  display: inline-block;
  margin-left: 5px;
  font-size: 0.8rem;
}

.usage-table td {
  padding: 12px 15px;
  border-bottom: 1px solid #eee;
}

.usage-table tr:last-child td {
  border-bottom: none;
}

.error-count {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 4px;
  background-color: #f3f4f6;
  color: #6b7280;
}

.error-count.has-errors {
  background-color: #fee2e2;
  color: #dc2626;
}

.feature-status {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.85rem;
}

.status-active {
  background-color: #dcfce7;
  color: #16a34a;
}

.status-inactive {
  background-color: #f3f4f6;
  color: #6b7280;
}

/* Benutzerbezogene Ansicht */
.usage-user-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.user-segmentation, .user-sessions {
  background-color: white;
  border-radius: 6px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #eee;
}

.user-segmentation h4, .user-sessions h4 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 1.1rem;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.segmentation-chart {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.segmentation-item {
  display: flex;
  align-items: center;
  gap: 15px;
}

.segment-label {
  width: 120px;
  font-size: 0.9rem;
}

.segment-bar-container {
  flex: 1;
  height: 24px;
  display: flex;
  align-items: center;
}

.segment-bar {
  height: 16px;
  border-radius: 8px;
  transition: width 0.3s;
}

.segment-value {
  margin-left: 10px;
  font-size: 0.9rem;
  color: #666;
  white-space: nowrap;
}

.sessions-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.sessions-table th {
  text-align: left;
  padding: 12px 15px;
  background-color: #f9f9f9;
  border-bottom: 1px solid #eee;
}

.sessions-table td {
  padding: 12px 15px;
  border-bottom: 1px solid #eee;
}

.feature-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.feature-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  background-color: #f0f9ff;
  color: #0ea5e9;
  font-size: 0.85rem;
}

.more-tag {
  background-color: #f3f4f6;
  color: #6b7280;
}

/* Feedback-Ansicht */
.usage-feedback-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
  position: relative;
}

.feedback-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.feedback-card {
  background-color: white;
  border-radius: 6px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #eee;
}

.feedback-card-title {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 10px;
}

.feedback-card-value {
  font-size: 1.8rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 15px;
}

.rating-stars {
  margin-top: 10px;
}

.stars-container {
  position: relative;
  width: 100%;
  height: 24px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='%23e5e7eb'%3E%3Cpath d='M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z'/%3E%3C/svg%3E");
  background-repeat: repeat-x;
  background-size: 24px 24px;
}

.stars-container.small {
  height: 16px;
  background-size: 16px 16px;
}

.stars-filled {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='%23f59e0b'%3E%3Cpath d='M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z'/%3E%3C/svg%3E");
  background-repeat: repeat-x;
  background-size: 24px 24px;
}

.stars-container.small .stars-filled {
  background-size: 16px 16px;
}

.feedback-distribution {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 15px;
}

.rating-bar-container {
  display: flex;
  align-items: center;
  gap: 10px;
}

.rating-label {
  width: 15px;
  text-align: center;
  font-size: 0.85rem;
  color: #666;
}

.rating-bar-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  height: 20px;
}

.rating-bar {
  height: 10px;
  border-radius: 5px;
  transition: width 0.3s;
}

.rating-count {
  margin-left: 10px;
  font-size: 0.85rem;
  color: #666;
}

.feature-feedback {
  background-color: white;
  border-radius: 6px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #eee;
}

.feature-feedback h4 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 1.1rem;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.feedback-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.feedback-table th {
  text-align: left;
  padding: 12px 15px;
  background-color: #f9f9f9;
  border-bottom: 1px solid #eee;
}

.feedback-table td {
  padding: 12px 15px;
  border-bottom: 1px solid #eee;
}

.table-rating {
  display: flex;
  align-items: center;
  gap: 10px;
}

.table-stars {
  width: 80px;
}

.sentiment-indicator {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.85rem;
}

.sentiment-positive {
  background-color: #dcfce7;
  color: #16a34a;
}

.sentiment-neutral {
  background-color: #fef3c7;
  color: #d97706;
}

.sentiment-negative {
  background-color: #fee2e2;
  color: #dc2626;
}

.comments-button {
  padding: 6px 10px;
  background-color: #f3f4f6;
  color: #374151;
  border: none;
  border-radius: 4px;
  font-size: 0.85rem;
  cursor: pointer;
}

.comments-button:hover {
  background-color: #e5e7eb;
}

.feedback-comments-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.feedback-comments-content {
  background-color: white;
  border-radius: 6px;
  width: 600px;
  max-width: 90%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.feedback-comments-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background-color: #f9f9f9;
  border-bottom: 1px solid #eee;
}

.feedback-comments-header h4 {
  margin: 0;
  font-size: 1.1rem;
  color: #333;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #666;
  cursor: pointer;
  line-height: 1;
}

.feedback-comments-list {
  padding: 20px;
  overflow-y: auto;
}

.feedback-comment {
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
}

.feedback-comment:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.comment-date {
  font-size: 0.85rem;
  color: #666;
}

.comment-text {
  margin-bottom: 8px;
  line-height: 1.5;
}

.comment-user {
  font-size: 0.85rem;
  color: #666;
  font-style: italic;
}

.no-comments {
  text-align: center;
  padding: 20px;
  color: #666;
  font-style: italic;
}

@media (max-width: 768px) {
  .usage-header, .feedback-summary {
    flex-direction: column;
  }
  
  .feedback-summary {
    grid-template-columns: 1fr;
  }
  
  .feedback-comments-content {
    width: 95%;
    max-height: 90vh;
  }
}
</style>