"""Draw the measured case-1 timing example from the independent reference."""
import argparse, json, pathlib, re
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

p=argparse.ArgumentParser();p.add_argument("--results",type=pathlib.Path,required=True);p.add_argument("--output-dir",type=pathlib.Path);args=p.parse_args()
data=json.loads(args.results.read_text(encoding="utf-8"));case=data["cases"][0]
raw=(args.results.parent/"inputs"/(case["id"]+".txt")).read_text()
vector=lambda name:list(map(float,re.search(r"\b"+name+r"\s*:\s*\[([^]]+)\]",raw).group(1).split()))
early,late=vector("e"),vector("l");destination=case["nodes_including_depot"]-len(early)
event=next(e for route in case["reference"]["routes"] for e in route if e["customer"]==2 and e["kind"]=="D")
a,end=event["arrival"],event["departure"];lo,hi=early[event["node"]-destination],late[event["node"]-destination]
assert lo<=a<=hi<end
plt.rcParams.update({"font.family":"DejaVu Sans","font.size":11,"svg.hashsalt":"drt-arrival-example"})
fig,ax=plt.subplots(figsize=(10,3.2),facecolor="#f4f1ea");ax.set_facecolor("#f4f1ea")
ax.barh(1,hi-lo,left=lo,height=.28,color="#d7e3d0")
ax.barh(0,end-a,left=a,height=.20,color="#284cf0")
ax.axvline(hi,color="#62645c",ls="--",lw=1)
ax.scatter([a],[0],s=85,color="#284cf0",zorder=4)
ax.scatter([end],[0],s=90,marker="x",color="#ae513d",zorder=4)
ax.text(lo,1.25,f"Destination time window [{lo:g}, {hi:g}]",color="#35442d",ha="left")
ax.annotate(f"Arrival {a:g}",xy=(a,0),xytext=(a-2,-.55),arrowprops={"arrowstyle":"-","color":"#284cf0"},ha="center",color="#284cf0")
ax.annotate(f"Service ends {end:g}",xy=(end,0),xytext=(end+1,-.55),arrowprops={"arrowstyle":"-","color":"#ae513d"},ha="center",color="#ae513d")
ax.text(a+.2,.25,f"Service time {end-a:g}",color="#34382f")
ax.set_yticks([1,0],["Time window","Arrival + service"])
ax.set_xlim(0,end+5);ax.set_ylim(-.85,1.8);ax.set_xlabel("Input time units")
ax.set_title("Case 1: destination arrival and service completion",loc="left",fontweight="bold",pad=20)
for side in ("top","right","left"):ax.spines[side].set_visible(False)
ax.spines["bottom"].set_color("#9a998e");ax.tick_params(axis="y",length=0);ax.grid(axis="x",alpha=.14)
target=args.output_dir or args.results.parent;target.mkdir(parents=True,exist_ok=True)
fig.tight_layout();fig.savefig(target/"time-window.svg",metadata={"Date":None});fig.savefig(target/"time-window.png",dpi=150);plt.close(fig)
svg=target/"time-window.svg"
svg.write_text("\n".join(line.rstrip() for line in svg.read_text(encoding="utf-8").splitlines())+"\n",encoding="utf-8",newline="\n")
