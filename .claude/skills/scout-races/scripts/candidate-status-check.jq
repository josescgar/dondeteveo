# Key of the latest scout-races status comment on a candidate's tracking issue.
# Input: gh issue view <n> --json comments
# Usage: jq -r --arg slug <slug> --arg year <year> -f candidate-status-check.jq issue.json
# Prints the key (for example date=2026-12-13;start=09:00;distance=21.097;track=none),
# or null when no status comment for this edition exists. Only comments from the
# repository's owner, members or collaborators count, so nobody else can silence it.
("<!-- scout-races: " + $slug + "/" + $year + "/candidate-status key=") as $prefix
| [ .comments[]?
    | select(.authorAssociation == "OWNER"
             or .authorAssociation == "MEMBER"
             or .authorAssociation == "COLLABORATOR")
    | (.body // "")
    | select(contains($prefix))
    | (split($prefix)[1] | split(" -->")[0])
  ]
| last
