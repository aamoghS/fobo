#!/usr/bin/env bash
# Merges origin/frontend into backend. Run hourly by the Windows scheduled task "fobo-pull-frontend":
#   schtasks /run /tn fobo-pull-frontend      (run it now)
#   schtasks /delete /tn fobo-pull-frontend   (stop it)
# The frontend owns everything outside server/, db/ and neon.ts, so a conflict there takes the frontend's
# side; a conflict in the backend stops and waits for a person. Uncommitted work is never touched: git
# refuses the merge if it would change a file you're editing. Nothing is pushed. Log: .git/pull-frontend.log
set -u
cd "$(dirname "$0")/.." || exit 1
LOG="$(git rev-parse --git-dir)/pull-frontend.log"
log() { echo "$(date '+%F %T') $*" >> "$LOG"; }
export GIT_MERGE_AUTOEDIT=no GIT_EDITOR=true

[ "$(git branch --show-current)" = backend ] || { log "skip: not on backend"; exit 0; }
[ -e "$(git rev-parse --git-dir)/MERGE_HEAD" ] && { log "skip: a merge is already in progress"; exit 0; }
git diff --cached --quiet || { log "skip: staged changes"; exit 0; }

git fetch -q origin || { log "fail: fetch"; exit 1; }
# Keep the local frontend branch in step too (fast-forward only).
git fetch -q . origin/frontend:frontend 2>/dev/null || true
git merge-base --is-ancestor origin/frontend HEAD && { log "up to date"; exit 0; }

# Try the merge in memory first, so a backend conflict never reaches the working tree.
conflicts=$(git merge-tree --write-tree --name-only --no-messages HEAD origin/frontend | tail -n +2)
backend=$(printf '%s\n' "$conflicts" | grep -E '^(server/|db/|neon\.ts$)')
[ -n "$backend" ] && { log "skip: backend conflicts, merge by hand: $(echo $backend)"; exit 0; }

out=$(git merge --no-ff origin/frontend 2>&1)
if [ -e "$(git rev-parse --git-dir)/MERGE_HEAD" ]; then
  git diff --name-only --diff-filter=U | while IFS= read -r f; do
    if git cat-file -e "origin/frontend:$f" 2>/dev/null; then git checkout --theirs -- "$f" && git add -- "$f"
    else git rm -q -- "$f"; fi
  done
  if git diff --name-only --diff-filter=U | grep -q . || ! git commit -q --no-edit; then
    git merge --abort; log "fail: could not finish merge, aborted"; exit 1
  fi
  log "merged $(git rev-parse --short origin/frontend), frontend side taken in: $(echo $conflicts)"
elif git merge-base --is-ancestor origin/frontend HEAD; then
  log "merged $(git rev-parse --short origin/frontend)"
else
  log "skip: $(echo "$out" | grep -v '^warning:' | head -3 | tr '\n' ' ')"
fi
