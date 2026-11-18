# Sourced by the other helpers. Everything lives under $VERIFY_HOME, never in the repo.
HELPERS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
REPO_ROOT="$(cd "$HELPERS_DIR/../../../.." && pwd)"
VERIFY_HOME="${VERIFY_HOME:-${TMPDIR:-/tmp}/verify-dashboard}"
VERIFY_HOME="${VERIFY_HOME%/}"
RUN_DIR="$VERIFY_HOME/run"
TOOLS_DIR="$VERIFY_HOME/tools"
EVIDENCE_DIR="${EVIDENCE_DIR:-$VERIFY_HOME/evidence}"
# Unusual port so a developer's own `npm run dev` (5173) is untouched.
FRONT_PORT="${FRONT_PORT:-15173}"
FRONT_URL="http://localhost:$FRONT_PORT"
# Base URL the app calls. MSW in the browser answers it; nothing may listen there, so a request
# MSW does not handle fails loudly instead of reaching a real backend.
MOCK_API_PORT="${MOCK_API_PORT:-18080}"
MOCK_API_URL="http://localhost:$MOCK_API_PORT"
