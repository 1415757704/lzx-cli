module.exports = {
    loadESM
}

// 在cmj中加载esm的方法
async function loadESM(moduleName) {
    return new Promise((resolve, reject) => {
        import(moduleName).then((module) => {
            resolve(module)
        }).catch(err => reject(err))
    })
}