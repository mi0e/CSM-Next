import { cp, mkdir, readFile, readdir, rm } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Publish the theme-store build to the `theme-dist` branch.
 *
 * The upstream theme store pulls raw files from a GitHub ref, so the branch
 * contains ONLY the built artifacts the store convention allows:
 * index.html + assets/. Push manually after reviewing the commit:
 *
 *   git push origin theme-dist
 *
 * Users then point the upstream admin at:
 *   https://github.com/<owner>/CSM-Next/tree/theme-dist
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const worktree = join(root, '.theme-dist-worktree')
const BRANCH = 'theme-dist'

const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
const gitWorktree = (...args) => execFileSync('git', args, { cwd: worktree, encoding: 'utf8' }).trim()

// 1. Pristine build (ignores config.local.json).
process.env.THEME_RELEASE = '1'
await import(`./build.mjs?release=${Date.now()}`)

// 2. Prepare the worktree for the theme-dist branch.
await rm(worktree, { recursive: true, force: true })
try { git('worktree', 'prune') } catch { /* noop */ }

const branchExists = (() => {
  try { git('rev-parse', '--verify', `refs/heads/${BRANCH}`); return true } catch { return false }
})()

if (branchExists) {
  git('worktree', 'add', worktree, BRANCH)
} else {
  git('worktree', 'add', '--detach', worktree)
  gitWorktree('checkout', '--orphan', BRANCH)
  gitWorktree('rm', '-rf', '--ignore-unmatch', '.')
}

// 3. Replace branch contents with index.html + assets/ only.
for (const entry of await readdir(worktree)) {
  if (entry === '.git') continue
  await rm(join(worktree, entry), { recursive: true, force: true })
}
await cp(join(dist, 'index.html'), join(worktree, 'index.html'))
await mkdir(join(worktree, 'assets'), { recursive: true })
await cp(join(dist, 'assets'), join(worktree, 'assets'), { recursive: true })

// 4. Commit when something changed.
gitWorktree('add', '-A')
const dirty = gitWorktree('status', '--porcelain')
if (!dirty) {
  console.log('theme-dist: no changes to publish')
} else {
  const { version } = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
  const sourceCommit = git('rev-parse', '--short', 'HEAD')
  gitWorktree('commit', '-m', `release: theme-store build v${version} (source ${sourceCommit})`)
  console.log(`theme-dist: committed v${version} (source ${sourceCommit})`)
  console.log('Review with: git log theme-dist --oneline | head -3')
  console.log('Publish with: git push origin theme-dist')
}

// 5. Clean up the worktree; the branch keeps the commit.
git('worktree', 'remove', '--force', worktree)
console.log('Done.')
