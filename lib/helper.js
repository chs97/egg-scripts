'use strict';

const runScript = require('runscript');
const isWin = process.platform === 'win32';
const REGEX = isWin ? /^(.*)\s+(\d+)\s*$/ : /^\s*(\d+)\s+(.*)/;

exports.findNodeProcess = function* (filterFn) {
  const command = isWin ?
    'wmic Path win32_process Where "Name = \'node.exe\'" Get CommandLine,ProcessId' :
    // command, cmd are alias of args, not POSIX standard, so we use args
    'ps -eo "pid,args"';
  const stdio = yield runScript(command, { stdio: 'pipe' });
  const processList = stdio.stdout.toString().split('\n')
    .reduce((arr, line) => {
      if (!!line && !line.includes('/bin/sh') && line.includes('node')) {
        const m = line.match(REGEX);
        /* istanbul ignore else */
        if (m) {
          const item = isWin ? { pid: m[2], cmd: m[1] } : { pid: m[1], cmd: m[2] };
          if (!filterFn || filterFn(item)) {
            arr.push(item);
          }
        }
      }
      return arr;
    }, []);
  return processList;
};

exports.kill = function(pids, signal) {
  pids.forEach(pid => {
    try {
      process.kill(pid, signal);
    } catch (err) { /* istanbul ignore next */
      if (err.code !== 'ESRCH') {
        throw err;
      }
    }
  });
};

exports.delay = (timeout) => new Promise(resolve => setTimeout(resolve, timeout))

exports.constants = {
  'RELOAD_MESSAGE': 'RELOAD_MESSAGE',
}

exports.messageType = {
  'WORKER_LISTEN': 'WORKER_LISTEN',
  'WORKER_DISCONNECT': 'WORKER_DISCONNECT',
  'WORKER_KILLED': 'WORKER_KILLED',
  'RELOAD_SUCCESS': 'RELOAD_SUCCESS',
  'RELOAD_FAIL': 'RELOAD_FAIL',
  'WORKER_BROKEN': 'WORKER_BROKEN',
}