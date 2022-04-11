'use strict';

module.exports = core

const log = require('@lzx-cli/log');
const { getNpmPgkLasterVerion } = require('@lzx-cli/get-npm-info')
const pgk = require('../package.json')
const { loadESM } = require('./utils')
const userHome = require('user-home')
const colors = require('colors/safe');
const path = require('path')
const dotenv = require('dotenv')
const { DEFAULT_CLI_HOME } = require('./const')
const semver = require('semver')

async function core() {
    try {
      await prepare();
    } catch (e) {
      log.error(e.message);
    }
}

async function prepare() {
    checkPkgVersion()
    await checkRoot()
    await checkUserHome()
    await loadEnv()
    await checkCliIsLaster()
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