import ts from 'typescript'
import {registerHooks} from 'node:module'
import {readFileSync, statSync} from 'node:fs'
import {fileURLToPath, pathToFileURL} from 'node:url'
import {resolve} from 'node:path'
const sourceRoot=pathToFileURL(resolve('src')).href+'/'

registerHooks({
  load(url,context,next) {
    if(url.startsWith('file:')&&url.endsWith('.tsx'))return {
      format:'module',
      source:ts.transpileModule(readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,
      shortCircuit:true,
    }
    // Source manifests are ESM fixtures. Never intercept dependencies' CommonJS package.json.
    if(url.startsWith(sourceRoot)&&url.endsWith('.json'))return {
      format:'module',source:'export default '+readFileSync(fileURLToPath(url),'utf8'),shortCircuit:true,
    }
    return next(url,context)
  },
  resolve(specifier,context,next) {
    if(context.parentURL?.includes('/node_modules/')&&!specifier.startsWith('@/'))return next(specifier,context)
    const url=specifier.startsWith('@/')?pathToFileURL(resolve('src',specifier.slice(2))).href
      :specifier.startsWith('.')?new URL(specifier,context.parentURL).href:null
    if(url?.startsWith('file:')) {
      // Dotted basenames and existing directories still need TypeScript/index resolution.
      for(const candidate of [url,url+'.ts',url+'.tsx',url+'/index.ts',url+'/index.tsx']) {
        let file=false
        try {file=statSync(fileURLToPath(candidate)).isFile()}catch{}
        if(file)return next(candidate,context)
      }
    }
    return next(specifier,context)
  },
})
