<template>
  <div class="n-row" :class="classes" :style="styles">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

type Alignment = "start" | "center" | "end" | "baseline" | "stretch";
type Distribution =
  | "start"
  | "center"
  | "end"
  | "between"
  | "around"
  | "evenly";
type Gap = "none" | "xs" | "sm" | "md" | "lg" | "xl";

/**
 * Row component for flexbox grid layout
 * @displayName Row
 * @example
 * <Row align="center" justify="between" gap="md">
 *   <Col :sm="6" :md="4">Column 1</Col>
 *   <Col :sm="6" :md="4">Column 2</Col>
 * </Row>
 */
export interface RowProps {
  /** Vertical alignment of items */
  align?: Alignment;
  /** Horizontal distribution of items */
  justify?: Distribution;
  /** Gap between items */
  gap?: Gap | [Gap, Gap]; // [horizontal, vertical]
  /** Whether to wrap items to multiple lines */
  wrap?: boolean;
  /** Whether to use reverse direction */
  reverse?: boolean;
  /** CSS grid-specific - number of columns */
  cols?: number;
  /** Whether to use CSS grid instead of flexbox */
  grid?: boolean;
}

const props = withDefaults(defineProps<RowProps>(), {
  align: "start",
  justify: "start",
  gap: "md",
  wrap: true,
  reverse: false,
  cols: 12,
  grid: false,
});

// Convert alignment values to CSS class names
const getAlignClass = (align: Alignment) => {
  const map: Record<Alignment, string> = {
    start: "flex-start",
    center: "center",
    end: "flex-end",
    baseline: "baseline",
    stretch: "stretch",
  };
  return map[align];
};

// Convert distribution values to CSS class names
const getJustifyClass = (justify: Distribution) => {
  const map: Record<Distribution, string> = {
    start: "flex-start",
    center: "center",
    end: "flex-end",
    between: "space-between",
    around: "space-around",
    evenly: "space-evenly",
  };
  return map[justify];
};

// Generate gap CSS variable value
const getGapValue = (gap: Gap) => {
  const map: Record<Gap, string> = {
    none: "0",
    xs: "var(--nscale-space-1, 0.25rem)",
    sm: "var(--nscale-space-2, 0.5rem)",
    md: "var(--nscale-space-4, 1rem)",
    lg: "var(--nscale-space-6, 1.5rem)",
    xl: "var(--nscale-space-8, 2rem)",
  };
  return map[gap];
};

// Compute classes for the row
const classes = computed(() => {
  return [
    props.grid ? "n-row--grid" : "n-row--flex",
    !props.wrap && "n-row--nowrap",
    props.reverse && "n-row--reverse",
  ];
});

// Compute dynamic styles
const styles = computed(() => {
  const alignItems = getAlignClass(props.align);
  const justifyContent = getJustifyClass(props.justify);

  let rowGap: string, columnGap: string;

  if (Array.isArray(props.gap) && props.gap.length === 2) {
    // [horizontal, vertical] format
    columnGap = getGapValue(props.gap[0]);
    rowGap = getGapValue(props.gap[1]);
  } else {
    // Single value for both
    const gapValue = getGapValue(props.gap as Gap);
    columnGap = rowGap = gapValue;
  }

  const styles: Record<string, string> = {
    "--n-row-gap": rowGap,
    "--n-column-gap": columnGap,
  };

  if (props.grid) {
    styles["--n-grid-cols"] = String(props.cols);
  } else {
    styles["align-items"] = alignItems;
    styles["justify-content"] = justifyContent;
  }

  return styles;
});
</script>

<style>
.n-row {
  box-sizing: border-box;
  display: flex;
  width: 100%;
}

.n-row--flex {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  row-gap: var(--n-row-gap);
  column-gap: var(--n-column-gap);
}

.n-row--grid {
  display: grid;
  grid-template-columns: repeat(var(--n-grid-cols, 12), 1fr);
  gap: var(--n-row-gap) var(--n-column-gap);
}

.n-row--nowrap {
  flex-wrap: nowrap;
}

.n-row--reverse {
  flex-direction: row-reverse;
}
</style>
