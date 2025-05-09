<template>
  <div 
    class="n-calendar"
    :class="{
      'n-calendar--bordered': bordered,
      [`n-calendar--${size}`]: true,
      'n-calendar--fullscreen': fullscreen
    }"
  >
    <!-- Header with navigation controls -->
    <div class="n-calendar-header">
      <div class="n-calendar-header-left">
        <button
          type="button"
          class="n-calendar-button n-calendar-year-prev"
          @click="navigateYear(-1)"
          aria-label="Previous year"
        >
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path d="M18 9l-6-6-6 6M18 15l-6 6-6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
        <button
          type="button"
          class="n-calendar-button n-calendar-month-prev"
          @click="navigateMonth(-1)"
          aria-label="Previous month"
        >
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
      </div>
      
      <div class="n-calendar-header-center">
        <div class="n-calendar-header-view">
          <span
            class="n-calendar-header-year"
            tabindex="0"
            @click="showYearPanel = !showYearPanel"
            @keydown.enter="showYearPanel = !showYearPanel"
            @keydown.space="showYearPanel = !showYearPanel"
          >
            {{ displayYear }}
          </span>
          <span
            class="n-calendar-header-month"
            tabindex="0"
            @click="showMonthPanel = !showMonthPanel"
            @keydown.enter="showMonthPanel = !showMonthPanel"
            @keydown.space="showMonthPanel = !showMonthPanel"
          >
            {{ displayMonth }}
          </span>
        </div>
      </div>
      
      <div class="n-calendar-header-right">
        <button
          type="button"
          class="n-calendar-button n-calendar-month-next"
          @click="navigateMonth(1)"
          aria-label="Next month"
        >
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path d="M9 18l6-6-6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
        <button
          type="button"
          class="n-calendar-button n-calendar-year-next"
          @click="navigateYear(1)"
          aria-label="Next year"
        >
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path d="M18 15l-6 6-6-6M18 9l-6-6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
        <button
          v-if="showToday"
          type="button"
          class="n-calendar-button n-calendar-today"
          @click="goToToday"
        >
          {{ todayText }}
        </button>
      </div>
    </div>
    
    <!-- Year selector panel -->
    <div 
      v-if="showYearPanel" 
      class="n-calendar-panel n-calendar-year-panel"
      @click.stop
    >
      <div class="n-calendar-panel-header">
        <button
          type="button"
          class="n-calendar-button"
          @click="navigateYearRange(-10)"
          aria-label="Previous decade"
        >
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
        <div class="n-calendar-panel-title">
          {{ yearRangeText }}
        </div>
        <button
          type="button"
          class="n-calendar-button"
          @click="navigateYearRange(10)"
          aria-label="Next decade"
        >
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path d="M9 18l6-6-6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
      </div>
      <div class="n-calendar-panel-body">
        <div 
          v-for="year in yearList" 
          :key="year" 
          class="n-calendar-year-cell"
          :class="{
            'n-calendar-year-cell--selected': isSelectedYear(year),
            'n-calendar-year-cell--current': isCurrentYear(year)
          }"
          @click="selectYear(year)"
        >
          {{ year }}
        </div>
      </div>
    </div>
    
    <!-- Month selector panel -->
    <div 
      v-if="showMonthPanel" 
      class="n-calendar-panel n-calendar-month-panel"
      @click.stop
    >
      <div class="n-calendar-panel-header">
        <button
          type="button"
          class="n-calendar-button"
          @click="navigateYear(-1)"
          aria-label="Previous year"
        >
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
        <div 
          class="n-calendar-panel-title"
          @click="showYearPanel = true; showMonthPanel = false"
        >
          {{ displayYear }}
        </div>
        <button
          type="button"
          class="n-calendar-button"
          @click="navigateYear(1)"
          aria-label="Next year"
        >
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path d="M9 18l6-6-6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
      </div>
      <div class="n-calendar-panel-body">
        <div 
          v-for="(month, index) in monthList" 
          :key="month" 
          class="n-calendar-month-cell"
          :class="{
            'n-calendar-month-cell--selected': isSelectedMonth(index),
            'n-calendar-month-cell--current': isCurrentMonth(index)
          }"
          @click="selectMonth(index)"
        >
          {{ month }}
        </div>
      </div>
    </div>
    
    <!-- Weekday header -->
    <div class="n-calendar-weekdays">
      <div 
        v-for="day in weekDaysLocal" 
        :key="day" 
        class="n-calendar-weekday"
      >
        {{ day }}
      </div>
    </div>
    
    <!-- Calendar body -->
    <div class="n-calendar-body">
      <div 
        v-for="(week, weekIndex) in calendarDays" 
        :key="`week-${weekIndex}`" 
        class="n-calendar-week"
      >
        <div 
          v-for="(day, dayIndex) in week" 
          :key="`day-${weekIndex}-${dayIndex}`" 
          class="n-calendar-day"
          :class="getDayClass(day)"
          @click="selectDate(day)"
        >
          <div class="n-calendar-day-inner">
            <div class="n-calendar-day-number">{{ day.day }}</div>
            <div v-if="hasDayContent(day)" class="n-calendar-day-content">
              <slot name="day-content" :date="day.date" :day="day.day" :isCurrentMonth="!day.isPrevMonth && !day.isNextMonth">
                <div v-if="day.events && day.events.length > 0" class="n-calendar-day-events">
                  <div 
                    v-for="(event, index) in day.events" 
                    :key="`event-${index}`"
                    class="n-calendar-day-event"
                    :style="{ 
                      backgroundColor: event.color || 'var(--nscale-primary)', 
                      color: event.textColor || 'white'
                    }"
                    :title="event.content"
                  >
                    {{ event.content }}
                  </div>
                </div>
              </slot>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';

export interface CalendarEvent {
  date: Date;
  content: string;
  color?: string;
  textColor?: string;
}

export interface CalendarDayInfo {
  date: Date;
  day: number;
  isPrevMonth: boolean;
  isNextMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isDisabled: boolean;
  events?: CalendarEvent[];
}

export interface CalendarProps {
  /** Selected date (v-model) */
  modelValue?: Date;
  /** Calendar mode */
  mode?: 'month' | 'year';
  /** First day of week (0: Sunday, 1: Monday, etc.) */
  firstDayOfWeek?: number;
  /** Whether the calendar has a border */
  bordered?: boolean;
  /** Size variant for the calendar */
  size?: 'small' | 'medium' | 'large';
  /** Whether to show today button */
  showToday?: boolean;
  /** Text for the today button */
  todayText?: string;
  /** Text for month names */
  monthNames?: string[];
  /** Text for weekday names */
  weekDayNames?: string[];
  /** List of events to display */
  events?: CalendarEvent[];
  /** Whether dates outside current month are disabled */
  disableOutsideDates?: boolean;
  /** Whether calendar is in fullscreen mode */
  fullscreen?: boolean;
  /** Function to determine if a date should be disabled */
  disabledDate?: (date: Date) => boolean;
}

const props = withDefaults(defineProps<CalendarProps>(), {
  mode: 'month',
  firstDayOfWeek: 1, // Monday
  bordered: true,
  size: 'medium',
  showToday: true,
  todayText: 'Today',
  monthNames: () => ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  weekDayNames: () => ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
  events: () => [],
  disableOutsideDates: false,
  fullscreen: false,
});

const emit = defineEmits<{
  (e: 'update:modelValue', date: Date): void;
  (e: 'select', date: Date): void;
  (e: 'panel-change', date: Date, mode: string): void;
  (e: 'event-click', event: CalendarEvent): void;
}>();

// State
const currentDate = ref(props.modelValue ? new Date(props.modelValue) : new Date());
const selectedDate = ref(props.modelValue ? new Date(props.modelValue) : null);
const showYearPanel = ref(false);
const showMonthPanel = ref(false);

// Adjust weekdays based on firstDayOfWeek
const weekDaysLocal = computed(() => {
  const days = [...props.weekDayNames];
  const firstDays = days.splice(0, props.firstDayOfWeek);
  return [...days, ...firstDays];
});

// Current view properties
const displayYear = computed(() => currentDate.value.getFullYear());
const displayMonth = computed(() => props.monthNames[currentDate.value.getMonth()]);

// Year range for year panel
const yearRangeStart = computed(() => Math.floor(displayYear.value / 10) * 10);
const yearRangeEnd = computed(() => yearRangeStart.value + 9);
const yearRangeText = computed(() => `${yearRangeStart.value} - ${yearRangeEnd.value}`);

// List of years for year panel
const yearList = computed(() => {
  const years = [];
  for (let i = yearRangeStart.value; i <= yearRangeEnd.value; i++) {
    years.push(i);
  }
  return years;
});

// List of months for month panel
const monthList = computed(() => props.monthNames);

// Calendar days grid
const calendarDays = computed(() => {
  const year = currentDate.value.getFullYear();
  const month = currentDate.value.getMonth();
  const today = new Date();
  
  // First day of month
  const firstDay = new Date(year, month, 1);
  // Adjusted day of week based on firstDayOfWeek prop
  const firstDayOfWeek = (firstDay.getDay() - props.firstDayOfWeek + 7) % 7;
  // Last day of month
  const lastDay = new Date(year, month + 1, 0);
  const totalDays = lastDay.getDate();
  
  // Previous month days needed
  const prevMonthDays = firstDayOfWeek;
  // Last day of previous month
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  
  // Calculate total cells needed (max 6 weeks)
  const totalCells = Math.ceil((prevMonthDays + totalDays) / 7) * 7;
  
  // Calendar grid as weeks array
  const weeks = [];
  let days = [];
  
  // Add previous month days
  for (let i = 1; i <= prevMonthDays; i++) {
    const day = prevMonthLastDay - prevMonthDays + i;
    const date = new Date(year, month - 1, day);
    
    days.push({
      date,
      day,
      isPrevMonth: true,
      isNextMonth: false,
      isToday: isSameDate(date, today),
      isSelected: selectedDate.value ? isSameDate(date, selectedDate.value) : false,
      isDisabled: props.disableOutsideDates || (props.disabledDate ? props.disabledDate(date) : false),
      events: getEventsForDate(date)
    });
  }
  
  // Add current month days
  for (let i = 1; i <= totalDays; i++) {
    const date = new Date(year, month, i);
    
    days.push({
      date,
      day: i,
      isPrevMonth: false,
      isNextMonth: false,
      isToday: isSameDate(date, today),
      isSelected: selectedDate.value ? isSameDate(date, selectedDate.value) : false,
      isDisabled: props.disabledDate ? props.disabledDate(date) : false,
      events: getEventsForDate(date)
    });
    
    // Start new week
    if (days.length === 7) {
      weeks.push([...days]);
      days = [];
    }
  }
  
  // Add next month days
  const nextMonthDays = totalCells - (prevMonthDays + totalDays);
  for (let i = 1; i <= nextMonthDays; i++) {
    const date = new Date(year, month + 1, i);
    
    days.push({
      date,
      day: i,
      isPrevMonth: false,
      isNextMonth: true,
      isToday: isSameDate(date, today),
      isSelected: selectedDate.value ? isSameDate(date, selectedDate.value) : false,
      isDisabled: props.disableOutsideDates || (props.disabledDate ? props.disabledDate(date) : false),
      events: getEventsForDate(date)
    });
    
    // Start new week
    if (days.length === 7) {
      weeks.push([...days]);
      days = [];
    }
  }
  
  return weeks;
});

// Methods
function navigateMonth(step: number): void {
  const newDate = new Date(currentDate.value);
  newDate.setMonth(newDate.getMonth() + step);
  currentDate.value = newDate;
  emit('panel-change', new Date(newDate), 'month');
}

function navigateYear(step: number): void {
  const newDate = new Date(currentDate.value);
  newDate.setFullYear(newDate.getFullYear() + step);
  currentDate.value = newDate;
  emit('panel-change', new Date(newDate), 'year');
}

function navigateYearRange(step: number): void {
  const newDate = new Date(currentDate.value);
  newDate.setFullYear(newDate.getFullYear() + step);
  currentDate.value = newDate;
}

function selectYear(year: number): void {
  const newDate = new Date(currentDate.value);
  newDate.setFullYear(year);
  currentDate.value = newDate;
  showYearPanel.value = false;
  showMonthPanel.value = true;
  emit('panel-change', new Date(newDate), 'year');
}

function selectMonth(month: number): void {
  const newDate = new Date(currentDate.value);
  newDate.setMonth(month);
  currentDate.value = newDate;
  showMonthPanel.value = false;
  emit('panel-change', new Date(newDate), 'month');
}

function selectDate(day: CalendarDayInfo): void {
  if (day.isDisabled) return;
  
  selectedDate.value = new Date(day.date);
  
  // If it's a prev/next month, update current view
  if (day.isPrevMonth) {
    navigateMonth(-1);
  } else if (day.isNextMonth) {
    navigateMonth(1);
  }
  
  emit('update:modelValue', new Date(day.date));
  emit('select', new Date(day.date));
}

function goToToday(): void {
  const today = new Date();
  currentDate.value = new Date(today);
  selectedDate.value = new Date(today);
  emit('update:modelValue', new Date(today));
  emit('select', new Date(today));
}

function isSelectedYear(year: number): boolean {
  if (!selectedDate.value) return false;
  return selectedDate.value.getFullYear() === year;
}

function isCurrentYear(year: number): boolean {
  const today = new Date();
  return today.getFullYear() === year;
}

function isSelectedMonth(month: number): boolean {
  if (!selectedDate.value) return false;
  return selectedDate.value.getMonth() === month && 
         selectedDate.value.getFullYear() === currentDate.value.getFullYear();
}

function isCurrentMonth(month: number): boolean {
  const today = new Date();
  return today.getMonth() === month && 
         today.getFullYear() === currentDate.value.getFullYear();
}

function getDayClass(day: CalendarDayInfo): { [key: string]: boolean } {
  return {
    'n-calendar-day--prev-month': day.isPrevMonth,
    'n-calendar-day--next-month': day.isNextMonth,
    'n-calendar-day--today': day.isToday,
    'n-calendar-day--selected': day.isSelected,
    'n-calendar-day--disabled': day.isDisabled,
    'n-calendar-day--with-events': day.events && day.events.length > 0
  };
}

function hasDayContent(day: CalendarDayInfo): boolean {
  // Only show content for current month days in normal view
  if (!props.fullscreen && (day.isPrevMonth || day.isNextMonth)) {
    return false;
  }
  return !!day.events && day.events.length > 0;
}

function getEventsForDate(date: Date): CalendarEvent[] {
  return props.events.filter(event => isSameDate(event.date, date));
}

function isSameDate(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() && 
         date1.getMonth() === date2.getMonth() && 
         date1.getDate() === date2.getDate();
}

// Handle outside clicks to close panels
function handleOutsideClick(event: MouseEvent): void {
  if (showYearPanel.value || showMonthPanel.value) {
    showYearPanel.value = false;
    showMonthPanel.value = false;
  }
}

// Watchers
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    selectedDate.value = new Date(newValue);
    // Only update current view if the month/year are different
    if (
      currentDate.value.getMonth() !== newValue.getMonth() ||
      currentDate.value.getFullYear() !== newValue.getFullYear()
    ) {
      currentDate.value = new Date(newValue);
    }
  } else {
    selectedDate.value = null;
  }
});

// Lifecycle
onMounted(() => {
  document.addEventListener('click', handleOutsideClick);
});

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick);
});
</script>

<style scoped>
.n-calendar {
  --n-calendar-border-color: var(--nscale-gray-200);
  --n-calendar-text-color: var(--nscale-gray-800);
  --n-calendar-secondary-text-color: var(--nscale-gray-500);
  --n-calendar-bg-color: var(--nscale-white);
  --n-calendar-day-size: 36px;
  --n-calendar-day-hover-bg: var(--nscale-gray-50);
  --n-calendar-day-selected-bg: var(--nscale-primary);
  --n-calendar-day-selected-text: var(--nscale-white);
  --n-calendar-day-today-border: var(--nscale-primary);
  --n-calendar-day-disabled-text: var(--nscale-gray-400);
  --n-calendar-weekend-text: var(--nscale-gray-700);
  --n-calendar-outside-month-text: var(--nscale-gray-400);
  
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 350px;
  font-family: var(--nscale-font-family-base);
  background-color: var(--n-calendar-bg-color);
  color: var(--n-calendar-text-color);
  position: relative;
}

.n-calendar--bordered {
  border: 1px solid var(--n-calendar-border-color);
  border-radius: var(--nscale-border-radius-md);
  overflow: hidden;
}

.n-calendar--fullscreen {
  max-width: none;
  height: 100%;
}

/* Size variants */
.n-calendar--small {
  --n-calendar-day-size: 28px;
  font-size: var(--nscale-font-size-sm);
}

.n-calendar--large {
  --n-calendar-day-size: 42px;
  font-size: var(--nscale-font-size-lg);
  max-width: 400px;
}

/* Calendar header */
.n-calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--nscale-space-3);
  border-bottom: 1px solid var(--n-calendar-border-color);
}

.n-calendar-header-left,
.n-calendar-header-right {
  display: flex;
  align-items: center;
  gap: var(--nscale-space-1);
}

.n-calendar-header-center {
  flex: 1;
  text-align: center;
}

.n-calendar-header-view {
  display: inline-flex;
  align-items: center;
  gap: var(--nscale-space-2);
  font-weight: var(--nscale-font-weight-medium);
  cursor: pointer;
}

.n-calendar-header-year,
.n-calendar-header-month {
  padding: var(--nscale-space-1) var(--nscale-space-2);
  border-radius: var(--nscale-border-radius-sm);
  transition: background-color var(--nscale-transition-quick);
}

.n-calendar-header-year:hover,
.n-calendar-header-month:hover {
  background-color: var(--n-calendar-day-hover-bg);
}

.n-calendar-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: var(--nscale-border-radius-sm);
  cursor: pointer;
  color: var(--n-calendar-text-color);
  transition: background-color var(--nscale-transition-quick);
}

.n-calendar-button:hover {
  background-color: var(--n-calendar-day-hover-bg);
}

.n-calendar-today {
  width: auto;
  padding: 0 var(--nscale-space-2);
}

/* Year and Month panels */
.n-calendar-panel {
  position: absolute;
  top: 70px;
  left: 50%;
  transform: translateX(-50%);
  width: 80%;
  max-width: 280px;
  background-color: var(--n-calendar-bg-color);
  border: 1px solid var(--n-calendar-border-color);
  border-radius: var(--nscale-border-radius-md);
  z-index: 10;
  box-shadow: var(--nscale-shadow-md);
}

.n-calendar-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--nscale-space-2);
  border-bottom: 1px solid var(--n-calendar-border-color);
}

.n-calendar-panel-title {
  font-weight: var(--nscale-font-weight-medium);
  cursor: pointer;
}

.n-calendar-panel-body {
  display: grid;
  padding: var(--nscale-space-2);
}

.n-calendar-year-panel .n-calendar-panel-body {
  grid-template-columns: repeat(3, 1fr);
  gap: var(--nscale-space-1);
}

.n-calendar-month-panel .n-calendar-panel-body {
  grid-template-columns: repeat(3, 1fr);
  gap: var(--nscale-space-1);
}

.n-calendar-year-cell,
.n-calendar-month-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  border-radius: var(--nscale-border-radius-sm);
  cursor: pointer;
  transition: all var(--nscale-transition-quick);
}

.n-calendar-year-cell:hover,
.n-calendar-month-cell:hover {
  background-color: var(--n-calendar-day-hover-bg);
}

.n-calendar-year-cell--selected,
.n-calendar-month-cell--selected {
  background-color: var(--n-calendar-day-selected-bg);
  color: var(--n-calendar-day-selected-text);
}

.n-calendar-year-cell--current,
.n-calendar-month-cell--current {
  border: 1px solid var(--n-calendar-day-today-border);
  font-weight: var(--nscale-font-weight-bold);
}

/* Weekdays header */
.n-calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border-bottom: 1px solid var(--n-calendar-border-color);
}

.n-calendar-weekday {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  font-weight: var(--nscale-font-weight-medium);
  color: var(--n-calendar-secondary-text-color);
}

/* Calendar body */
.n-calendar-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: auto;
}

.n-calendar-week {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  flex: 1;
}

.n-calendar-day {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: var(--n-calendar-day-size);
  border-radius: var(--nscale-border-radius-sm);
  cursor: pointer;
  transition: background-color var(--nscale-transition-quick);
}

.n-calendar--fullscreen .n-calendar-day {
  min-height: 80px;
  height: 100%;
  border-top: 1px solid var(--n-calendar-border-color);
  border-right: 1px solid var(--n-calendar-border-color);
  border-radius: 0;
}

.n-calendar-day:hover {
  background-color: var(--n-calendar-day-hover-bg);
}

.n-calendar-day-inner {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: var(--nscale-space-1);
}

.n-calendar-day-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--n-calendar-day-size);
  height: var(--n-calendar-day-size);
  margin: 0 auto;
}

.n-calendar--fullscreen .n-calendar-day-number {
  margin: 0;
  justify-content: flex-start;
  height: auto;
  width: auto;
  padding: var(--nscale-space-1);
}

.n-calendar-day--prev-month,
.n-calendar-day--next-month {
  color: var(--n-calendar-outside-month-text);
}

.n-calendar-day--today .n-calendar-day-number {
  position: relative;
  font-weight: var(--nscale-font-weight-bold);
  color: var(--n-calendar-day-today-border);
}

.n-calendar--fullscreen .n-calendar-day--today {
  background-color: rgba(0, 165, 80, 0.05);
}

.n-calendar-day--selected .n-calendar-day-number {
  background-color: var(--n-calendar-day-selected-bg);
  color: var(--n-calendar-day-selected-text);
  border-radius: 50%;
}

.n-calendar-day--disabled {
  cursor: not-allowed;
  color: var(--n-calendar-day-disabled-text);
}

.n-calendar-day--disabled:hover {
  background-color: transparent;
}

/* Day content */
.n-calendar-day-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin-top: var(--nscale-space-1);
}

.n-calendar--fullscreen .n-calendar-day-content {
  margin-top: var(--nscale-space-2);
}

.n-calendar-day-events {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.n-calendar-day-event {
  font-size: var(--nscale-font-size-xs);
  padding: 0 var(--nscale-space-1);
  border-radius: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-height: 18px;
  line-height: 18px;
}

/* Animation */
.n-calendar-panel-enter-active,
.n-calendar-panel-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.n-calendar-panel-enter-from,
.n-calendar-panel-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Dark theme support */
.theme-dark {
  --n-calendar-border-color: var(--nscale-gray-700);
  --n-calendar-text-color: var(--nscale-gray-200);
  --n-calendar-secondary-text-color: var(--nscale-gray-400);
  --n-calendar-bg-color: var(--nscale-gray-800);
  --n-calendar-day-hover-bg: var(--nscale-gray-700);
  --n-calendar-weekend-text: var(--nscale-gray-300);
  --n-calendar-outside-month-text: var(--nscale-gray-600);
}

/* High contrast theme */
.theme-contrast {
  --n-calendar-border-color: var(--nscale-primary);
  --n-calendar-text-color: var(--nscale-white);
  --n-calendar-secondary-text-color: var(--nscale-gray-300);
  --n-calendar-bg-color: var(--nscale-black);
  --n-calendar-day-hover-bg: var(--nscale-gray-900);
  --n-calendar-day-selected-bg: var(--nscale-primary);
  --n-calendar-day-selected-text: var(--nscale-black);
  --n-calendar-day-today-border: var(--nscale-primary);
  --n-calendar-weekend-text: var(--nscale-white);
  --n-calendar-outside-month-text: var(--nscale-gray-600);
}
</style>