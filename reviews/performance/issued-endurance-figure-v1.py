"""Plot immutable measurements with Matplotlib; no gameplay capture or new character art."""
from pathlib import Path
import hashlib,io,json,math,sys
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.ticker import NullFormatter

r=Path(sys.argv[1]).resolve()if len(sys.argv)>1 else Path(__file__).resolve().parents[1]
raw_path=r/'reviews/performance/endurance-50-moths-20261024-2.json'
raw=json.loads(raw_path.read_text(encoding='utf-8'));m=raw['measurement'];sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(raw_path)=='e0569da31afbfbbda7834c9b8b1a89efc95ddfeffed79fea6e7bca192d92856d'and raw['passed']
ticks=np.array(m['tickSamplesMs']);assert len(ticks)==108001 and np.all(np.isfinite(ticks))and np.all(ticks>=0)
ordered=np.sort(ticks);assert abs(ordered[math.floor(len(ticks)*.99)]-m['tickP99Ms'])<1e-9
assert np.count_nonzero(ticks>1000/30)==m['overBudgetTicks']==236
bins=[ticks[i:i+1800]for i in range(0,len(ticks)-1,1800)]
q=lambda values,f:float(np.sort(values)[min(len(values)-1,math.floor(len(values)*f))])
bg='#172b29';fg='#e8dfc4';muted='#b3c6b5';mint='#9de3ce';gold='#dfbb6a';coral='#ef927c';grid='#365449'
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10,'text.color':fg,'axes.labelcolor':fg,'xtick.color':muted,'ytick.color':muted,'axes.edgecolor':grid,'axes.facecolor':bg,'figure.facecolor':bg,'savefig.facecolor':bg})
fig,axes=plt.subplots(1,2,figsize=(10.5,6.5),dpi=120)
fig.subplots_adjust(left=.075,right=.975,top=.79,bottom=.30,wspace=.30)
x=np.arange(len(bins))+.5
ax=axes[0];ax.plot(x,[q(b,.5)for b in bins],color=mint,lw=1.8,label='Median')
ax.plot(x,[q(b,.99)for b in bins],color=gold,lw=2,label='p99')
ax.plot(x,[float(b.max())for b in bins],color=muted,lw=1,alpha=.65,label='Worst tick')
ax.axhline(25,color=coral,ls='--',lw=1.5,label='25 ms p99 target')
ax.set_yscale('log');ax.set_ylim(1,150);ax.set_yticks([1,2,5,10,25,50,100]);ax.set_yticklabels(['1','2','5','10','25','50','100']);ax.yaxis.set_minor_formatter(NullFormatter())
ax.set_title('Simulation tick work',loc='left',color=fg,pad=14,fontweight='bold');ax.set_ylabel('Milliseconds · logarithmic scale');ax.legend(loc='upper left',fontsize=8,frameon=False,labelcolor=fg)
ax=axes[1];server=m['memory'];client=raw['clientProgress']
ax.plot([a['elapsedSeconds']/60 for a in server],[a['heapUsed']/1048576 for a in server],color=mint,lw=1.5,label='Server process')
ax.plot([a['elapsedSeconds']/60 for a in client],[a['clientMemory']['heapUsed']/1048576 for a in client],color=gold,lw=1.3,label='Parent: 50 SDK clients')
ax.set_ylim(0,300);ax.set_title('Heap observed without forced GC',loc='left',color=fg,pad=14,fontweight='bold');ax.set_ylabel('MiB');ax.legend(loc='upper left',fontsize=8,frameon=False,labelcolor=fg)
for ax in axes:ax.set_xlim(0,60);ax.set_xticks([0,15,30,45,60]);ax.set_xlabel('Minutes');ax.grid(True,alpha=.45,color=grid);ax.spines[['right','top']].set_visible(False)
fig.text(.075,.935,'One hour · fifty active scripted clients',fontsize=19,fontweight='bold',color=fg)
fig.text(.075,.88,'4,000 hostile projectiles maintained · 108,001 authoritative ticks · single computer',fontsize=11,color=muted)
fig.text(.075,.205,f"Whole-hour p99 {m['tickP99Ms']:.2f} ms  |  worst {m['tickMaxMs']:.2f} ms  |  {m['overBudgetTicks']} ticks over 33.33 ms",fontsize=11,color=fg)
fig.text(.075,.155,f"{m['acceptedInputs']:,} accepted inputs  |  {m['rejectedInputs']} rejected  |  {m['encodedOutboundBytes']/1e9:.2f} GB encoded outbound",fontsize=10,color=muted)
fig.text(.075,.098,'Frozen source 723a667 · zero rendered clients · invulnerable players / 1e9 boss HP',fontsize=9,color=muted)
fig.text(.075,.062,'One-minute tick bins; memory every 15 seconds. Rendering, WAN/hosted capacity and normal progression remain separate.',fontsize=8.2,color=muted)
data=io.BytesIO();fig.savefig(data,format='png',dpi=120,metadata={'Software':'Matplotlib '+matplotlib.__version__});plt.close(fig)
out=r/'reviews/performance/endurance-50-moths-20261024-2-figure.png'
if out.exists():assert out.read_bytes()==data.getvalue(),'Preserve issued figure; use a new version for changes'
else:out.write_bytes(data.getvalue())
receipt={'source':raw_path.relative_to(r).as_posix(),'sourceSha256':sha(raw_path),'figure':out.relative_to(r).as_posix(),'figureSha256':sha(out),'tool':'tools/build-endurance-figure.py','toolSha256':sha(Path(__file__)),'matplotlib':matplotlib.__version__,'numpy':np.__version__,'python':sys.version.split()[0],'method':'Static Matplotlib plot of immutable raw timings and memory samples. No interpolation hides the maximum tick; no memory garbage collection is forced.','limits':['Localhost scripted continuous-combat fixture, not rendered gameplay or a full progression run.','Global p99 is the pass criterion; minute bins show observed variability. No universal memory bound or absence of leaks is certified.']}
(r/'reviews/performance/endurance-50-moths-20261024-2-figure.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({'passed':True,'figure':receipt['figure'],'sha256':receipt['figureSha256'],'matplotlib':matplotlib.__version__}))
