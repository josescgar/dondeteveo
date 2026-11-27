# Open issues that already cover a scout issue (scout-races duplicate check).
# Input: gh issue list --json number,title,body
# Usage: jq --arg slug <slug> --arg year <year> --arg kind <kind> -f open-issue-check.jq open-issues.json
#   kind: route-file | course-update | needs-person | add-race (use --arg year "" for add-race)
# Matches the hidden marker for this exact kind; issues without any scout marker
# match on the slug (add-race) or on the slug plus year in the title (other kinds).
def word($s): "(^|[^a-z0-9-])" + $s + "([^a-z0-9-]|$)";
(if $kind == "add-race" then "scout-races: " + $slug + "/add-race"
 else "scout-races: " + $slug + "/" + $year + "/" + $kind end) as $key
| [ .[]
    | (.body // "") as $body
    | select(
        ($body | contains($key))
        or (($body | contains("scout-races:")) | not)
           and (if $kind == "add-race"
                then ((.title + " " + $body) | test(word($slug)))
                else ((.title | test(word($slug))) and (.title | contains($year)))
                end)
      )
    | {number, title}
  ]
