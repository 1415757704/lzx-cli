'use strict';

const path = require('path')
const fs = require('fs')
const npminstall = require('npminstall')
const { getDefaultRegistry, getNpmPgkLasterVerion } = require('@lzx-cli/get-npm-info')

class Package {
    /**
     * @param packageName: 包名：@lzx-cli/init
     * @param packageVersion：版本号
     * @param localPgkPath：本地包的路径，这个一般用于测试
     */
    constructor({ packageName, packageVersion, localPgkPath }) {
        this.packageName = packageName
        this.packageVersion = packageVersion
        this.localPgkPath = localPgkPath
    }
    // 缓存的路径
    get cachePackagePath() {
        const { CLI_HOME_PATH, CACHE_COMMAND_PGK_FNAME } = process.env
        return path.resolve(CLI_HOME_PATH, CACHE_COMMAND_PGK_FNAME)
    }
    // 缓存的包名
    async pgkNameInCache() {
        const curPgkVersion = await this.curPgkVersion()
        const pgkNamePrefix = this.packageName.replace('/', '_');
        return `_${pgkNamePrefix}@${curPgkVersion}@${this.packageName}`
    }

    async curPgkVersion() {
        return this.packageVersion === 'latest' ? await getNpmPgkLasterVerion(this.packageName) : this.packageVersion
    }

    // 获取包在本地的路径
    async getPackagePathInLocal() {
        return this.localPgkPath || path.resolve(this.cachePackagePath, await this.pgkNameInCache())
    }

    async exists() {
        const pgkPath = await this.getPackagePathInLocal()
        try {
            await fs.accessSync(pgkPath)
            return true
        } catch(err) {
            return false
        }
    }

    async install() {
        npminstall({
            root: process.env.CLI_HOME_PATH,
            storeDir: this.cachePackagePath,
            registry: getDefaultRegistry(),
            pkgs: [{
                name: this.packageName,
                version: await this.curPgkVersion()
            }]
        })
    }

    async getEntryFile() {
        const modulesPath = await this.getPackagePathInLocal()
        const pgkDir = (await import('pkg-dir')).sync(modulesPath)
        const pkgJsonPath = path.resolve(pgkDir, 'package.json')
        const packageJsonFile = require(pkgJsonPath)
        return packageJsonFile.main ? path.resolve(pgkDir, packageJsonFile.main) : null
    }
}

module.exports = Package;