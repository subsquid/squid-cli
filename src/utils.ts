import { Command, CliUx } from '@oclif/core';
import cliSelect from 'cli-select';
import { dim } from 'chalk';
import {
  DefaultLogFields,
  LogOptions,
  RemoteWithRefs,
  SimpleGit
} from 'simple-git';
import {
  DeployPipelineStatusEnum,
  getDeployPipeline
} from './rest-client/routes/pipeline';
import { streamSquidLogs } from './api';
import { existsSync, readFileSync } from 'fs';

function buildPipelineErrorMessage(text: string, errorMessage: string): string {
  return `${text} ${errorMessage ? `: ${errorMessage}` : ''}`;
}

export async function pollDeployPipelines(
  squidName: string,
  versionName: string,
  deploymentUrl: string,
  command: Command,
  {verbose = true}: { verbose?: boolean } = {}
): Promise<void> {
  let lastStatus: string;

  await doUntil(async () => {
    const pipeline = await getDeployPipeline(squidName, versionName);

    const traceDebug = `
      ------
      Please report to t.me/HydraDevs 
      ${dim('Squid:')} ${squidName}
      ${dim('Version:')} ${versionName}
      ${dim('Deploy:')} ${pipeline?.id}
      `;
    let isLogPrinted = false;

    if (!pipeline) return true;

    if (pipeline.status !== lastStatus) {
      lastStatus = pipeline.status;
      CliUx.ux.action.stop('✔️');
    }

    const printDebug = () => {
      if (verbose && !isLogPrinted) {
        command.log(dim([...pipeline.logs, pipeline.comment].filter(v => v).join('\n')));
        isLogPrinted = true;
      }
    };

    switch (pipeline?.status) {
      case DeployPipelineStatusEnum.CREATED:
        CliUx.ux.action.start('◷ Preparing your squid');
        if (pipeline.isErrorOccurred) {
          printDebug();
          command.error(
            buildPipelineErrorMessage(
              `❌ An error occurred while building the squid`,
              traceDebug
            )
          );
          return true;
        }
        return false;
      case DeployPipelineStatusEnum.IMAGE_BUILDING:
        CliUx.ux.action.start('◷ Building your squid');
        if (pipeline.isErrorOccurred) {
          printDebug();
          command.error(
            buildPipelineErrorMessage(
              `❌ An error occurred while building the squid`,
              traceDebug
            )
          );
          return true;
        }
        return false;
      case DeployPipelineStatusEnum.IMAGE_PUSHING:
        CliUx.ux.action.start('◷ Publishing your squid');
        if (pipeline.isErrorOccurred) {
          printDebug();
          command.error(
            buildPipelineErrorMessage(
              `❌ An error occurred while publishing the squid`,
              traceDebug
            )
          );
          return true;
        }
        return false;
      case DeployPipelineStatusEnum.DEPLOYING:
        CliUx.ux.action.start('◷ Deploying your squid');
        if (pipeline.isErrorOccurred) {
          printDebug();
          command.error(
            buildPipelineErrorMessage(
              `❌ An error occurred while deploying the squid`,
              traceDebug
            )
          );
          return true;
        }
        return false;
      case DeployPipelineStatusEnum.OK:
        printDebug();

        command.log(`Squid is running up. Your squid will be shortly available at ${deploymentUrl} `)

        CliUx.ux.action.start(`Streaming logs from the squid`);

        await streamSquidLogs(squidName, versionName,  (l) => command.log(l));

        return true;
      default:
        printDebug();
        command.error(
          '❌ An unexpected error occurred. Please report to Discord https://discord.gg/KRvRcBdhEE or SquidDevs https://t.me/HydraDevs'
        );
        return true;
    }

  }, { pause: 3000 });
}

export async function doUntil(fn: () => Promise<boolean>, {pause}: { pause: number }) {
  while (true) {
    const done = await fn();
    if (done) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, pause));
  }
}

export async function buildRemoteUrlFromGit(
  git: SimpleGit,
  command: Command
): Promise<string> {
  let remoteUrl: RemoteWithRefs;
  const remotes = await git.getRemotes(true);
  if (remotes.length === 0) {
    command.error(`The remotes were not found`, {code: '1'});
  } else if (remotes.length === 1) {
    remoteUrl = remotes[0];
  } else {
    const selected = await cliSelect({
      cleanup: false,
      values: remotes.map((remote) => remote.name),
    }).catch(() => {
      command.error('Canceled', {code: '1'});
    });
    remoteUrl = remotes.find(
      (remote) => remote.name === selected.value
    ) as RemoteWithRefs;
  }
  await git.listRemote([remoteUrl.name]).catch(() => {
    command.error(`Remote url with name ${remoteUrl.name} not exists`, {
      code: '1',
    });
  });
  const branch = (await git.branch()).current;
  const status = await git.status();
  if (status.files && status.files.length) {
    command.error(`There are unstaged or uncommitted changes`);
  }
  await git.fetch();
  const remoteBranchRefs = await git.listRemote([
    `${remoteUrl.name}`,
    `${branch}`,
  ]);
  if (remoteBranchRefs === '') {
    command.error(`Remote branch "${remoteUrl.name}/${branch}" not exists`);
  }
  const localCommit = await git.log([
    '-n',
    1,
    branch,
  ] as LogOptions<DefaultLogFields>);
  const remoteCommit = await git.log([
    '-n',
    1,
    `${remoteUrl.name}/${branch}`,
  ] as LogOptions<DefaultLogFields>);
  if (
    !localCommit.latest ||
    !remoteCommit.latest ||
    localCommit.latest.hash !== remoteCommit.latest.hash
  ) {
    command.error(
      `Head origin commit is not the same as the local origin commit`
    );
  }
  return `${remoteUrl.refs.fetch}${
    remoteUrl.refs.fetch.endsWith('.git') ? '' : '.git'
  }#${remoteCommit.latest.hash}`;
}

export function parseNameAndVersion(
  nameAndVersion: string,
  command: Command
): {
  squidName: string;
  versionName: string;
} {
  if (
    (nameAndVersion.match(/.+@.+/gi) || []).length === 0 ||
    (nameAndVersion.match(/@/g) || []).length !== 1
  ) {
    command.error(
      'Required format: <name>@<version>. Symbol @ not allowed in names'
    );
  }
  const squidName = nameAndVersion.split('@')[0];
  const versionName = nameAndVersion.split('@')[1];
  return {squidName, versionName};
}

const ENV_VALUE_PATTERN = /^[ \t]*(?<name>\S*?)[ \t]*\=[ \t]*(?<value>"[^"]*"|'[^']*?'|.*?(?<! \#))[ \t]*(?<comment> \#.*)?$/
const ENV_COMMENT_PATTERN = /^(?<comment_line>[ \t]*?\#.*?)$/
const ENV_EMPTY_LINE_PATTERN = /^(?<empty_line>[ \t]*)$/
const ENV_PATTERN = RegExp(`${ENV_VALUE_PATTERN.source}|${ENV_COMMENT_PATTERN.source}|${ENV_EMPTY_LINE_PATTERN.source}`)

export type EnvValue = {
  name: string,
  value: string,
  isComment: boolean,
  isEmpty: boolean,
}

export function getEnv(e: string): EnvValue {
    const variable = ENV_PATTERN.exec(e);
    if (variable == null || variable.groups == null) {
        throw new Error(`❌ An error occurred during parsing variable "${e}"`);
    }
    var value = variable.groups.value;
    if (value != null) 
      if (/^'.*'$|^".*"$/.test(value))
        value = value.slice(1, value.length-1)
    return { 
      name: variable.groups.name, 
      value: value,
      isComment: variable.groups.comment_line != undefined,
      isEmpty: variable.groups.empty_line != undefined,
    }
}

function mergeEnvWithFile(envs: Record<string, string>, path: string) {
    if (!existsSync(path)) return envs;
    return readFileSync(path)
        .toString()
        .replace(/\r\n/g,'\n')
        .split('\n')
        .reduce((res, e: string) => {
            const {name, value, isComment, isEmpty} = getEnv(e);
            return isComment || isEmpty ? {...res} : {...res, [name]: value};
        }, { ...envs })
}

export function parseEnvs(envFlags: string[] | undefined, envFilePath: string | undefined) {
    let envs: Record<string, string> = {} 
        
    envFlags?.forEach((e: string)=>{
        const { name, value } = getEnv(e);
        if (name != null)
          envs[name] = value;
    });
    
    if (envFilePath != undefined)
        envs = mergeEnvWithFile(envs, envFilePath)
    
    return envs
}
