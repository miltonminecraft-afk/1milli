// Publish the static allowlisted build to its own branch, without Actions OAuth scope.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),remote='https://github.com/miltonminecraft-afk/1milli.git';
const env={...process.env,TEMP:'H:/CodexData/Temp',TMP:'H:/CodexData/Temp',GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'Never'};
function git(args,cwd=root){return execFileSync('git',args,{cwd,env,encoding:'utf8',windowsHide:true,maxBuffer:4*1024*1024}).trim();}
if(git(['status','--porcelain']))throw Error('Commit source changes before publication');
const sourceCommit=git(['rev-parse','HEAD']);execFileSync(process.execPath,[path.join(root,'scripts/build-github-pages.mjs')],{cwd:root,env,stdio:'inherit',windowsHide:true});
const temporary=fs.mkdtempSync(path.join('H:/CodexData/Temp','onemillie-pages-'));git(['init','-b','gh-pages'],temporary);git(['remote','add','origin',remote],temporary);
const existing=git(['ls-remote','--heads','origin','gh-pages'],temporary);
if(existing){git(['fetch','--depth','1','origin','gh-pages'],temporary);git(['update-ref','refs/heads/gh-pages','FETCH_HEAD'],temporary);}
// Keep the preceding publication as parent; do not check stale files out into
// this new, empty temporary working tree and index.
fs.cpSync('H:/CodexData/Builds/onemillie/website',temporary,{recursive:true});git(['add','--all'],temporary);
git(['-c','user.name=miltonminecraft-afk','-c','user.email=276723585+miltonminecraft-afk@users.noreply.github.com','commit','-m','Publish onemillie website from '+sourceCommit],temporary);
const publicationCommit=git(['rev-parse','HEAD'],temporary);git(['push','origin','HEAD:gh-pages'],temporary);
const report={publishedAt:new Date().toISOString(),sourceCommit,publicationCommit,sourceBranch:'main',publicationBranch:'gh-pages',site:'https://miltonminecraft-afk.github.io/1milli/',awaitingGitHubPagesBuild:true,unrealSceneBuilt:false};
fs.writeFileSync(path.join(root,'docs/github-pages-publication.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
