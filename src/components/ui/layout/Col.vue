<template>
  <div class="n-col" :class="classes" :style="styles">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

// Grid column sizes
type ColSize = number | "auto" | boolean;

// Responsive breakpoints
type Breakpoints = {
  xs?: ColSize;
  sm?: ColSize;
  md?: ColSize;
  lg?: ColSize;
  xl?: ColSize;
  xxl?: ColSize;
};

/**
 * Column component for grid layout
 * @displayName Col
 * @example
 * <Col :xs="12" :md="6" :lg="4">Column content</Col>
 */
export interface ColProps extends Breakpoints {
  /** Column size (1-12 or auto) */
  span?: ColSize;
  /** Column offset (1-11) */
  offset?: number;
  /** Order (1-12) */
  order?: number;
  /** Align self (start, center, end, stretch) */
  align?: "start" | "center" | "end" | "stretch" | "baseline";
  /** Number of grid columns to span (for grid layout) */
  gridSpan?: number;
}

const props = withDefaults(defineProps<ColProps>(), {
  span: true,
  align: "stretch",
});

// Dictionary to map breakpoint props to CSS class prefixes
const bpPrefix: Record<string, string> = {
  xs: "xs",
  sm: "sm",
  md: "md",
  lg: "lg",
  xl: "xl",
  xxl: "xxl",
};

// Generate classes for columns
const classes = computed(() => {
  const classes: string[] = [];

  // Base col class for flex behavior
  classes.push("n-col");

  // Handle default span if provided
  if (typeof props.span === "number") {
    classes.push(`n-col-${props.span}`);
  } else if (props.span === "auto") {
    classes.push("n-col-auto");
  }

  // Handle offset
  if (props.offset) {
    classes.push(`n-col-offset-${props.offset}`);
  }

  // Handle order
  if (props.order) {
    classes.push(`n-col-order-${props.order}`);
  }

  // Handle responsive breakpoints
  Object.keys(bpPrefix).forEach((bp) => {
    const key = bp as keyof Breakpoints;
    const value = props[key];

    if (value !== undefined) {
      if (typeof value === "number") {
        classes.push(`n-col-${bpPrefix[bp]}-${value}`);
      } else if (value === "auto") {
        classes.push(`n-col-${bpPrefix[bp]}-auto`);
      } else if (value === true) {
        classes.push(`n-col-${bpPrefix[bp]}`);
      }
    }
  });

  // Handle self-alignment
  if (props.align) {
    classes.push(`n-col-align-${props.align}`);
  }

  return classes;
});

// Add grid-specific styles when gridSpan is provided
const styles = computed(() => {
  if (props.gridSpan) {
    return {
      "grid-column": `span ${props.gridSpan} / span ${props.gridSpan}`,
    };
  }
  return {};
});
</script>

<style>
.n-col {
  position: relative;
  width: 100%;
  min-height: 1px;
  box-sizing: border-box;
  flex-basis: 0;
  flex-grow: 1;
  max-width: 100%;
}

/* Base column sizes */
.n-col-auto {
  flex: 0 0 auto;
  width: auto;
  max-width: none;
}

.n-col-1 {
  flex: 0 0 8.333333%;
  max-width: 8.333333%;
}
.n-col-2 {
  flex: 0 0 16.666667%;
  max-width: 16.666667%;
}
.n-col-3 {
  flex: 0 0 25%;
  max-width: 25%;
}
.n-col-4 {
  flex: 0 0 33.333333%;
  max-width: 33.333333%;
}
.n-col-5 {
  flex: 0 0 41.666667%;
  max-width: 41.666667%;
}
.n-col-6 {
  flex: 0 0 50%;
  max-width: 50%;
}
.n-col-7 {
  flex: 0 0 58.333333%;
  max-width: 58.333333%;
}
.n-col-8 {
  flex: 0 0 66.666667%;
  max-width: 66.666667%;
}
.n-col-9 {
  flex: 0 0 75%;
  max-width: 75%;
}
.n-col-10 {
  flex: 0 0 83.333333%;
  max-width: 83.333333%;
}
.n-col-11 {
  flex: 0 0 91.666667%;
  max-width: 91.666667%;
}
.n-col-12 {
  flex: 0 0 100%;
  max-width: 100%;
}

/* Column offsets */
.n-col-offset-1 {
  margin-left: 8.333333%;
}
.n-col-offset-2 {
  margin-left: 16.666667%;
}
.n-col-offset-3 {
  margin-left: 25%;
}
.n-col-offset-4 {
  margin-left: 33.333333%;
}
.n-col-offset-5 {
  margin-left: 41.666667%;
}
.n-col-offset-6 {
  margin-left: 50%;
}
.n-col-offset-7 {
  margin-left: 58.333333%;
}
.n-col-offset-8 {
  margin-left: 66.666667%;
}
.n-col-offset-9 {
  margin-left: 75%;
}
.n-col-offset-10 {
  margin-left: 83.333333%;
}
.n-col-offset-11 {
  margin-left: 91.666667%;
}

/* Column order */
.n-col-order-first {
  order: -1;
}
.n-col-order-last {
  order: 13;
}
.n-col-order-0 {
  order: 0;
}
.n-col-order-1 {
  order: 1;
}
.n-col-order-2 {
  order: 2;
}
.n-col-order-3 {
  order: 3;
}
.n-col-order-4 {
  order: 4;
}
.n-col-order-5 {
  order: 5;
}
.n-col-order-6 {
  order: 6;
}
.n-col-order-7 {
  order: 7;
}
.n-col-order-8 {
  order: 8;
}
.n-col-order-9 {
  order: 9;
}
.n-col-order-10 {
  order: 10;
}
.n-col-order-11 {
  order: 11;
}
.n-col-order-12 {
  order: 12;
}

/* Column alignment */
.n-col-align-start {
  align-self: flex-start;
}
.n-col-align-center {
  align-self: center;
}
.n-col-align-end {
  align-self: flex-end;
}
.n-col-align-stretch {
  align-self: stretch;
}
.n-col-align-baseline {
  align-self: baseline;
}

/* Responsive breakpoints */
@media (min-width: 576px) {
  .n-col-sm {
    flex-basis: 0;
    flex-grow: 1;
    max-width: 100%;
  }
  .n-col-sm-auto {
    flex: 0 0 auto;
    width: auto;
    max-width: none;
  }
  .n-col-sm-1 {
    flex: 0 0 8.333333%;
    max-width: 8.333333%;
  }
  .n-col-sm-2 {
    flex: 0 0 16.666667%;
    max-width: 16.666667%;
  }
  .n-col-sm-3 {
    flex: 0 0 25%;
    max-width: 25%;
  }
  .n-col-sm-4 {
    flex: 0 0 33.333333%;
    max-width: 33.333333%;
  }
  .n-col-sm-5 {
    flex: 0 0 41.666667%;
    max-width: 41.666667%;
  }
  .n-col-sm-6 {
    flex: 0 0 50%;
    max-width: 50%;
  }
  .n-col-sm-7 {
    flex: 0 0 58.333333%;
    max-width: 58.333333%;
  }
  .n-col-sm-8 {
    flex: 0 0 66.666667%;
    max-width: 66.666667%;
  }
  .n-col-sm-9 {
    flex: 0 0 75%;
    max-width: 75%;
  }
  .n-col-sm-10 {
    flex: 0 0 83.333333%;
    max-width: 83.333333%;
  }
  .n-col-sm-11 {
    flex: 0 0 91.666667%;
    max-width: 91.666667%;
  }
  .n-col-sm-12 {
    flex: 0 0 100%;
    max-width: 100%;
  }
}

@media (min-width: 768px) {
  .n-col-md {
    flex-basis: 0;
    flex-grow: 1;
    max-width: 100%;
  }
  .n-col-md-auto {
    flex: 0 0 auto;
    width: auto;
    max-width: none;
  }
  .n-col-md-1 {
    flex: 0 0 8.333333%;
    max-width: 8.333333%;
  }
  .n-col-md-2 {
    flex: 0 0 16.666667%;
    max-width: 16.666667%;
  }
  .n-col-md-3 {
    flex: 0 0 25%;
    max-width: 25%;
  }
  .n-col-md-4 {
    flex: 0 0 33.333333%;
    max-width: 33.333333%;
  }
  .n-col-md-5 {
    flex: 0 0 41.666667%;
    max-width: 41.666667%;
  }
  .n-col-md-6 {
    flex: 0 0 50%;
    max-width: 50%;
  }
  .n-col-md-7 {
    flex: 0 0 58.333333%;
    max-width: 58.333333%;
  }
  .n-col-md-8 {
    flex: 0 0 66.666667%;
    max-width: 66.666667%;
  }
  .n-col-md-9 {
    flex: 0 0 75%;
    max-width: 75%;
  }
  .n-col-md-10 {
    flex: 0 0 83.333333%;
    max-width: 83.333333%;
  }
  .n-col-md-11 {
    flex: 0 0 91.666667%;
    max-width: 91.666667%;
  }
  .n-col-md-12 {
    flex: 0 0 100%;
    max-width: 100%;
  }
}

@media (min-width: 992px) {
  .n-col-lg {
    flex-basis: 0;
    flex-grow: 1;
    max-width: 100%;
  }
  .n-col-lg-auto {
    flex: 0 0 auto;
    width: auto;
    max-width: none;
  }
  .n-col-lg-1 {
    flex: 0 0 8.333333%;
    max-width: 8.333333%;
  }
  .n-col-lg-2 {
    flex: 0 0 16.666667%;
    max-width: 16.666667%;
  }
  .n-col-lg-3 {
    flex: 0 0 25%;
    max-width: 25%;
  }
  .n-col-lg-4 {
    flex: 0 0 33.333333%;
    max-width: 33.333333%;
  }
  .n-col-lg-5 {
    flex: 0 0 41.666667%;
    max-width: 41.666667%;
  }
  .n-col-lg-6 {
    flex: 0 0 50%;
    max-width: 50%;
  }
  .n-col-lg-7 {
    flex: 0 0 58.333333%;
    max-width: 58.333333%;
  }
  .n-col-lg-8 {
    flex: 0 0 66.666667%;
    max-width: 66.666667%;
  }
  .n-col-lg-9 {
    flex: 0 0 75%;
    max-width: 75%;
  }
  .n-col-lg-10 {
    flex: 0 0 83.333333%;
    max-width: 83.333333%;
  }
  .n-col-lg-11 {
    flex: 0 0 91.666667%;
    max-width: 91.666667%;
  }
  .n-col-lg-12 {
    flex: 0 0 100%;
    max-width: 100%;
  }
}

@media (min-width: 1200px) {
  .n-col-xl {
    flex-basis: 0;
    flex-grow: 1;
    max-width: 100%;
  }
  .n-col-xl-auto {
    flex: 0 0 auto;
    width: auto;
    max-width: none;
  }
  .n-col-xl-1 {
    flex: 0 0 8.333333%;
    max-width: 8.333333%;
  }
  .n-col-xl-2 {
    flex: 0 0 16.666667%;
    max-width: 16.666667%;
  }
  .n-col-xl-3 {
    flex: 0 0 25%;
    max-width: 25%;
  }
  .n-col-xl-4 {
    flex: 0 0 33.333333%;
    max-width: 33.333333%;
  }
  .n-col-xl-5 {
    flex: 0 0 41.666667%;
    max-width: 41.666667%;
  }
  .n-col-xl-6 {
    flex: 0 0 50%;
    max-width: 50%;
  }
  .n-col-xl-7 {
    flex: 0 0 58.333333%;
    max-width: 58.333333%;
  }
  .n-col-xl-8 {
    flex: 0 0 66.666667%;
    max-width: 66.666667%;
  }
  .n-col-xl-9 {
    flex: 0 0 75%;
    max-width: 75%;
  }
  .n-col-xl-10 {
    flex: 0 0 83.333333%;
    max-width: 83.333333%;
  }
  .n-col-xl-11 {
    flex: 0 0 91.666667%;
    max-width: 91.666667%;
  }
  .n-col-xl-12 {
    flex: 0 0 100%;
    max-width: 100%;
  }
}

@media (min-width: 1400px) {
  .n-col-xxl {
    flex-basis: 0;
    flex-grow: 1;
    max-width: 100%;
  }
  .n-col-xxl-auto {
    flex: 0 0 auto;
    width: auto;
    max-width: none;
  }
  .n-col-xxl-1 {
    flex: 0 0 8.333333%;
    max-width: 8.333333%;
  }
  .n-col-xxl-2 {
    flex: 0 0 16.666667%;
    max-width: 16.666667%;
  }
  .n-col-xxl-3 {
    flex: 0 0 25%;
    max-width: 25%;
  }
  .n-col-xxl-4 {
    flex: 0 0 33.333333%;
    max-width: 33.333333%;
  }
  .n-col-xxl-5 {
    flex: 0 0 41.666667%;
    max-width: 41.666667%;
  }
  .n-col-xxl-6 {
    flex: 0 0 50%;
    max-width: 50%;
  }
  .n-col-xxl-7 {
    flex: 0 0 58.333333%;
    max-width: 58.333333%;
  }
  .n-col-xxl-8 {
    flex: 0 0 66.666667%;
    max-width: 66.666667%;
  }
  .n-col-xxl-9 {
    flex: 0 0 75%;
    max-width: 75%;
  }
  .n-col-xxl-10 {
    flex: 0 0 83.333333%;
    max-width: 83.333333%;
  }
  .n-col-xxl-11 {
    flex: 0 0 91.666667%;
    max-width: 91.666667%;
  }
  .n-col-xxl-12 {
    flex: 0 0 100%;
    max-width: 100%;
  }
}
</style>
