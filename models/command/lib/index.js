'use strict';

const log = require('@lzx-cli/log')

class Command {
    constructor(args) {
        new Promise(() => {
            Promise.resolve()
                .then(() => this.viladateArg(args))
                .then(() => this.initArg(args))
                .then(() => this.init())
                .then(async () => await this.exec())
                .catch(err => log.error('', err.message))
        })
    }

    viladateArg(args) {
        if (!args || args.length <= 1) {
            throw new Error(`参数不能为空`)
        }
    }

    initArg(args) {
        this._command = args[args.length - 1]
        this._args = args.slice(0, args.length - 1)
    }

    init() {
        throw new Error('init必须实现')
    }

    exec() {
        throw new Error('exec必须实现')
    }
}

module.exports = Command;

