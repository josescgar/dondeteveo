# Closed or merged scout items for the same proposal (scout-races prior-item check).
# Input: gh pr list --state closed (or merged) / gh issue list --state closed, with
#        --json number,state,title,body (and headRefName for PRs)
# Usage: jq --arg slug <slug> --arg year <year> --arg kind <kind> -f prior-check.jq closed.json
#   kind: edition | route-file | cheer-points | needs-person | add-race (year "" for add-race)
# Prints each match with the `key=` value from its marker (null for items opened
# before markers carried keys; read their body to compare).
(if $kind == "add-race" then "scout-races: " + $slug + "/add-race"
 else "scout-races: " + $slug + "/" + $year + "/" + $kind end) as $prefix
| [ .[]
    | (.body // "") as $body
    | select(
        ($body | contains($prefix + " ") or contains($prefix + " -->"))
        or ($kind == "edition"
            and ((.headRefName // "") | test("^(feature|fix)/scout-" + $slug + "-" + $year + "(-[0-9]{8})?$")))
      )
    | {
        number,
        state,
        key: ([$body | scan("<!-- " + $prefix + " key=([^ ]+) -->")] | first | first)
      }
  ]
