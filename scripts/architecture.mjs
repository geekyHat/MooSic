import ts from 'typescript'
import {readFileSync,existsSync} from 'node:fs'
import path from 'node:path'
const config=ts.readConfigFile('tsconfig.json',ts.sys.readFile)
const parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,'.')
const errors=[],graph=new Map()
for(const file of parsed.fileNames.filter(f=>f.startsWith('src/')&&!f.endsWith('.d.ts'))){
 const key=path.resolve(file),source=ts.createSourceFile(file,readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true),edges=[]
 function check(spec,runtime){
  const base=spec.startsWith('@/')?path.resolve('src',spec.slice(2)):spec.startsWith('.')?path.resolve(path.dirname(file),spec):null
  if(!base){if(file.startsWith('src/domain/')&&!spec.startsWith('node:'))errors.push(`${file}: domain external dependency ${spec}`);return}
  const target=[base,base+'.ts',base+'.tsx',path.join(base,'index.ts'),path.join(base,'index.tsx')].find(f=>existsSync(f)&&/\.(ts|tsx)$/.test(f))
  if(!target)return
  const relative=path.relative(path.resolve('src'),target).replaceAll('\\','/'),layer=relative.split('/')[0]
  if(file.startsWith('src/domain/')&&layer!=='domain')errors.push(`${file}: domain -> ${relative}`)
  if(file.startsWith('src/application/')&&!['domain','application'].includes(layer)&&!/^core\/(plugin\/types|scheduler|i18n)(\/|\.)/.test(relative))errors.push(`${file}: application -> ${relative}`)
  if(file.startsWith('src/shared/')&&layer!=='shared')errors.push(`${file}: shared -> ${relative}`)
  if(file.startsWith('src/features/')){
   const feature=file.split('/')[2]
   if(['infrastructure','content','transports','renderers','instruments','app'].includes(layer))errors.push(`${file}: feature imports implementation ${relative}`)
   if(layer==='features'&&relative.split('/')[1]!==feature&&!/^features\/[^/]+\/index\.ts$/.test(relative))errors.push(`${file}: cross-feature internal import ${relative}`)
  }
  if(runtime)edges.push(path.resolve(target))
 }
 function visit(node){
  if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier&&ts.isStringLiteral(node.moduleSpecifier)){
   const clause=ts.isImportDeclaration(node)?node.importClause:null
   const typeOnly=node.isTypeOnly||clause?.isTypeOnly||clause?.namedBindings&&ts.isNamedImports(clause.namedBindings)&&!clause.name&&clause.namedBindings.elements.every(e=>e.isTypeOnly)
   check(node.moduleSpecifier.text,!typeOnly)
  }
  if(ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword&&ts.isStringLiteral(node.arguments[0]))check(node.arguments[0].text,true)
  ts.forEachChild(node,visit)
 }
 visit(source);graph.set(key,edges)
}
const visited=new Set(),active=new Set()
function walk(key,trail=[]){if(active.has(key)){errors.push('Runtime cycle: '+[...trail,key].map(f=>path.relative('.',f)).join(' -> '));return}if(visited.has(key))return;active.add(key);for(const edge of graph.get(key)??[])walk(edge,[...trail,key]);active.delete(key);visited.add(key)}
for(const key of graph.keys())walk(key)
if(errors.length){console.error(errors.join('\n'));process.exitCode=1}else console.log(`Architecture: ${graph.size} modules, layer boundaries and runtime cycles checked`)
