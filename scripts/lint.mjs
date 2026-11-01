import ts from 'typescript'
import {readFileSync} from 'node:fs'
const config=ts.readConfigFile('tsconfig.json',ts.sys.readFile)
const parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,'.')
const errors=[]
for(const file of parsed.fileNames){
 const source=ts.createSourceFile(file,readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true)
 function visit(node){
  const fail=rule=>{const {line}=source.getLineAndCharacterOfPosition(node.getStart());errors.push(`${file}:${line+1}: ${rule}`)}
  if(node.kind===ts.SyntaxKind.AnyKeyword)fail('explicit any is forbidden; type the boundary')
  if(ts.isDebuggerStatement(node))fail('debugger statement')
  if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='eval')fail('eval is forbidden')
  if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&['skip','fixme'].includes(node.expression.name.text))fail('disabled tests are forbidden')
  ts.forEachChild(node,visit)
 }
 visit(source)
}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1}else console.log('Lint: no explicit any, disabled tests, debugger or eval')
