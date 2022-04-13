'use strict';

const path = require('path')
const fs = require('fs')
const npminstall = require('npminstall')
const { getDefaultRegistry } = require('@lzx-cli/get-npm-info')

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
    get pgkNameInCache() {
        const pgkNamePrefix = this.packageName.replace('/', '_');
        return `_${pgkNamePrefix}@${this.packageVersion}@${this.packageName}`
    }

    async exists() {
        const pgkPath = this.localPgkPath || path.resolve(this.cachePackagePath, this.pgkNameInCache)
        try {
            await fs.accessSync(pgkPath)
            return true
        } catch(err) {
            return false
        }
    }

    update() {
        console.log('update')
    }

    install() {
        console.log('install', this.cachePackagePath, getDefaultRegistry(), this.packageName, this.packageVersion)
        npminstall({
            root: process.env.CLI_HOME_PATH,
            storeDir: this.cachePackagePath,
            registry: getDefaultRegistry(),
            pkgs: [{
                name: this.packageName,
                version: this.packageVersion
            }]
        })
    }
}

module.exports = Package;