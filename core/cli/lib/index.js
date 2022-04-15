'use strict';

module.exports = core

const log = require('@lzx-cli/log');
const { getNpmPgkLasterVerion } = require('@lzx-cli/get-npm-info')
const pgk = require('../package.json')
const { loadESM } = require('./utils')
const userHome = require('user-home')
const colors = require('colors/safe');
const path = require('path')
const fs = require('fs')
const dotenv = require('dotenv')
const { DEFAULT_CLI_HOME, DEFEALT_CACHE_DIR, LASTER_NODE_VERSION, DEFAULT_TEMPLATE_DIR } = require('./const')
const semver = require('semver')
const commander = require('commander');
const exec = require('@lzx-cli/exec')

const program = new commander.Command()

async function core() {
    try {
      await prepare();
      registerCli();
    } catch (e) {
      log.error(e.message);
    }
}

function registerCli() {
    program
        .name(Object.keys(pgk.bin)[0])
        .usage('<command> [options]')
        .version(pgk.version)
        .option('-d, --debug', '是否开启调试', false)
        .option('-tp, --targetPath <targetPath>', '本地调试command指令处理包的文件路径', '')

    program
        .command('init [projectName]')
        .option('-f, --force', '是否强制初始化项目')
        .action(exec);
    
    // 监听debug option
    program.on('option:debug', () => {
        const { debug } = program.opts()
        process.env.LOG_LEVEL = debug ? 'verbose' : 'info'
        log.level = process.env.LOG_LEVEL
    })

    program.on('option:targetPath', () => {
        const { targetPath } = program.opts()
        process.env.CLI_TARGET_PATH = targetPath
    })

    // 监听错误的command
    program.on('command:*', function (obj) {
        const availableCommands = program.commands.map(cmd => cmd.name());
        log.error('command error', `未知命令:${colors.red(obj.join('、'))}`)
        log.notice('available commands', `可用命令:${colors.green(availableCommands.join('、'))}`)
    })

    program.parse(process.argv);
}

async function prepare() {
    checkPkgVersion()
    await checkRoot()
    await checkUserHome()
    await loadEnv()
    checkNodeVersion()
    await checkCliIsLaster()
    await mkCachePath()
}

function checkNodeVersion() {
    if (!semver.gte(process.version, LASTER_NODE_VERSION)) 
        throw new Error(`当前node的版本不能低于${LASTER_NODE_VERSION}`)
}

// 创建处理command指令对应的npm包的文件夹，用于后续的下载缓存
async function mkCachePath() {
    !process.env.CACHE_COMMAND_PGK_FNAME && (process.env.CACHE_COMMAND_PGK_FNAME = DEFEALT_CACHE_DIR)
    !process.env.TEMPLATE_CACHE_DIR && (process.env.TEMPLATE_CACHE_DIR = DEFAULT_TEMPLATE_DIR)

    const pathExists = (await loadESM('path-exists')).pathExistsSync
    const { CLI_HOME_PATH, CACHE_COMMAND_PGK_FNAME } = process.env
    const cachePath = path.resolve(CLI_HOME_PATH, CACHE_COMMAND_PGK_FNAME)

    if (!pathExists(cachePath)) {
        fs.mkdirSync(cachePath, { recursive: true })
    }
}

function checkPkgVersion() {
    log.info('cli version', pgk.version)
    return pgk.version
}

// 调用rootCheck process.getuid()前后的值不一样，如果是root的话，会切换用户
async function checkRoot() {
    const rootCheck = (await loadESM('root-check')).default
    rootCheck()
}

async function checkUserHome() {
    const pathExists = (await loadESM('path-exists')).pathExistsSync
    
    if (!userHome || !pathExists(userHome)) {
        throw new Error(colors.red('当前登录用户主目录不存在！'));
    }

    process.env.USER_HOME = userHome
}

// 加载自定义的环境的配置
async function loadEnv() {
    const pathExists = (await loadESM('path-exists')).pathExistsSync
    // 加载用户目录下的.env到process.env中
    const envFile = path.resolve(process.env.USER_HOME, '.env')
    if (pathExists(envFile)) {
        dotenv.config({
            path: envFile
        })
    }

    createDefaultHomePath()
}

// 如果当前没有设置cli主目录的名称，则使用默认的名称，加上用户的路径，则得到真正的路径
function createDefaultHomePath() {
    const { CLI_HOME, USER_HOME } = process.env
    const cliHome = CLI_HOME || DEFAULT_CLI_HOME
    const cliHomePath = path.resolve(USER_HOME, cliHome)
    process.env.CLI_HOME_PATH = cliHomePath
}

async function checkCliIsLaster() {
    const { name, version } = pgk
    const lasterVersion = await getNpmPgkLasterVerion(name)
    if (lasterVersion && !semver.gte(version, lasterVersion)) {
        log.warn(colors.yellow(`请手动更新 ${name}，当前版本：${version}，最新版本：${lasterVersion}
                更新命令： npm install -g ${name}`));
    }
}