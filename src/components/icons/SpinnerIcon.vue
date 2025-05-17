<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="100%"
    height="100%"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="n-spinner"
  >
    <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
    <path class="n-spinner__path" d="M12 2a10 10 0 0 1 10 10"></path>
  </svg>
</template>

<style scoped>
.n-spinner {
  animation: n-spinner-rotate 1.5s linear infinite;
}

.n-spinner__path {
  stroke-linecap: round;
}

@keyframes n-spinner-rotate {
  100% {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .n-spinner {
    animation-duration: 10s;
  }
}
</style>
