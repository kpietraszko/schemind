import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      reporter: ['json-summary','text'],
      include: ['src/**.{js,jsx,ts,tsx}']
    },
    typecheck: {
      include: ['**/*.{test,spec}.?(c|m)[jt]s?(x)']
    }
  }
});