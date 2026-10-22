import bpy, math, random, json, urllib.request, struct, gzip, base64
from mathutils import Vector
from pathlib import Path
BASE=Path(__file__).resolve().parent
OUT=BASE.parents[1] if BASE.name=='faq' else BASE.parent/'cosgral-agency'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=1280;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.frame_end=900;scene.render.fps=30
scene.world.color=(.12,.15,.22)
glass=bpy.data.materials.new('Optical glass — portfolio family');glass.use_nodes=True
p=glass.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(.97,.985,1,1);p.inputs['Roughness'].default_value=.025;p.inputs['IOR'].default_value=1.46;p.inputs['Transmission Weight'].default_value=1
# Original COSGRAL master is retained by the browser; this camera/layout proxy
# makes the Blender timeline editable without replacing its engraved GLB.
original=BASE/'cube_web_raw.glb'
try:
 if not original.exists():urllib.request.urlretrieve('https://raw.githubusercontent.com/kacperkretowicz-wq/cosgral-agency/8cd988708917582b50020eaef5b327df47a52d7a/designkopia/cosgral-agency/assets/glass-cube/cube_web_raw.glb',original)
 bpy.ops.import_scene.gltf(filepath=str(original));core=next(o for o in bpy.context.selected_objects if o.type=='MESH');core.name='COSGRAL — original engraved master'
except Exception as error:
 print('Original GLB import unavailable:',error);bpy.ops.mesh.primitive_cube_add(size=1.88);core=bpy.context.object;core.name='COSGRAL — layout proxy (runtime uses original engraved GLB)' 
core.data.materials.append(glass);bev=core.modifiers.new('Polished bevel','BEVEL');bev.width=.055;bev.segments=4
core.rotation_mode='XYZ';core.rotation_euler=(.39,-.63,-.04)
for frame,loc,rot in [(1,(-10,-.4,0),(.4,-1.1,-.18)),(240,(0,0,0),(.4,-.63,-.04)),(450,(0,0,.05),(.45,-.35,.02)),(720,(0,0,0),(.38,.15,-.02)),(900,(13,-6,-2),(.8,1.8,-.4))]:
 core.location=loc;core.rotation_euler=rot;core.keyframe_insert('location',frame=frame);core.keyframe_insert('rotation_euler',frame=frame)
random.seed(7391);export=[]
for i in range(64):
 n=random.choice([4,5,5,6]);w=random.uniform(.10,.27);h=random.uniform(.20,.48)
 ring=[]
 for j in range(n):
  a=j/n*math.tau;rad=random.uniform(.72,1.12);x=math.cos(a)*w*rad;y=math.sin(a)*h*rad
  ring.append((x,y,.45*x*x-.23*y*y+random.uniform(-.009,.009)))
 thick=random.uniform(.018,.04)
 verts=[(x,y,z-thick/2) for x,y,z in ring]+[(x,y,z+thick/2) for x,y,z in ring]
 faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(j,(j+1)%n,(j+1)%n+n,j+n) for j in range(n)]
 m=bpy.data.meshes.new('Curved prism %02d'%i);m.from_pydata(verts,[],faces);m.update()
 o=bpy.data.objects.new('Prism %02d — edge %d'%(i,i%4),m);scene.collection.objects.link(o);o.data.materials.append(glass)
 bpy.context.view_layer.objects.active=o;o.select_set(True);core.select_set(False)
 b=o.modifiers.new('Hand-polished rim','BEVEL');b.width=.012;b.segments=3
 bpy.ops.object.modifier_apply(modifier=b.name)
 for f in o.data.polygons:f.use_smooth=True
 # Export evaluated geometry (Blender authored, not generated in the browser).
 o.data.calc_loop_triangles();pos=[];normal=[]
 for tri in o.data.loop_triangles:
  for vi in tri.vertices:
   v=o.data.vertices[vi];pos.extend(round(x,6) for x in v.co);normal.extend(round(x,6) for x in v.normal)
 a=i*2.399963;radius=1.65+random.uniform(-.18,.55);home=(math.cos(a)*radius,math.sin(a)*radius*.78,random.uniform(-1.35,1.3))
 rot=(random.uniform(-.9,.9),random.uniform(-1.4,1.4),a*.6)
 edge=i%4;outside=[(-12,random.uniform(-7,7),-2),(12,random.uniform(-7,7),-2),(random.uniform(-10,10),9,-2),(random.uniform(-10,10),-9,-2)][edge]
 for f,loc in [(1+int(i%8)*5,outside),(205+int(i%8)*4,home),(285,home),(420+int(i%9)*3,outside)]:
  o.location=loc;o.rotation_euler=rot;o.keyframe_insert('location',frame=f);o.keyframe_insert('rotation_euler',frame=f)
 export.append(dict(outline=ring,thickness=thick,position=pos,normal=normal,home=home,rotation=rot,edge=edge,delay=(i%8)/8))
 o.select_set(False)
# Editable 3D question typography follows an orbit about the cube.
ink=bpy.data.materials.new('Ink');ink.diffuse_color=(.005,.007,.012,1)
for idx,label in enumerate(['ILE KOSZTUJE WDROŻENIE','CRM LUB NOWEJ STRONY?']):
 c=bpy.data.curves.new('Question line','FONT');c.body=label;c.align_x='CENTER';c.size=.72;c.space_character=.88
 o=bpy.data.objects.new('Question / '+label,c);scene.collection.objects.link(o);o.data.materials.append(ink)
 for f,y,z,rx,scale in [(360,-7,-.4,1.0,1),(450,.85-idx*1.8,-.95,0,1),(510,2.1-idx*.55,-.95,0,.44),(570,7,-.4,-1,1)]:
  o.location=(0,y,z);o.rotation_euler=(rx,0,0);o.scale=(scale,scale,scale);o.keyframe_insert('location',frame=f);o.keyframe_insert('rotation_euler',frame=f);o.keyframe_insert('scale',frame=f)
# Camera uses the same up-axis / viewing direction as Three.js.
bpy.ops.object.camera_add(location=(0,0,12));camera=bpy.context.object;camera.name='Story camera';camera.data.type='PERSP';camera.data.lens=35;scene.camera=camera
for name,loc,size,power,col in [('Key',(-4,5,6),6,1200,(.89,.94,1)),('Rim',(5,2,-3),4,1700,(.72,.8,1)),('Prism',(-5,-1,2),2,650,(.76,.67,1))]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.data.color=col;o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
for label,f in [('ARRIVAL / from every edge',1),('CONSTELLATION / hold',240),('RELEASE / clear the frame',300),('QUESTION 01 / rise and roll',450),('QUESTION 02',570),('QUESTION 03',690),('DEPARTURE / down-right',780)]:scene.timeline_markers.new(label,frame=f)
scene.frame_set(240)
# Save in camera view, ready for inspection.
for a in bpy.context.screen.areas:
 if a.type=='VIEW_3D':a.spaces.active.region_3d.view_perspective='CAMERA'
bpy.ops.wm.save_as_mainfile(filepath=str(BASE/'cosgral-scrollytelling.blend'),compress=True)
for shard in export:
 lookup={};vertices=[];indices=[]
 for k in range(0,len(shard['position']),3):
  values=shard['position'][k:k+3]+shard['normal'][k:k+3];key=tuple(round(x,5) for x in values)
  if key not in lookup:lookup[key]=len(vertices)//6;vertices+=values
  indices.append(lookup[key])
 raw=struct.pack('<%df'%len(vertices),*vertices)+struct.pack('<%dH'%len(indices),*indices)
 shard['mesh']=base64.b64encode(gzip.compress(raw,mtime=0)).decode();shard['vertexCount']=len(vertices)//6;shard['indexCount']=len(indices)
 del shard['position'];del shard['normal']
(OUT/'faq-prisms.json').write_text(json.dumps({'authoring':'Blender 5.1.2','version':1,'shards':export},separators=(',',':')))
print('EXPORTED',len(export),'Blender-authored prisms')

