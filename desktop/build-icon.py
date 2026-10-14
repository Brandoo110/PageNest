# Rasterize the existing paper/book identity with the Python standard library.
from pathlib import Path
import struct,zlib
root=Path(__file__).resolve().parent
out=root.parent/'artifacts/desktop/icon.iconset';out.mkdir(parents=True,exist_ok=True)
def rounded(x,y,box,r):
 l,t,right,bottom=box
 if not(l<=x<=right and t<=y<=bottom):return False
 dx=max(l+r-x,0,x-(right-r));dy=max(t+r-y,0,y-(bottom-r))
 return dx*dx+dy*dy<=r*r

def pixel(x,y):
 if not rounded(x,y,(64,64,960,960),208):return (0,0,0,0)
 c=(40,93,73,255)
 if rounded(x,y,(270,268,704,828),48):c=(164,191,160,255)
 if rounded(x,y,(326,216,760,772),48):c=(246,248,236,255)
 for box in [(398,380,678,402),(398,476,678,494),(398,568,632,586)]:
  if rounded(x,y,box,8):c=(40,93,73,255)
 return c

def png(n):
 raw=bytearray()
 for y in range(n):
  raw.append(0)
  for x in range(n):
   raw.extend(pixel((x+.5)*1024/n,(y+.5)*1024/n))
 def chunk(t,b):return struct.pack('>I',len(b))+t+b+struct.pack('>I',zlib.crc32(t+b)&0xffffffff)
 return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',n,n,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b'')
for n in [16,32,64,128,256,512,1024]:
 data=png(n)
 if n<=512:(out/f'icon_{n}x{n}.png').write_bytes(data)
 if n>=32:(out/f'icon_{n//2}x{n//2}@2x.png').write_bytes(data)
 if n==1024:(root/'icon.png').write_bytes(data)
