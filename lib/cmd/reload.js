'use strict';

const Command = require('../command')
const utils = require('egg-utils')
const homedir = require('node-homedir')
const ipc = require('node-ipc')
const helper = require('../helper')
const path = require('path')

class ReloadCommand extends Command {
  constructor(rawArgv) {
    super(rawArgv)
    this.usage = 'Usage: egg-scripts-enhanced reload [options]'
    this.options = {
      title: {
        description: 'process title description, use for kill grep, default to `egg-server-${APP_NAME}`',
        type: 'string',
      }
    }
  }

  get description() {
    return 'Reload app worker at prod mode';
  }
  async run(context) {
    const { argv, env, cwd, execArgv } = context

    let baseDir = argv._[0] || cwd;
    if (!path.isAbsolute(baseDir)) baseDir = path.join(cwd, baseDir);
    argv.baseDir = baseDir;
    argv.framework = await this.getFrameworkPath({
      framework: argv.framework,
      baseDir,
    });

    this.frameworkName = await this.getFrameworkName(argv.framework);

    const pkgInfo = require(path.join(baseDir, 'package.json'));
    argv.title = argv.title || `egg-server-${pkgInfo.name}`;
    const { title } = argv

    ipc.config.id = 'egg-reload-client-' + title
    ipc.config.retry = 1000
    ipc.config.silent = true
    const masterServerId = 'egg-master-ipc-process-' + title
    this.logger.info('Ready connect to master process server id: %s', masterServerId)
    try {
      await new Promise((resolve, reject) => {
        ipc.connectTo(masterServerId, async () => {
          ipc.of[masterServerId].on('connect', async () => {
            this.logger.info('Connect to master process server')
            ipc.of[masterServerId].emit(helper.constants.RELOAD_MESSAGE)
            ipc.of[masterServerId].on('message', ({ type, data }) => {
              if (type === helper.messageType.WORKER_LISTENED) {
                this.logger.info('Worker listening, pid: %s', data.pid)
              }
              
              if (type === helper.messageType.WORKER_FORK) {
                const { pid, id } = data
                this.logger.info('New worker has fork, pid: %s, id: %s', pid, id)
              }
              if (type === helper.messageType.RELOAD_SUCCESS) {
                this.logger.info('Wokers reload success: [%s]', data.workers)
                resolve()
              }
              if (type === helper.messageType.RELOAD_FAIL) {
                this.logger.error('Worker reload fail')
                reject()
              }
            })
          })
        })
      })
    } catch(err) {
      ipc.disconnect(masterServerId)
      ipc.disconnect()
      process.exit(1)
    } finally {
      ipc.disconnect(masterServerId)
      ipc.disconnect()
    }
  }
  async getFrameworkPath(params) {
    return utils.getFrameworkPath(params);
  }

  async getFrameworkName(framework) {
    const pkgPath = path.join(framework, 'package.json');
    let name = 'egg';
    try {
      const pkg = require(pkgPath);
      /* istanbul ignore else */
      if (pkg.name) name = pkg.name;
    } catch (_) {
      /* istanbul next */
    }
    return name;
  }
}

module.exports = ReloadCommand