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
    - install k6 type package definitions : npm install --save-dev @types/k6@latest
    - found some vscode extensions that provide better support.  installed them.
    - created a tsconfig.json in the project root to resolve the typescript type declarations for k6 modules
    - typescript is a superset of javascript that validates javascript with static type checking to help prevent errors at run time such as names that dont exist.  this is caught in the ide with typescript.
    - the typescript compiler transpiles the .ts script into plain javascript .js before running in k6 which only handles javascript.
7. created a test1 script to get things working and for use as a template.  created logging.  covered all the use cases docuemented in the deckofcards api website.
8. created 4 performance testing scenarios using the test1 script as a template.
9. ran some tests against the deckofcards api website,  scripts look good.
10. set up docker to run the deckofcards api locally on my macbook - based on the ask.
11. set up the api to run in the docker container on my macbook.
Docker version 29.1.3, build f52814d,  container running (you can access it at http://localhost:8088)
12. ran all the tests pointer to the docker container.
13. git cloned the https://github.com/crobertsbmw/deckofcards repo into a django project in a vscode workspace at /onebriefAPI-to-Test folder /deckofcards
git clone https://github.com/crobertsbmw/deckofcards.git
14. The following packages will be installed: django-cors-headers, django==3.2.14
15. cd /Users/herscheldecouto/onebriefAPI-to-Test/deckofcards && /Users/herscheldecouto/onebriefAPI-to-Test/.venv/bin/python manage.py migrate
The API will be available at http://127.0.0.1:8000
16. change scripts to point to the api server locally
17. change to http/1.1  as http/2.0 not working
18. ran through the tests and they are working locally.  the deckofcards app had hard coded url's pointing the the actual online webserver.  i changed all the code to point to localhost:8000 and all the activity is occurring on my macbook.  next i will deploy the app ion a docker container and run from there.

