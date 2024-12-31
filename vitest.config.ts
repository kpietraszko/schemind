import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      reporter: ['json-summary','text']
    },
    typecheck: {
      include: ['**/*.{test,spec}.?(c|m)[jt]s?(x)']
    }
  }
});