from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
import math, shutil, io, base64, json, random, zipfile

OUT=Path(__file__).resolve().parent.parent
BASE=OUT/'source-art'
UI=OUT
ART=UI/'assets'
SRC=UI/'source-art'
for d in (ART/'girl',ART/'whale',SRC,UI/'src/client',OUT/'demo',OUT/'tests'):
 d.mkdir(parents=True,exist_ok=True)

SCENES=['idle','typing','thinking','planning','reading','searching','working','success','waiting','error','tired','coffee','sleeping','debugging','offline']
BASE_SCENES={'idle':'waiting','typing':'typing','thinking':'waiting','planning':'typing','reading':'typing',
             'searching':'waiting','working':'typing','success':'done','waiting':'waiting',
             'error':'waiting','tired':'waiting','coffee':'done','sleeping':'sleeping','debugging':'typing','offline':'sleeping'}
N=16; W,H=192,128; PIX=2
C={'ink':'#1b2455','ink2':'#252c60','blue':'#4d73d9','screen':'#111932','lite':'#9ec3ff',
   'green':'#62e0ad','pink':'#f08aba','gold':'#ffcc74','muted':'#7285b6','red':'#f86c83'}

# Preserve user-provided reference sprites locally for optional rebuilding.
for p in BASE.glob('*.gif'):
 if p.resolve() != (SRC/p.name).resolve(): shutil.copy2(p,SRC/p.name)

sprites={}
for char in ['girl','whale']:
 for b in ['typing','done','waiting','sleeping']:
  p=BASE/f'{char}_{b}_transparent.gif'
  gif=Image.open(p)
  fr=[]
  for n in range(N):
   gif.seek((n*2)%gif.n_frames)
   im=gif.convert('RGBA')
   # Exact nearest-neighbor downsample, consistent canvas avoids registration jumps.
   sz=116 if char=='girl' else 110
   im=im.resize((sz,sz),Image.Resampling.NEAREST)
   fr.append(im)
  sprites[(char,b)]=fr

def square(d,x,y,col,s=2):d.rectangle((int(x),int(y),int(x+s-1),int(y+s-1)),fill=col)
def star(d,x,y,col,s=3):
 x=int(x);y=int(y)
 d.rectangle((x-s,y,x+s,y),fill=col);d.rectangle((x,y-s,x,y+s),fill=col)
def text(d,x,y,t,col,sz=11):
 try: font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf',sz)
 except:font=ImageFont.load_default()
 d.text((x,y),t,font=font,fill=col)

def draw_pc(d,char,t,kind):
 # Distinct original pixel workstation; layered behind the mascot.
 mx,my=(127,67) if char=='girl' else (20,60)
 d.rectangle((mx,my,mx+44,my+31),fill='#111933',outline='#617ee4',width=2)
 d.rectangle((mx+4,my+4,mx+40,my+24),fill='#19284c')
 if kind=='error':
  text(d,mx+9,my+6,'ERR',C['red'],10)
 else:
  for i,w in enumerate([22,16,28]):
   col=['#79a6fc','#7be0be','#d3b1fe'][i]
   d.rectangle((mx+7,my+6+i*6,mx+7+w+((t+i)%3)*2,my+7+i*6), fill=col)
 d.rectangle((mx+19,my+32,mx+25,my+39),fill='#6479bd')
 d.rectangle((mx+10,my+38,mx+34,my+40),fill='#273965')


def scene_frame(char,scene,n):
 phase=n*2*math.pi/N
 t=n/N
 im=Image.new('RGBA',(W,H),(0,0,0,0))
 d=ImageDraw.Draw(im)
 # A subtle base shadow, no card background so it blends into every theme.
 d.ellipse((36,110,160,119),fill=(40,59,113,46))
 if scene in ('typing','working','debugging','tired','coffee','planning','reading'):
  draw_pc(d,char,n,scene)
 if scene=='offline':
  d.line((143,33,158,44),fill=C['red'],width=3)
  d.line((143,44,158,33),fill=C['red'],width=3)
 if scene=='sleeping':
  for j in range(3):
   xx=150+j*9+int(3*math.sin(phase+j)); yy=51-j*12-int((t*17)%16)
   text(d,xx,yy,'z',C['lite'],9+j)
 if scene=='thinking':
  d.rounded_rectangle((133,16,169,38),radius=8,fill=(47,63,116,220),outline='#7c95e7',width=1)
  text(d,141,21,'...',C['lite'],12)
 if scene=='planning':
  d.rounded_rectangle((143,12,182,54),radius=3,fill='#283863',outline='#8298e0',width=2)
  for j in range(3):
   yy=18+j*10
   d.rectangle((149,yy,155,yy+6),outline=C['green'],width=1)
   d.line((150,yy+2,152,yy+4,156,yy-1),fill=C['green'],width=1)
   d.line((160,yy+3,176,yy+3),fill=C['lite'],width=2)
 if scene=='reading':
  d.polygon([(126,85),(144,78),(157,82),(171,77),(181,81),(181,103),(168,99),(156,103),(143,98),(126,103)],fill='#eae9fc')
  d.line((155,84,155,104),fill='#717acc',width=2)
  for j in range(2):d.line((133,88+j*5,149,85+j*5),fill='#a2abcf',width=1)
 if scene=='searching':
  d.ellipse((149,28,172,51),outline='#80e8fe',width=3)
  d.line((168,47,181,61),fill='#80e8fe',width=4)
 if scene=='waiting':
  d.rounded_rectangle((148,16,168,35),radius=4,fill='#ffd37e',outline='#e4a94d',width=1)
  text(d,155,18,'!',C['ink'],12)
 if scene=='error':
  d.rounded_rectangle((147,15,168,36),radius=4,fill=C['red'])
  text(d,155,16,'!', '#fff8ff',13)
 if scene=='debugging':
  # Little bug with antennae, moving near the terminal.
  x=140+int(8*math.sin(phase));y=27+int(4*math.cos(phase))
  d.ellipse((x,y,x+12,y+11),fill='#ef84c5',outline='#533d75',width=2)
  d.line((x+2,y-4,x+4,y+1),fill='#f3a3d0',width=2)
  d.line((x+9,y-4,x+8,y+1),fill='#f3a3d0',width=2)
  square(d,x+3,y+4,'#27234b',2);square(d,x+8,y+4,'#27234b',2)
 if scene=='success':
  d.rounded_rectangle((142,13,164,34),radius=5,fill='#4ad8ab')
  d.line((148,24,152,28,160,18),fill='#f7fff9',width=3)
 if scene=='coffee':
  x=148;y=53+int(math.sin(phase)*2)
  d.rectangle((x,y,x+17,y+19),fill='#ffefb8',outline='#ac83a2',width=2)
  d.arc((x+14,y+4,x+24,y+17),-80,90,fill='#dfbdaf',width=3)
  d.line((x+3,y+4,x+14,y+4),fill='#775977',width=3)
  for j in range(2):
   d.line((x+5+j*7,y-2-(n+j*4)%6,x+6+j*7,y-7-(n+j*4)%6),fill='#adb4d8',width=2)
 if scene=='tired':
  # Screen clock 03:42 and sleepy floating dots.
  d.rounded_rectangle((144,10,189,30),radius=4,fill='#27335b',outline='#566caf')
  text(d,149,13,'03:42','#ffa4b6',10)
 if scene=='offline':
  text(d,144,57,'NO',C['muted'],10)
  text(d,141,71,'NET',C['muted'],10)
 if scene=='idle':
  for j in range(3):
   star(d,144+j*12,46+j*5+int(math.sin(phase+j)*2),'#839ae7',1)
 if scene=='working':
  for j in range(3):
   yy=12+j*8
   d.rectangle((151,yy,153+int(9*t+4*j)%13,yy+1),fill=C['green'] if j==0 else C['lite'])

 base=BASE_SCENES[scene]
 avatar=sprites[(char,base)][n].copy()
 # The source 'waiting' stickers contain an exclamation badge. Remove that
 # badge in new non-alert scenes rather than showing a misleading warning.
 if base=='waiting' and scene not in ('waiting','error'):
  transparent=ImageDraw.Draw(avatar)
  if char=='girl': transparent.rectangle((76,16,96,42),fill=(0,0,0,0))
  else: transparent.rectangle((27,29,59,55),fill=(0,0,0,0))
 # Keep bobbing subtle; no subjective claim of a physical computer tied to agent commands.
 bob=int(round(math.sin(phase)*2)) if scene not in ('tired','sleeping') else int(round(math.sin(phase)*1.0))
 x=(30 if char=='girl' else 40)
 y=(-3 if char=='girl' else 1)+bob
 im.alpha_composite(avatar,(x,y))
 d=ImageDraw.Draw(im)
 if scene in ('typing','working','debugging','tired','planning','reading'):
  # Front desk with keyboard and a laptop for girl: new setting, source character preserved.
  if char=='girl':
   d.rectangle((70,102,177,109),fill='#29376b',outline='#7d9af2',width=2)
   d.line((73,105,161,105),fill='#4a61a7',width=1)
   d.polygon([(101,70),(152,70),(159,102),(109,102)],fill='#1a2349')
   d.line((108,70,152,70),fill='#9caff8',width=2)
   star(d,134,85,C['lite'],4)
   d.line((105,103,165,103),fill='#a8c0ff',width=2)
  else:
   d.rectangle((53,105,140,112),fill='#253764',outline='#7c9aed',width=2)
   for j in range(7):
    square(d,64+j*8+(n%2)*((j+1)%2),107,'#9ec8ff',3)
 if scene=='tired' and char=='girl':
  # Visible under-eye blue-purple shadows; tiny geometry below eyes.
  # Original girl waiting sprite face centre ~83,70 in 116x116 placement.
  d.rectangle((76,68,83,70),fill=(54,51,116,220))
  d.rectangle((96,68,103,70),fill=(54,51,116,220))
  d.line((77,72,84,72),fill='#86789f',width=1)
  d.line((96,72,103,72),fill='#86789f',width=1)
 if scene=='tired' and char=='whale':
  d.ellipse((99,85,105,87),fill='#6777c0')
 if scene in ('typing','working','debugging'):
  star(d,155+int(math.sin(phase)*3),36,C['green'] if scene!='debugging' else C['red'],1)
 if scene=='success':
  for j in range(14):
   xx=13+j*12+int(2*math.sin(phase+j))
   yy=(j*13+int(t*53))%91
   col=[C['pink'],C['gold'],C['green'],C['lite']][j%4]
   square(d,xx,yy,col,2)
 if scene=='error':
  for j in range(3):
   yy=43+j*14+int(math.sin(phase+j)*3)
   star(d,157+j*8,yy,C['red'],1)
 if scene=='tired':
  d.arc((120,19,137,27),200,340,fill='#978fcb',width=2)
 if scene=='coffee':
  star(d,172,43,'#ffc37e',2)
 if scene=='offline':
  d.ellipse((140,91,161,110),outline='#858cb8',width=2)
 if scene=='sleeping':
  d.arc((52,101,167,125),0,180,fill=(148,171,225,160),width=1)
 return im

urls={}; total=0
for char in ['girl','whale']:
 urls[char]={}
 for scene in SCENES:
  frames=[scene_frame(char,scene,i) for i in range(N)]
  fpath=ART/char/(scene+'.webp')
  try:
   frames[0].save(fpath,'WEBP',save_all=True,append_images=frames[1:],duration=120,loop=0,lossless=True,method=3)
  except Exception as ex: raise RuntimeError(f'cannot save animated webp {char}/{scene}: {ex}')
  png=ART/char/(scene+'.png'); frames[0].save(png,optimize=True)
  with open(fpath,'rb') as f: encoded=base64.b64encode(f.read()).decode('ascii')
  with open(png,'rb') as f: still=base64.b64encode(f.read()).decode('ascii')
  urls[char][scene]={'webp':'data:image/webp;base64,'+encoded,'png':'data:image/png;base64,'+still}
  total+=fpath.stat().st_size
  print('asset',char,scene,'KB',round(fpath.stat().st_size/1024),flush=True)

(OUT/'demo'/'sprites.json').write_text(json.dumps({char:{sc:{'webp':f'../assets/{char}/{sc}.webp','png':f'../assets/{char}/{sc}.png'} for sc in SCENES} for char in ['girl','whale']},ensure_ascii=False),encoding='utf-8')
# LEGACY generator: this writes data URLs. The shipped client now loads sprites from the
# package asset route, so after running this script also run `npm run assets` (or
# `npm run build`) to regenerate asset-route references in src/client/assets.generated.ts.
src='''/** Generated by tools/build_assets.py; local image data only, no remote requests. */\nexport const COMPANION_ASSETS = '''+json.dumps(urls,separators=(',',':'))+' as const;\n'
(UI/'src/client/assets.generated.ts').write_text(src,encoding='utf-8')

# Sample animated montage on transparent-compatible dark background.
thumbw=192; thumbh=160
scenes_show=['typing','thinking','planning','working','success','waiting','error','tired','coffee','sleeping','offline','debugging']
canvas=Image.new('RGB',(4*thumbw,6*thumbh),'#10162b')
draw=ImageDraw.Draw(canvas)
for j,sc in enumerate(scenes_show*2):
 c='girl' if j<12 else 'whale';n=j%12
 im=Image.open(ART/c/(sc+'.webp')); im.seek(0)
 rgba=im.convert('RGBA').resize((192,128),Image.Resampling.NEAREST)
 tile=Image.new('RGBA',(192,160),'#151f3a')
 tile.alpha_composite(rgba,(0,8))
 d=ImageDraw.Draw(tile);text(d,10,141,c.upper()+'  '+sc.upper(),'#b8c9ff',10)
 canvas.paste(tile.convert('RGB'),((j%4)*192,(j//4)*160))
canvas.save(OUT/'demo'/'preview.png')
print('TOTAL WEBP KB',total//1024,flush=True)
