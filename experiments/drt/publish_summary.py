"""Publish numerical results only; never copy source inputs, routes or text logs."""
import argparse
import hashlib
import json
import pathlib


def public_summary(data, raw_hash):
    result = {key: data[key] for key in ("experiment_date", "archive_sha256", "source_sha256",
              "seeds", "iterations", "environment", "fleet", "cost_unit", "time_unit", "change", "excluded")}
    result.update(visibility="numeric_summary_only", private_measurement_sha256=raw_hash, cases=[])
    for entry in data["cases"]:
        case = {key: entry[key] for key in ("id", "input_sha256", "nodes_including_depot",
                 "demand_groups", "passengers", "Q", "U", "summary")}
        case["reference"] = {key: entry["reference"][key] for key in ("objective", "examined_route_orders", "scope")}
        case["runs"] = []
        for run in entry["runs"]:
            trial = {key: run[key] for key in ("seed", "variant", "initial_seconds", "total_seconds")}
            for stage in ("initial", "final"):
                value = run[stage]
                trial[stage] = {key: value[key] for key in ("feasible", "missing_passengers", "served_passengers", "objective")}
                trial[stage].update(issue_count=len(value["issues"]), unassigned_groups=len(value["missing_groups"]))
            case["runs"].append(trial)
        result["cases"].append(case)
    text = json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False)+"\n"
    for forbidden in ('"routes"', '"events"', '"logs"', '"inputs"', '"c_vhl"', '"c_user"', '"delta"'):
        if forbidden in text:
            raise ValueError("Private measurement field in public summary")
    return text


if __name__ == "__main__":
    p=argparse.ArgumentParser();p.add_argument("--results",type=pathlib.Path,required=True);p.add_argument("--output",type=pathlib.Path,required=True);args=p.parse_args()
    raw=args.results.read_bytes()
    text=public_summary(json.loads(raw),hashlib.sha256(raw).hexdigest())
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(text,encoding="utf-8")
