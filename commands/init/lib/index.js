'use strict';

const Command = require('@lzx-cli/command')
const fs = require('fs')
const path = require('path')
const fse = require('fs-extra')
const glob = require('glob');
const ejs = require('ejs');
const inquirer = require('inquirer')
const { getProjectTemplate } = require('./getProjectTemplate')
const semver = require('semver');
const Package = require('@lzx-cli/package');
const { spinnerStart, sleep } = require('@lzx-cli/utils');
const log = require("@lzx-cli/log")

const TYPE_PROJECT = 'project';
const TYPE_COMPONENT = 'component';
const WHITE_CMD = ['npm', 'cnpm'];

class InitCommand extends Command {
    constructor(args) {
        super(args)
    }

    async init() {
      await this.resetFloderWhileForce()
      await this.collectIptInfo()
    }

    async exec() {
      // 下载对应的模版
      await this.downloadTemplate()
      // 安装模板
      await this.installTemplate()
    }

    async downloadTemplate() {
      const { projectTemplate } = this.projectInfo;
      const { TEMPLATE_CACHE_DIR, CLI_HOME_PATH } = process.env
      const { npmName, version } = this.template.find(item => item.npmName === projectTemplate);
      const storeDir = path.resolve(CLI_HOME_PATH, TEMPLATE_CACHE_DIR)
      this.templateNpm = new Package({
        storeDir,
        packageName: npmName,
        packageVersion: version,
      });

      if (!(await this.templateNpm.exists())) {
        await this.templateNpm.install()
      }
    }

    async installTemplate() {
      if (this.projectInfo.type) {
        // 标准安装
        await this.installNormalTemplate();
      }
    }

    async installNormalTemplate() {
      // 拷贝模板代码至当前目录
      let spinner = spinnerStart('正在安装模板...');
      await sleep();
      try {
        const templatePath = path.resolve(await this.templateNpm.getPackagePathInLocal(), 'template');
        const targetPath = process.cwd();

        fse.ensureDirSync(templatePath);
        fse.ensureDirSync(targetPath);
        fse.copySync(templatePath, targetPath);
      } catch (e) {
        throw e;
      } finally {
        spinner.stop(true);
        log.success('模板安装成功');
      }

      // 使用ejs渲染替换模版中的一些信息，实现动态替换的效果 
      const templateIgnore = this.projectInfo.ignore || [];
      const ignore = ['**/node_modules/**', ...templateIgnore];
      try {
        await this.ejsRender({ ignore });
      } catch(err) {
        log.error('ejs渲染失败', err.message)
      }

      const { installCommand, startCommand } = this.projectInfo;
      try {
        // 依赖安装
        await this.execCommand(installCommand, '依赖安装失败！');
        // 启动命令执行
        await this.execCommand(startCommand, '启动执行命令失败！');
      } catch(err) {
        log.error('command error', err.message)
      }
    }

    async ejsRender(options) {
      const dir = process.cwd();
      const projectInfo = this.projectInfo;
      return new Promise((resolve, reject) => {
        glob('**', {
          cwd: dir,
          ignore: options.ignore || '',
          nodir: true,
        }, function(err, files) {
          if (err) {
            reject(err);
          }
          Promise.all(files.map(file => {
            const filePath = path.join(dir, file);
            return new Promise((resolve1, reject1) => {
              ejs.renderFile(filePath, projectInfo, {}, (err, result) => {
                if (err) {
                  reject1(err);
                } else {
                  fse.writeFileSync(filePath, result);
                  resolve1(result);
                }
              });
            });
          })).then(() => {
            resolve();
          }).catch(err => {
            reject(err);
          });
        });
      });
    }

    async execCommand(command, errMsg) {
      if (command) {
        const cmdArr = command.split(' ')
        const cmd = cmdArr[0]
        const opts = cmdArr.slice(1)
        if (!this.checkCommand(WHITE_CMD, cmd)) throw new Error(`当前指令不合法: ${ cmd }`)
        
        try {
          require('child_process').execSync(command, {
            stdio: 'inherit',
            cwd: process.cwd(),
          })
        } catch(err) {
          throw new Error(`${errMsg}: ${command}指令执行失败，请尝试手动执行`)
        }
      }
    }

    checkCommand(whiteCmds, cmd) {
      if (cmd || whiteCmds.includes(cmd.toLowerCare())) return true
      return false
    }

    curProjectTemplate() {
      return this.template.map(item => ({
        value: item.npmName,
        name: item.name,
      }));
    }

    // 清空当前文件夹
    async resetFloderWhileForce() {
        this.projectName = this._args[0]
        const opt = this._args[this._args.length - 1]
        const curExecPath = process.cwd()
        const files = fs.readdirSync(curExecPath)

        if (files.length !== 0) {
            if (!opt.force) {
                const { isForce } = await inquirer.prompt([{
                    type: 'confirm',
                    name: 'isForce',
                    message: '是否强制清空当前文件夹',
                    default: false
                }])
                if (!isForce) process.exit(0)
            }

            const { continuClear } = await inquirer.prompt([{
                type: 'confirm',
                name: 'continuClear',
                message: '准备强制清空当前文件夹，是否继续',
                default: false
            }])

            if (!continuClear) process.exit(0)
            fse.emptyDirSync(curExecPath)
        }
    }

    // 收集用户的输入信息
    async collectIptInfo() {
        function isValidName(v) {
          return /^[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(v);
        }

        const projectInfo = {
        }

        if (!isValidName(this.projectName)) {
          throw new Error('项目名不合法')
        }

        this.template = await getProjectTemplate()

        if (!this.template || this.template.length === 0) {
          throw new Error('项目模板不存在')
        }

        const { type } = await inquirer.prompt([{
            type: 'list',
            name: 'type',
            message: '请选择初始化类型',
            default: TYPE_PROJECT,
            choices: [{
              name: '项目',
              value: TYPE_PROJECT,
            }, {
              name: '组件',
              value: TYPE_COMPONENT,
            }],
        }])
        // 过滤模版
        this.template = this.template.filter(template => {
          return template.tag.includes(type)
        })
        
        if (!this.template || this.template.length === 0) {
          throw new Error(`当前没有${type}模版`)
        }  

        const title = type === TYPE_PROJECT ? '项目' : '组件';

        let projectPrompt = [{
            type: 'input',
            name: 'projectName',
            message: `请输入${title}名称`,
            default: this.projectName,
            validate: function(v) {
              const done = this.async();
              setTimeout(function() {
                if (!isValidName(v)) {
                  done(`请输入合法的${title}名称`);
                  return;
                }
                done(null, true);
              }, 0);
            },
            filter: function(v) {
              return v;
            },
        }, {
          type: 'input',
          name: 'projectVersion',
          message: `请输入${title}版本号`,
          default: '1.0.0',
          validate: function(v) {
            const done = this.async();
            setTimeout(function() {
              if (!(!!semver.valid(v))) {
                done('请输入合法的版本号');
                return;
              }
              done(null, true);
            }, 0);
          },
          filter: function(v) {
            if (!!semver.valid(v)) {
              return semver.valid(v);
            } else {
              return v;
            }
          },
        }, {
          type: 'list',
          name: 'projectTemplate',
          message: `请选择${title}模板`,
          choices: this.curProjectTemplate(),
        }]

        if (type === TYPE_COMPONENT) {
          projectPrompt = [...projectPrompt, {
            type: 'input',
            name: 'componentDescription',
            message: '请输入组件描述信息',
            default: '',
            validate: function(v) {
              const done = this.async();
              setTimeout(function() {
                if (!v) {
                  done('请输入组件描述信息');
                  return;
                }
                done(null, true);
              }, 0);
            },
          }]
        }

        const info = await inquirer.prompt(projectPrompt)
        const tempInfo = this.template.filter(({ npmName }) => npmName === info.projectTemplate)[0]
        Object.assign(projectInfo, { ...tempInfo, ...info, type })
        this.projectInfo = projectInfo
    }
}

module.exports = init;

function init() {
    new InitCommand(arguments[0])
}
