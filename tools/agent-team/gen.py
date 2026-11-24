import json,sys
lib=[]
for f in sys.argv[2:]:
    lib+=json.load(open(f))
s=open('build-review.js').read()
s=s.replace("const UNITS = args.units","const LIBRARY = "+json.dumps(lib)+"\nconst UNITS = (args && args.only) ? LIBRARY.filter(u => args.only.includes(u.key)) : LIBRARY")
open(sys.argv[1],'w').write(s)
