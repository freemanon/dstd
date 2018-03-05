#!/usr/bin/env node

const request = require('request')
const readlineSync = require('readline-sync')
const colors = require('colors')

const username = readlineSync.question('What is your Github username?\n')
const password =  readlineSync.question('What is your Github password?\n', { hideEchoBack: true })
const userEmail =  readlineSync.question('What is your Github email?\n')

class IndentedConsole {
  constructor() {
    this.indentLevel = 0
  }

  indent() {
    this.indentLevel += 1
  }

  deindent() {
    this.indentLevel -= 1
  }

  log(output) {
    let spaces = ''
    for(let i = 0; i < this.indentLevel; i++) {
      spaces += '  '
    }
    output.split('\n').forEach(line => {
      line.length && console.log(spaces + line)
    })
  }
}

const Logger = new IndentedConsole()

request(
  `https://${ username }:${ password }@api.github.com/users/${ username }/events`,
  {
    headers: {
      'User-Agent': 'freemanon'
    }
  },
  (err, m, body) => {
  const results = JSON.parse(body)
  const pushes = results.filter(({ type }) => type === 'PushEvent')

  console.log('----------------- Your summary -----------------\n')

  pushes
    .map(({ payload: { ref, commits }, created_at }) => ({
      branch: `${ ref.substr(11) }`,
      commits: commits.filter(({ author: { email } }) => email === userEmail),
      created_at: (new Date(created_at)).toDateString()
    }))
    .reduce((prev, curr) => {
      const prevDate = prev.find(({ created_at }) => created_at === curr.created_at)
      if (prevDate) {
        const prevBranch = prevDate.branches.find(({ branch }) => branch === curr.branch)
        if (prevBranch) {
          prevBranch.commits = prevBranch.commits.concat(curr.commits)
        } else {
          prevDate.branches.push(({ branch: curr.branch, commits: curr.commits }))
        }
      } else {
        prev.push({ created_at: curr.created_at, branches: [{ branch: curr.branch, commits: curr.commits }]})
      }
      return prev
    }, [])
    .forEach(({ created_at, branches }) => {
      Logger.log(colors.red(created_at))
      branches.forEach(({ branch, commits, created_at }) => {
        Logger.indent()
        if(!commits.length) return
        Logger.log(colors.green(branch))
        commits.forEach(({ message, url }) => {
          Logger.log(colors.yellow(message))
          Logger.log(colors.gray(url))
        })
        Logger.deindent()
      })
    })
  console.log('\n----------------- Happy coding! ----------------')
})
