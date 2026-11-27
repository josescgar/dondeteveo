# Open PRs that already cover a race edition (scout-races duplicate check).
# Input: gh pr list --json number,title,headRefName,body,files
# Usage: jq --arg slug <slug> --arg cc <cc> -f open-pr-check.jq open-prs.json
# The scout watchlist PR is excluded: it only means the race is skipped in Phase 6.
def word($s): "(^|[^a-z0-9-])" + $s + "([^a-z0-9-]|$)";
[ .[]
  | select((.headRefName | startswith("chore/scout-watchlist-")) | not)
  | select(
      (.headRefName | test("^(feature|fix)/scout-" + $slug + "-[0-9]{4}(-[0-9]{8})?$"))
      or ((.body // "") | contains("scout-races: " + $slug + "/"))
      or any(.files[]?;
          (.path | startswith("data/" + $cc + "/" + $slug + "/"))
          or .path == ("watchlist/races/" + $slug + ".json"))
    )
  | {number, title, headRefName}
]
