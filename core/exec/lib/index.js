'use strict';

module.exports = exec;

const Package = require('@lzx-cli/package')

// 指令到处理包的映射
const packageMap = {
    init: 'npminstall' // '@lzx-cli/init'
}

async function exec() {
    let pgk
    const targetPath = process.env.CLI_TARGET_PATH

    const program = arguments[arguments.length - 1]
    // 执行的command指令：init等，不包含option
    const commandName = program.name()
    // 获取处理该command的包
    const packageName = packageMap[commandName]

    if (!targetPath) {
        pgk = new Package({
            packageName,
            packageVersion: 'latest'
        })

        if (await pgk.exists()) {
            pgk.update()
        } else {
            pgk.install()
        }
    }
    
    // TODO
    console.log('exec..', targetPath, packageName)
}
