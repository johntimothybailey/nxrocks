import { logger } from '@nrwl/devkit';
import { mocked } from 'jest-mock';

import { remoteDevExecutor } from './executor';
import { RemoteDevExecutorOptions } from './schema';
import { GRADLE_WRAPPER_EXECUTABLE, MAVEN_WRAPPER_EXECUTABLE, NX_QUARKUS_PKG } from '@nxrocks/common';
import { expectExecutorCommandRanWith, mockExecutorContext } from '@nxrocks/common/testing';

//first, we mock
jest.mock('child_process');
jest.mock('@nrwl/workspace/src/utils/fileutils');

//then, we import
import * as fsUtility from '@nrwl/workspace/src/utils/fileutils';
import * as cp from 'child_process';

const mockContext = mockExecutorContext(NX_QUARKUS_PKG,'run');
const options: RemoteDevExecutorOptions = {
  root: 'apps/quarkusapp'
};

describe('Run Executor', () => {

  beforeEach(async () => {
    jest.spyOn(logger, 'info');
    jest.spyOn(cp, 'execSync');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it.each`
    ignoreWrapper | buildSystem | buildFile         | execute
    ${true}       | ${'maven'}  | ${'pom.xml'}      | ${'mvn quarkus:remote-dev '}
    ${true}       | ${'gradle'} | ${'build.gradle'} | ${'gradle quarkusRemoteDev '}
    ${false}      | ${'maven'}  | ${'pom.xml'}      | ${MAVEN_WRAPPER_EXECUTABLE + ' quarkus:remote-dev '}
    ${false}      | ${'gradle'} | ${'build.gradle'} | ${GRADLE_WRAPPER_EXECUTABLE + ' quarkusRemoteDev '}
  `('should execute a $buildSystem build and ignoring wrapper : $ignoreWrapper', async ({ ignoreWrapper, buildFile, execute }) => {
    mocked(fsUtility.fileExists).mockImplementation((filePath: string) => filePath.indexOf(buildFile) !== -1);

    await remoteDevExecutor({ ...options, ignoreWrapper }, mockContext);

    expectExecutorCommandRanWith(execute, mockContext, options);
  });

});
