12/18/2025 - i figured i would show my work and document what i did step by step to create this project. 
All work was done on my macbook running MacOS Tahoe 26.2,
vscode details:  
Version: 1.107.1 (Universal)
Commit: 994fd12f8d3a5aa16f17d42c041e5809167e845a
Date: 2025-12-17T14:15:14.850Z
Electron: 39.2.3
ElectronBuildId: 12895514
Chromium: 142.0.7444.175
Node.js: 22.21.1
V8: 14.2.231.21-electron.0
OS: Darwin arm64 25.2.0

1. Download GH repo /crobertsbmx/deckofcards
2. install django framework 
3. Install k6 on macos: brew install k6
4. check version: k6 v1.4.2 (commit/devel, go1.25.4, darwin/arm64)
5. created simple script using typescript filename extension .ts
6. had to fix issues with typescript format k6 scripts
    - install node first: brew install node
    - install npm :  pip install npm
    - create package.json : npm init-y 
    - install k6 type package definitions : npm install --save-dev @types/k6
    - found some vscode extensions that provide better support.  installed them.
    - created a tsconfig.json in the project root to resolve the typescript type declarations for k6 modules
    - typescript is a superset of javascript that validates javascript with static type checking to help prevent errors at run time such as names that dont exist.  this is caught in the ide with typescript.
    - the typescript compiler transpiles the .ts script into plain javascript .js before running in k6 which only handles javascript.
7. 

