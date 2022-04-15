'use strict';

module.exports = exec;

const Package = require('@lzx-cli/package')
const { exec: spawn } = require('@lzx-cli/utils')
const log = require('@lzx-cli/log')

// 指令到处理包的映射
const packageMap = {
    init: '@lzx-cli/core'
}

async function exec() {
    let pgk
    const targetPath = process.env.CLI_TARGET_PATH

    const program = arguments[arguments.length - 1]
    // 执行的command指令：init等，不包含option
    const commandName = program.name()
    // 获取处理该command的包
    const packageName = packageMap[commandName]
    const packageVersion = 'latest'

    if (!targetPath) {
        pgk = new Package({
            packageName,
            packageVersion
        })

        if (!await pgk.exists()) {
            await pgk.install()
        }
    } else {
        pgk = new Package({
            packageName,
            packageVersion,
            localPgkPath: targetPath
        })
    }

    try {
        const entryFile = await pgk.getEntryFile()
        // 执行入口文件、arguments是一个类数组的结构，只能通过apply进行传递
        // require(entryFile).apply(null, arguments)

        const args = Array.from(arguments)
        const command = args[args.length - 1]

        const o = Object.create(null);
        Object.keys(command).forEach(key => {
            if (command.hasOwnProperty(key) &&
              !key.startsWith('_') &&
              key !== 'parent') {
              o[key] = command[key];
            }
        });

        args[args.length - 1] = o;
        const code = `require('${entryFile}').call(null, ${JSON.stringify(args)})`;

        const child = spawn('node', ['-e', code], {
            cwd: process.cwd(),
            stdio: 'inherit',
        });
        child.on('error', e => {
            log.error(`${commandName}执行失败`, e.message);
            process.exit(1);
        });
        child.on('exit', e => {
            process.exit(e);
        });
    } catch(err) {
        log.error(`${commandName}执行失败`, err.message)
    }
}
