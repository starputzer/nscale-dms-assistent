<template>
  <div
    class="base-date-range-picker"
    :class="{ 'base-date-range-picker--open': isOpen }"
  >
    <div class="base-date-range-picker__input-container">
      <button
        class="base-date-range-picker__input"
        @click="togglePicker"
        type="button"
      >
        <i class="fas fa-calendar-alt base-date-range-picker__icon"></i>
        <span class="base-date-range-picker__dates">
          {{ formatDateRange }}
        </span>
        <i
          class="fas fa-chevron-down base-date-range-picker__arrow"
          :class="{ 'base-date-range-picker__arrow--open': isOpen }"
        ></i>
      </button>
    </div>

    <div v-if="isOpen" class="base-date-range-picker__dropdown">
      <div class="base-date-range-picker__header">
        <div class="base-date-range-picker__ranges">
          <button
            v-for="(range, key) in presetRanges"
            :key="key"
            class="base-date-range-picker__range-btn"
            :class="{
              'base-date-range-picker__range-btn--active': isActiveRange(key),
            }"
            @click="selectPresetRange(key)"
            type="button"
          >
            {{ range.label }}
          </button>
        </div>

        <div class="base-date-range-picker__calendars">
          <div class="base-date-range-picker__calendar">
            <div class="base-date-range-picker__calendar-header">
              <button
                type="button"
                class="base-date-range-picker__nav-btn"
                @click="prevMonth(0)"
              >
                <i class="fas fa-chevron-left"></i>
              </button>
              <span class="base-date-range-picker__month">
                {{ formatMonthYear(calendars[0].year, calendars[0].month) }}
              </span>
              <button
                type="button"
                class="base-date-range-picker__nav-btn"
                @click="nextMonth(0)"
              >
                <i class="fas fa-chevron-right"></i>
              </button>
            </div>

            <div class="base-date-range-picker__weekdays">
              <div
                v-for="day in weekdays"
                :key="day"
                class="base-date-range-picker__weekday"
              >
                {{ day }}
              </div>
            </div>

            <div class="base-date-range-picker__days">
              <div
                v-for="(day, index) in calendars[0].days"
                :key="index"
                class="base-date-range-picker__day"
                :class="{
                  'base-date-range-picker__day--other-month':
                    !day.isCurrentMonth,
                  'base-date-range-picker__day--selected': isDaySelected(
                    day.date,
                  ),
                  'base-date-range-picker__day--in-range': isDayInRange(
                    day.date,
                  ),
                  'base-date-range-picker__day--start': isStartDate(day.date),
                  'base-date-range-picker__day--end': isEndDate(day.date),
                  'base-date-range-picker__day--today': isToday(day.date),
                }"
                @click="selectDate(day.date)"
              >
                {{ day.day }}
              </div>
            </div>
          </div>

          <div class="base-date-range-picker__calendar">
            <div class="base-date-range-picker__calendar-header">
              <button
                type="button"
                class="base-date-range-picker__nav-btn"
                @click="prevMonth(1)"
              >
                <i class="fas fa-chevron-left"></i>
              </button>
              <span class="base-date-range-picker__month">
                {{ formatMonthYear(calendars[1].year, calendars[1].month) }}
              </span>
              <button
                type="button"
                class="base-date-range-picker__nav-btn"
                @click="nextMonth(1)"
              >
                <i class="fas fa-chevron-right"></i>
              </button>
            </div>

            <div class="base-date-range-picker__weekdays">
              <div
                v-for="day in weekdays"
                :key="day"
                class="base-date-range-picker__weekday"
              >
                {{ day }}
              </div>
            </div>

            <div class="base-date-range-picker__days">
              <div
                v-for="(day, index) in calendars[1].days"
                :key="index"
                class="base-date-range-picker__day"
                :class="{
                  'base-date-range-picker__day--other-month':
                    !day.isCurrentMonth,
                  'base-date-range-picker__day--selected': isDaySelected(
                    day.date,
                  ),
                  'base-date-range-picker__day--in-range': isDayInRange(
                    day.date,
                  ),
                  'base-date-range-picker__day--start': isStartDate(day.date),
                  'base-date-range-picker__day--end': isEndDate(day.date),
                  'base-date-range-picker__day--today': isToday(day.date),
                }"
                @click="selectDate(day.date)"
              >
                {{ day.day }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="base-date-range-picker__footer">
        <button
          type="button"
          class="base-date-range-picker__btn base-date-range-picker__btn--cancel"
          @click="cancel"
        >
          Abbrechen
        </button>
        <button
          type="button"
          class="base-date-range-picker__btn base-date-range-picker__btn--apply"
          @click="apply"
        >
          Anwenden
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
} from "vue";

interface DateRange {
  start: Date;
  end: Date;
}

interface PresetRange {
  label: string;
  range: () => DateRange;
}

interface CalendarDay {
  day: number;
  date: Date;
  isCurrentMonth: boolean;
}

interface Calendar {
  year: number;
  month: number;
  days: CalendarDay[];
}

interface Props {
  modelValue: DateRange;
  format?: string;
  showWeekNumbers?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => ({
    start: new Date(),
    end: new Date(),
  }),
  format: "dd.MM.yyyy",
  showWeekNumbers: false,
});

const emit = defineEmits(["update:modelValue", "change"]);

const isOpen = ref(false);
const weekdays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const localRange = ref<DateRange>({
  start: props.modelValue.start,
  end: props.modelValue.end,
});
const activePreset = ref<string | null>(null);
const calendars = ref<Calendar[]>([
  { year: 0, month: 0, days: [] },
  { year: 0, month: 0, days: [] },
]);

const hoveringDate = ref<Date | null>(null);
const selecting = ref<"start" | "end" | null>(null);

const presetRanges = {
  today: {
    label: "Heute",
    range: () => {
      const today = new Date();
      return {
        start: new Date(today),
        end: new Date(today),
      };
    },
  },
  yesterday: {
    label: "Gestern",
    range: () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        start: new Date(yesterday),
        end: new Date(yesterday),
      };
    },
  },
  last7Days: {
    label: "Letzte 7 Tage",
    range: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 6);
      return { start, end };
    },
  },
  last30Days: {
    label: "Letzte 30 Tage",
    range: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 29);
      return { start, end };
    },
  },
  thisMonth: {
    label: "Dieser Monat",
    range: () => {
      const start = new Date();
      start.setDate(1);
      const end = new Date();
      return { start, end };
    },
  },
  lastMonth: {
    label: "Letzter Monat",
    range: () => {
      const start = new Date();
      start.setMonth(start.getMonth() - 1);
      start.setDate(1);
      const end = new Date();
      end.setDate(0);
      return { start, end };
    },
  },
};

const formatDateRange = computed(() => {
  const startDate = formatDate(props.modelValue.start);
  const endDate = formatDate(props.modelValue.end);

  if (startDate === endDate) {
    return startDate;
  }

  return `${startDate} - ${endDate}`;
});

// Initialize the calendars
onMounted(() => {
  document.addEventListener("click", handleOutsideClick);
  initCalendars();
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleOutsideClick);
});

watch(
  () => props.modelValue,
  (newVal) => {
    localRange.value = {
      start: new Date(newVal.start),
      end: new Date(newVal.end),
    };
    initCalendars();
  },
  { deep: true },
);

function initCalendars() {
  // First calendar shows the month of the start date
  const startDate = new Date(localRange.value.start);
  calendars.value[0] = {
    year: startDate.getFullYear(),
    month: startDate.getMonth(),
    days: [],
  };

  // Second calendar shows the next month
  const endDate = new Date(localRange.value.end);
  let secondMonth = startDate.getMonth() + 1;
  let secondYear = startDate.getFullYear();

  if (secondMonth > 11) {
    secondMonth = 0;
    secondYear++;
  }

  // If the end date is in a different month and year, use that instead
  if (
    endDate.getFullYear() !== startDate.getFullYear() ||
    endDate.getMonth() !== startDate.getMonth()
  ) {
    secondMonth = endDate.getMonth();
    secondYear = endDate.getFullYear();
  }

  calendars.value[1] = {
    year: secondYear,
    month: secondMonth,
    days: [],
  };

  // Generate the days for both calendars
  generateCalendarDays(0);
  generateCalendarDays(1);
}

function generateCalendarDays(calendarIndex: number) {
  const year = calendars.value[calendarIndex].year;
  const month = calendars.value[calendarIndex].month;

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Get the day of the week for the first day (0 = Sunday, 1 = Monday, etc.)
  let firstDayOfWeek = firstDay.getDay();
  firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Adjust to make Monday = 0

  const days: CalendarDay[] = [];

  // Add days from previous month
  if (firstDayOfWeek > 0) {
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      const date = new Date(year, month - 1, day);
      days.push({
        day,
        date,
        isCurrentMonth: false,
      });
    }
  }

  // Add days from current month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day);
    days.push({
      day,
      date,
      isCurrentMonth: true,
    });
  }

  // Add days from next month to fill the grid (6 rows x 7 days = 42 cells)
  const remainingDays = 42 - days.length;
  for (let day = 1; day <= remainingDays; day++) {
    const date = new Date(year, month + 1, day);
    days.push({
      day,
      date,
      isCurrentMonth: false,
    });
  }

  calendars.value[calendarIndex].days = days;
}

function prevMonth(calendarIndex: number) {
  const calendar = calendars.value[calendarIndex];
  if (calendar.month === 0) {
    calendar.month = 11;
    calendar.year--;
  } else {
    calendar.month--;
  }
  generateCalendarDays(calendarIndex);

  // If we are moving the second calendar and it would overlap with the first,
  // also move the first calendar
  if (calendarIndex === 1) {
    const firstCalendar = calendars.value[0];
    if (
      calendar.year < firstCalendar.year ||
      (calendar.year === firstCalendar.year &&
        calendar.month <= firstCalendar.month)
    ) {
      if (firstCalendar.month === 0) {
        firstCalendar.month = 11;
        firstCalendar.year--;
      } else {
        firstCalendar.month--;
      }
      generateCalendarDays(0);
    }
  }
}

function nextMonth(calendarIndex: number) {
  const calendar = calendars.value[calendarIndex];
  if (calendar.month === 11) {
    calendar.month = 0;
    calendar.year++;
  } else {
    calendar.month++;
  }
  generateCalendarDays(calendarIndex);

  // If we are moving the first calendar and it would overlap with the second,
  // also move the second calendar
  if (calendarIndex === 0) {
    const secondCalendar = calendars.value[1];
    if (
      calendar.year > secondCalendar.year ||
      (calendar.year === secondCalendar.year &&
        calendar.month >= secondCalendar.month)
    ) {
      if (secondCalendar.month === 11) {
        secondCalendar.month = 0;
        secondCalendar.year++;
      } else {
        secondCalendar.month++;
      }
      generateCalendarDays(1);
    }
  }
}

function togglePicker() {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    nextTick(() => {
      initCalendars();
    });
  }
}

function selectDate(date: Date) {
  const newDate = new Date(date);

  if (!selecting.value || selecting.value === "start") {
    // Start new selection
    localRange.value.start = newDate;
    localRange.value.end = newDate;
    selecting.value = "end";
  } else {
    // Complete the selection
    if (newDate < localRange.value.start) {
      // If selecting end date before start date, swap them
      localRange.value.end = localRange.value.start;
      localRange.value.start = newDate;
    } else {
      localRange.value.end = newDate;
    }
    selecting.value = null;
  }
}

function selectPresetRange(key: string) {
  const range = presetRanges[key as keyof typeof presetRanges].range();
  localRange.value = range;
  activePreset.value = key;
}

function isActiveRange(key: string) {
  return activePreset.value === key;
}

function isDaySelected(date: Date) {
  return isStartDate(date) || isEndDate(date);
}

function isDayInRange(date: Date) {
  return date > localRange.value.start && date < localRange.value.end;
}

function isStartDate(date: Date) {
  return (
    date.getDate() === localRange.value.start.getDate() &&
    date.getMonth() === localRange.value.start.getMonth() &&
    date.getFullYear() === localRange.value.start.getFullYear()
  );
}

function isEndDate(date: Date) {
  return (
    date.getDate() === localRange.value.end.getDate() &&
    date.getMonth() === localRange.value.end.getMonth() &&
    date.getFullYear() === localRange.value.end.getFullYear()
  );
}

function isToday(date: Date) {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function apply() {
  emit("update:modelValue", {
    start: localRange.value.start,
    end: localRange.value.end,
  });
  emit("change", {
    start: localRange.value.start,
    end: localRange.value.end,
  });
  isOpen.value = false;
}

function cancel() {
  // Reset to the original value
  localRange.value = {
    start: props.modelValue.start,
    end: props.modelValue.end,
  };
  isOpen.value = false;
}

function formatDate(date: Date): string {
  // Simple date formatter: DD.MM.YYYY
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();

  return `${day}.${month}.${year}`;
}

function formatMonthYear(year: number, month: number): string {
  const monthNames = [
    "Januar",
    "Februar",
    "März",
    "April",
    "Mai",
    "Juni",
    "Juli",
    "August",
    "September",
    "Oktober",
    "November",
    "Dezember",
  ];

  return `${monthNames[month]} ${year}`;
}

function handleOutsideClick(event: MouseEvent) {
  if (isOpen.value) {
    const target = event.target as Element;
    const picker = document.querySelector(".base-date-range-picker");

    if (picker && !picker.contains(target)) {
      isOpen.value = false;
    }
  }
}
</script>

<style scoped>
.base-date-range-picker {
  position: relative;
  display: inline-block;
  font-size: 14px;
  width: 240px;
}

.base-date-range-picker__input-container {
  position: relative;
  width: 100%;
}

.base-date-range-picker__input {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.5rem 0.75rem;
  background-color: white;
  border: 1px solid var(--nscale-border, #ced4da);
  border-radius: 4px;
  cursor: pointer;
  text-align: left;
  font-size: 14px;
  transition: all 0.2s ease;
}

.base-date-range-picker__input:focus {
  outline: none;
  border-color: var(--nscale-primary, #0078d4);
  box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.15);
}

.base-date-range-picker--open .base-date-range-picker__input {
  border-color: var(--nscale-primary, #0078d4);
  box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.15);
}

.base-date-range-picker__icon {
  margin-right: 0.5rem;
  color: var(--nscale-text-secondary, #6c757d);
}

.base-date-range-picker__dates {
  flex-grow: 1;
}

.base-date-range-picker__arrow {
  margin-left: 0.5rem;
  transition: transform 0.2s ease;
}

.base-date-range-picker__arrow--open {
  transform: rotate(180deg);
}

.base-date-range-picker__dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 1000;
  width: 540px;
  background-color: white;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 1rem;
  display: flex;
  flex-direction: column;
}

.base-date-range-picker__header {
  display: flex;
  flex-direction: column;
}

.base-date-range-picker__ranges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--nscale-border, #ced4da);
}

.base-date-range-picker__range-btn {
  padding: 0.25rem 0.5rem;
  background-color: var(--nscale-light, #f8f9fa);
  border: 1px solid var(--nscale-border, #ced4da);
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.base-date-range-picker__range-btn:hover {
  background-color: var(--nscale-border, #ced4da);
}

.base-date-range-picker__range-btn--active {
  background-color: var(--nscale-primary, #0078d4);
  color: white;
  border-color: var(--nscale-primary, #0078d4);
}

.base-date-range-picker__calendars {
  display: flex;
  gap: 1rem;
}

.base-date-range-picker__calendar {
  flex: 1;
  min-width: 240px;
}

.base-date-range-picker__calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  padding: 0.25rem;
}

.base-date-range-picker__month {
  font-weight: 500;
}

.base-date-range-picker__nav-btn {
  background: transparent;
  border: none;
  padding: 0.25rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--nscale-text-secondary, #6c757d);
}

.base-date-range-picker__nav-btn:hover {
  color: var(--nscale-text, #212529);
}

.base-date-range-picker__weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  margin-bottom: 0.25rem;
  font-weight: 500;
  font-size: 12px;
  color: var(--nscale-text-secondary, #6c757d);
}

.base-date-range-picker__weekday {
  padding: 0.25rem;
}

.base-date-range-picker__days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.base-date-range-picker__day {
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s ease;
  font-size: 13px;
}

.base-date-range-picker__day:hover {
  background-color: var(--nscale-light, #f8f9fa);
}

.base-date-range-picker__day--other-month {
  color: var(--nscale-text-secondary, #6c757d);
  opacity: 0.5;
}

.base-date-range-picker__day--selected {
  background-color: var(--nscale-primary, #0078d4);
  color: white;
}

.base-date-range-picker__day--in-range {
  background-color: rgba(0, 120, 212, 0.1);
  color: var(--nscale-primary, #0078d4);
}

.base-date-range-picker__day--start {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.base-date-range-picker__day--end {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}

.base-date-range-picker__day--today:not(
    .base-date-range-picker__day--selected
  ):not(.base-date-range-picker__day--in-range) {
  border: 1px solid var(--nscale-primary, #0078d4);
}

.base-date-range-picker__footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--nscale-border, #ced4da);
}

.base-date-range-picker__btn {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.base-date-range-picker__btn--cancel {
  background-color: var(--nscale-light, #f8f9fa);
  color: var(--nscale-text, #212529);
  border: 1px solid var(--nscale-border, #ced4da);
}

.base-date-range-picker__btn--cancel:hover {
  background-color: var(--nscale-border, #ced4da);
}

.base-date-range-picker__btn--apply {
  background-color: var(--nscale-primary, #0078d4);
  color: white;
  border: 1px solid var(--nscale-primary, #0078d4);
}

.base-date-range-picker__btn--apply:hover {
  background-color: var(--nscale-primary-dark, #106ebe);
}

@media (max-width: 768px) {
  .base-date-range-picker__dropdown {
    width: 100%;
    min-width: 300px;
    left: 50%;
    transform: translateX(-50%);
  }

  .base-date-range-picker__calendars {
    flex-direction: column;
  }
}

@media (max-width: 576px) {
  .base-date-range-picker__dropdown {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: calc(100% - 2rem);
    max-height: calc(100vh - 2rem);
    overflow-y: auto;
  }
}
</style>
