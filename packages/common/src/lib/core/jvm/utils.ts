import { logger, ProjectConfiguration } from '@nrwl/devkit';
import { execSync } from 'child_process';
import { fileExists } from '@nrwl/workspace/src/utils/fileutils';

import {
  BuilderCommandAliasType,
  BuilderCore,
} from './builder-core.interface';
import { getProjectFileContent, getProjectFilePath, getProjectRoot, PackageInfo } from '../workspace';
import { findXmlContent, readXml, findXmlNodes, findNodeContent } from '../utils';


export const LARGE_BUFFER = 1024 * 1000000;

export function runBuilderCommand(
  commandAlias: BuilderCommandAliasType,
  getBuilder : (cwd: string) => BuilderCore,
  params: string[],
  options: { cwd?: string; ignoreWrapper?: boolean, useLegacyWrapper?: boolean } = { ignoreWrapper: false, useLegacyWrapper: false }
): { success: boolean } {
  // Take the parameters or set defaults
  const cwd = options.cwd || process.cwd();
  const buildSystem = getBuilder(cwd);
  const executable = buildSystem.getExecutable(options.ignoreWrapper, options.useLegacyWrapper);
  const command = buildSystem.getCommand(commandAlias);
  // Create the command to execute
  const execute = `${executable} ${command} ${(params || []).join(' ')}`;
  try {
    logger.info(`Executing command: ${execute}`);
    execSync(execute, { cwd, stdio: [0, 1, 2],maxBuffer: LARGE_BUFFER});
    return { success: true };
  } catch (e) {
    logger.error(`Failed to execute command: ${execute}`);
    logger.error(e);
    return { success: false };
  }
}


export function isMavenProject(project: ProjectConfiguration) {
  return fileExists(getProjectFilePath(project, 'pom.xml'));
}

export function hasMavenProject(cwd: string) {
  return fileExists(`${cwd}/pom.xml`);
}

export function isGradleProject(project: ProjectConfiguration) {
  return (
    fileExists(getProjectFilePath(project, 'build.gradle')) ||
    fileExists(getProjectFilePath(project, 'build.gradle.kts'))
  );
}

export function hasGradleProject(cwd: string) {
  return fileExists(`${cwd}/build.gradle`) ||
    fileExists(`${cwd}/build.gradle.kts`)
}

export function getGradleBuildFilesExtension(project: ProjectConfiguration) {
  if (fileExists(getProjectFilePath(project, 'build.gradle.kts'))) {
    return '.gradle.kts';
  }

  return fileExists(getProjectFilePath(project, 'build.gradle')) ? '.gradle' : '';
}

export const getGradleDependencyIdRegEx = () => /\s*(api|implementation|testImplementation)\s*\(?['"](?<id>[^"']+)['"]\)?/g;

export function getJvmPackageInfo(project: ProjectConfiguration): PackageInfo {
  if (isMavenProject(project)) {
    // maven project
    const pomXmlStr = getProjectFileContent(project, 'pom.xml');
    const pomXmlNode = readXml(pomXmlStr);

    const groupId = findXmlContent(pomXmlNode, `/project/groupId/text()`);
    const artifactId = findXmlContent(pomXmlNode, `/project/artifactId/text()`);

    const dependencies: PackageInfo[] = [];
    const dependencyNodes = findXmlNodes(pomXmlNode, `/project/dependencies/dependency`);

    dependencyNodes?.forEach((node) => {
      const depGroupId = findNodeContent(node, `/dependency/groupId/text()`);
      const depArtifactId = findNodeContent(node, `/dependency/artifactId/text()`);
      dependencies.push({
        packageId: `${depGroupId}:${depArtifactId}`,
        packageFile: 'pom.xml',
      });
    });

    return {
      packageId: `${groupId}:${artifactId}`,
      packageFile: 'pom.xml',
      dependencies,
    };
  }

  if (isGradleProject(project)) {
    // gradle project
    const ext = getGradleBuildFilesExtension(project);
    const buildGradle = getProjectFileContent(project, `build${ext}`);
    const settingsGradle = getProjectFileContent(project, `settings${ext}`);

    const groupId = buildGradle.match(/group\s*=\s*['"]([^"']+)['"]/)?.[1];
    const artifactId = settingsGradle.match(
      /rootProject\.name\s*=\s*['"]([^"']+)['"]/
    )?.[1];

    const gradleDependencyIdRegEx = getGradleDependencyIdRegEx();
    const dependencyIds: string[] = [];
    let match;
    do {
      match = gradleDependencyIdRegEx.exec(buildGradle);
      if (match?.groups?.id) {
        dependencyIds.push(match.groups.id);
      }
    } while (match);

    const dependencies: PackageInfo[] = dependencyIds.map(depId => {
      return { packageId: depId, packageFile: `build.gradle${ext}` };
    });

    return {
      packageId: `${groupId}:${artifactId}`,
      packageFile: `build.gradle${ext}`,
      dependencies,
    };
  }

  throw new Error(
    `Cannot inspect dependencies of project at: '${getProjectRoot(
      project
    )}'.\n` + `No 'pom.xml' nor 'build.gradle[.kts]' was found.`
  );
}

export function checkProjectBuildFileContains(project: ProjectConfiguration, opts: { fragments: string[], logicalOp?: 'and' | 'or' }): boolean {

  const { fragments, logicalOp =  fragments?.length == 1 ? 'and' : 'or'} = opts;
  const findOccurencesInContent = (content: string): boolean => {
    return (fragments || []).reduce((acc, cur) => {
      return (logicalOp == 'and') ? acc && content.includes(cur) : acc || content.includes(cur);
    }, logicalOp == 'and');
  }

  if (isMavenProject(project)) {
    const content = getProjectFileContent(project, 'pom.xml');
    return findOccurencesInContent(content);
  }

  if (isGradleProject(project)) {
    const ext = getGradleBuildFilesExtension(project);
    const content = getProjectFileContent(project, `build${ext}`);
    return findOccurencesInContent(content);
  }

  return false;
}

