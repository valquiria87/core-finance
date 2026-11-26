const { readdirSync } = require('node:fs')
const { join } = require('node:path')
const { spawnSync } = require('node:child_process')

const testDirectory = join(__dirname, '..', 'tests')
const testFiles = readdirSync(testDirectory)
  .filter((file) => file.endsWith('.test.js'))
  .sort()

if (testFiles.length === 0) {
  console.error('No test files found.')
  process.exit(1)
}

for (const file of testFiles) {
  console.log(`\n=== ${file} ===`)
  const result = spawnSync(
    process.execPath,
    [join(testDirectory, file)],
    { stdio: 'inherit' },
  )

  if (result.error) {
    console.error(`Could not run ${file}:`, result.error.message)
    process.exit(1)
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

console.log(`\nAll ${testFiles.length} test files passed.`)
