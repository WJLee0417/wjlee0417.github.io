"""Re-run the supplied Python snapshot; keep the archive and algorithm unchanged.

Only the optional visualization import is omitted in the headless loader.
The follow-up variant replaces compute_route_time to check destination *arrival*
against e/l, as the supplied Mosel a(d,v) constraints do.
"""
from __future__ import annotations
import argparse
import ast
import contextlib
import copy
import hashlib
import io
import itertools
import json
import math
import pathlib
import platform
import random
import statistics
import sys
import time
import types
import zipfile

import numpy as np

ARCHIVE_SHA = "0b2fbf7b23968915e515868d38a9696508a40196dc8aa071b0372df63fef10dd"
SOURCE_SHA = "1914e9effdc005786fc92d809e76e08828fa7c3c419de9cfc375202124edb4a7"
SOURCE_ENTRY = "2025_DRT_ALNS/KakaoTalk_Longtxt_20250609_1023_24_964_Group.txt"
SEEDS = [0, 1, 2, 3, 42]
INPUTS = ["Project2_data1_v2.txt", "Project2_data2_v2.txt"]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def extract_source(archive):
    text = archive.read(SOURCE_ENTRY).decode("utf-8-sig").replace("\r", "")
    text = text[text.index("from __future__ import annotations"):]
    if sha(text.encode()) != SOURCE_SHA:
        raise ValueError("Unexpected Python snapshot; review before executing")
    return text


def load_snapshot(source):
    tree = ast.parse(source)
    tree.body = [n for n in tree.body if not (
        isinstance(n, ast.ImportFrom) and n.module == "visualization")]
    name = "archived_drt_snapshot"
    mod = types.ModuleType(name)
    sys.modules[name] = mod
    exec(compile(tree, "recovered_alns_20250609.py", "exec"), mod.__dict__)
    return mod


def arrival_time(params, route, debug=False):
    """Follow-up change: check time windows before destination service."""
    now, load, previous = 0.0, 0, 0
    arrivals = []
    for stop in route.stops:
        now += float(params.t[previous, stop.node])
        if not stop.is_pickup:
            k = stop.node - params.destination
            now = max(now, float(params.e[k]))
            if now > float(params.l[k]):
                return math.inf, []
        arrivals.append(now)
        now += float(params.s[stop.node])
        load += stop.cust.demand if stop.is_pickup else -stop.cust.demand
        if load < 0 or load > params.Q:
            return math.inf, []
        previous = stop.node
    return now + float(params.t[previous, 0]), arrivals


def canonical(customers):
    return {c.id: {"o": c.o, "d": c.d, "demand": c.demand} for c in customers}


def audit(params, solution, expected):
    """Independent audit using actual stop nodes, not source feasibility flags."""
    issues, pickups, drops, routes = [], {}, {}, []
    travel_cost = walk_cost = 0.0
    for route in solution.routes:
        now, load, previous = 0.0, 0, 0
        onboard, events = set(), []
        for stop in route.stops:
            cid, node = stop.cust.id, stop.node
            if cid not in expected or not 1 <= node <= params.N:
                issues.append("unknown customer/node")
                continue
            c = expected[cid]
            if (stop.cust.o, stop.cust.d, stop.cust.demand) != (c["o"], c["d"], c["demand"]):
                issues.append("customer identity changed")
            now += float(params.t[previous, node])
            travel_cost += float(params.c_vhl[previous, node])
            if stop.is_pickup:
                pickups.setdefault(cid, []).append(route.idx)
                onboard.add(cid)
                load += c["demand"]
                distance = float(params.c_user[c["o"]-1, node-1])
                walk_cost += distance
                if distance > params.U:
                    issues.append("walking limit")
                if stop.cust.p != node:
                    issues.append("boarding metadata differs from actual stop")
            else:
                drops.setdefault(cid, []).append(route.idx)
                if cid not in onboard or node != c["d"]:
                    issues.append("pickup/drop order or destination")
                onboard.discard(cid)
                load -= c["demand"]
                k = node-params.destination
                now = max(now, float(params.e[k]))
                if now > float(params.l[k]):
                    issues.append("destination arrival time window")
            if not 0 <= load <= params.Q:
                issues.append("vehicle capacity")
            arrival = now
            now += float(params.s[node])
            events.append({"customer": cid, "kind": "P" if stop.is_pickup else "D",
                           "node": node, "arrival": arrival, "departure": now, "load": load})
            previous = node
        if onboard or load:
            issues.append("unfinished route")
        if route.stops:
            travel_cost += float(params.c_vhl[previous, 0])
            routes.append({"vehicle": route.idx, "events": events,
                           "return_at": now + float(params.t[previous, 0])})
    missing = [cid for cid in expected if not pickups.get(cid)]
    for cid in expected:
        p, d = pickups.get(cid, []), drops.get(cid, [])
        if cid not in missing and (len(p) != 1 or len(d) != 1 or p != d):
            issues.append("duplicate/split customer service")
    if set(solution.unassigned) != set(missing):
        issues.append("unassigned flags differ from actual coverage")
    if len(solution.routes) > params.vehicle:
        issues.append("fleet limit")
    feasible = not issues and not missing
    cost = travel_cost + walk_cost
    if feasible and (not math.isfinite(solution.cost) or abs(cost-solution.cost) > 1e-8):
        issues.append("reported objective differs from independent objective")
        feasible = False
    return {"feasible": feasible, "issues": sorted(set(issues)), "missing_groups": missing,
            "missing_passengers": sum(expected[c]["demand"] for c in missing),
            "served_passengers": sum(c["demand"] for cid, c in expected.items() if cid not in missing),
            "objective": cost if feasible else None, "partial_route_cost": cost,
            "vehicle_cost": travel_cost, "walking_cost": walk_cost, "routes": routes}


def exact_reference(params, expected):
    """All boarding choices and pickup/drop orders for <=4 demand groups, <=2 vehicles.

    This is a reference for the Python stop-event model, NOT an Xpress solver run.
    """
    customers = list(expected)
    if len(customers) > 4 or params.vehicle != 2:
        raise ValueError("Exact reference restricted to tiny two-vehicle instances")
    best = {0: {"cost": 0.0, "events": []}}
    examined = 0
    for mask in range(1, 1 << len(customers)):
        group = [cid for i, cid in enumerate(customers) if mask >> i & 1]
        choices = [[p for p in range(1, params.N+1)
                    if params.c_user[expected[cid]["o"]-1, p-1] <= params.U] for cid in group]
        plan = {"cost": math.inf, "events": []}
        for combination in itertools.product(*choices):
            boarding = dict(zip(group, combination))
            for order in itertools.permutations([(cid, kind) for cid in group for kind in ("P", "D")]):
                examined += 1
                now, load, previous, cost = 0.0, 0, 0, 0.0
                picked, events, valid = set(), [], True
                for cid, kind in order:
                    c = expected[cid]
                    node = boarding[cid] if kind == "P" else c["d"]
                    if kind == "D" and cid not in picked:
                        valid = False
                        break
                    now += float(params.t[previous, node])
                    cost += float(params.c_vhl[previous, node])
                    if kind == "P":
                        picked.add(cid)
                        load += c["demand"]
                        cost += float(params.c_user[c["o"]-1, node-1])
                    else:
                        load -= c["demand"]
                        k = node-params.destination
                        now = max(now, float(params.e[k]))
                        if now > float(params.l[k]):
                            valid = False
                            break
                    if not 0 <= load <= params.Q:
                        valid = False
                        break
                    arrival = now
                    now += float(params.s[node])
                    events.append({"customer": cid, "kind": kind, "node": node,
                                   "arrival": arrival, "departure": now, "load": load})
                    previous = node
                if valid:
                    cost += float(params.c_vhl[previous, 0])
                    if cost < plan["cost"]:
                        plan = {"cost": cost, "events": events}
        best[mask] = plan
    full = (1 << len(customers))-1
    value, left, right = min((best[m]["cost"]+best[full ^ m]["cost"], m, full ^ m) for m in range(full+1))
    if not math.isfinite(value):
        raise ValueError("No feasible exact reference")
    return {"objective": value, "examined_route_orders": examined,
            "routes": [best[m]["events"] for m in (left, right) if m],
            "scope": "same Python stop-event model; exhaustive boarding/order/vehicle partition; not Xpress"}


def run_variant(source, path, seed, fixed, log_path):
    mod = load_snapshot(source)
    if fixed:
        mod.compute_route_time = arrival_time
    params, customers = mod.load_data(str(path), vehicle=2)
    expected = canonical(customers)
    captured, original = {}, mod.build_initial_solution
    def capture(*args, **kwargs):
        start = time.perf_counter()
        result = original(*args, **kwargs)
        captured.update(initial=copy.deepcopy(result), initial_seconds=time.perf_counter()-start)
        return result
    mod.build_initial_solution = capture
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        start = time.perf_counter()
        result = mod.alns(params, customers, seed=seed)
        elapsed = time.perf_counter()-start
    log_path.write_text(output.getvalue(), encoding="utf-8")
    return {"seed": seed, "variant": "arrival-fixed" if fixed else "archive-original",
            "initial_seconds": captured["initial_seconds"], "total_seconds": elapsed,
            "initial": audit(params, captured["initial"], expected),
            "final": audit(params, result, expected)}


def summarize(runs, stage, variant):
    selected = [r for r in runs if r["variant"] == variant]
    values = [r[stage]["objective"] for r in selected if r[stage]["feasible"]]
    times = [r["initial_seconds" if stage == "initial" else "total_seconds"] for r in selected]
    return {"variant": variant, "stage": stage, "runs": len(selected),
            "feasible_runs": len(values), "objective_mean": statistics.mean(values) if values else None,
            "objective_min": min(values) if values else None, "objective_max": max(values) if values else None,
            "unassigned_groups_min": min(len(r[stage]["missing_groups"]) for r in selected),
            "unassigned_groups_max": max(len(r[stage]["missing_groups"]) for r in selected),
            "served_passengers_min": min(r[stage]["served_passengers"] for r in selected),
            "served_passengers_max": max(r[stage]["served_passengers"] for r in selected),
            "seconds_mean": statistics.mean(times)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--archive", type=pathlib.Path, required=True)
    parser.add_argument("--output", type=pathlib.Path, required=True)
    parser.add_argument("--experiment-date", default="2026-11-07")
    args = parser.parse_args()
    if sha(args.archive.read_bytes()) != ARCHIVE_SHA:
        raise ValueError("Unexpected archive; review the supplied version before executing")
    args.output.mkdir(parents=True, exist_ok=True)
    logs = args.output/"logs"
    inputs = args.output/"inputs"
    logs.mkdir(exist_ok=True); inputs.mkdir(exist_ok=True)
    report = {"experiment_date": args.experiment_date, "archive_sha256": ARCHIVE_SHA,
              "source_sha256": SOURCE_SHA, "seeds": SEEDS, "iterations": 5000,
              "environment": {"python": platform.python_version(), "numpy": np.__version__,
                              "os": platform.system(), "release": platform.release(), "machine": platform.machine()},
              "fleet": 2, "cost_unit": "input cost units", "time_unit": "input time units",
              "change": "destination time-window check before service; other solver functions unchanged",
              "cases": [], "excluded": []}
    with zipfile.ZipFile(args.archive) as archive:
        source = extract_source(archive)
        for name in INPUTS:
            raw = archive.read("2025_DRT_ALNS/Xpress/"+name)
            path = inputs/name
            path.write_bytes(raw)
            mod = load_snapshot(source)
            params, customers = mod.load_data(str(path), vehicle=2)
            case = {"id": name.removesuffix(".txt"), "input_sha256": sha(raw),
                    "nodes_including_depot": params.N+1, "demand_groups": len(customers),
                    "passengers": sum(c.demand for c in customers), "Q": params.Q, "U": params.U,
                    "reference": exact_reference(params, canonical(customers)), "runs": []}
            for seed in SEEDS:
                for fixed in (False, True):
                    variant = "fixed" if fixed else "original"
                    run = run_variant(source, path, seed, fixed, logs/f"{case['id']}-{seed}-{variant}.txt")
                    if fixed and not run["final"]["feasible"]:
                        raise ValueError(f"Independent validation failed: {case['id']}/{seed}: {run['final']}")
                    case["runs"].append(run)
                print(f"{case['id']}: seed {seed} complete", flush=True)
            case["summary"] = [summarize(case["runs"], stage, variant) for variant, stage in (
                ("archive-original", "final"), ("arrival-fixed", "initial"), ("arrival-fixed", "final"))]
            for summary in case["summary"][1:]:
                summary["gap_to_reference_percent"] = 100*(summary["objective_mean"]/case["reference"]["objective"]-1)
            report["cases"].append(case)
        for name in ("Project2_largedata1.txt", "Project2_largedata2.txt"):
            raw = archive.read("2025_DRT_ALNS/"+name)
            if any(line.strip().startswith((b"Q:", b"U:", b"Q :", b"U :")) for line in raw.splitlines()):
                raise ValueError("Recheck the large-input exclusion")
            report["excluded"].append({"file": name, "sha256": sha(raw), "reason": "Q and U absent; original values unknown"})
    (args.output/"results.json").write_text(json.dumps(report, ensure_ascii=False, indent=2, allow_nan=False)+"\n", encoding="utf-8")
    for case in report["cases"]:
        print(case["id"], json.dumps(case["summary"], ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
