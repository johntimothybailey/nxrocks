import { ExecutorContext } from '@nrwl/devkit'
import * as path from 'path'
import { RunExecutorOptions } from './schema'
import { runBootPluginCommand } from '../../utils/boot-utils'

export async function runExecutor(options: RunExecutorOptions, context: ExecutorContext){
  const root = path.resolve(context.root, options.root);
  return runBootPluginCommand('run', options.args, { cwd : root, ignoreWrapper: options.ignoreWrapper});
}

export default runExecutor;