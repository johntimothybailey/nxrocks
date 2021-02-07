import { Architect } from '@angular-devkit/architect';
import { TestingArchitectHost } from '@angular-devkit/architect/testing';
import { schema } from '@angular-devkit/core';
import { join } from 'path';
import { BuildJarBuilderSchema } from './schema';

jest.mock('child_process'); // we need to mock 'execSync' (see __mocks__/child_process.js)

const options: BuildJarBuilderSchema = {
  root: 'apps/myboot'
};

describe('Command Runner Builder', () => {
  let architect: Architect;
  let architectHost: TestingArchitectHost;
  let statSync: jest.Mock;

  beforeEach(async () => {
    jest.resetModules();

    statSync = jest.fn();
    jest.mock('fs', () => ({
      ...jest.requireActual('fs'),
      statSync
    }));

    const registry = new schema.CoreSchemaRegistry();
    registry.addPostTransform(schema.transforms.addUndefinedDefaults);

    architectHost = new TestingArchitectHost('/root', '/root');
    architect = new Architect(architectHost, registry);

    // This will either take a Node package name, or a path to the directory
    // for the package.json file.
    await architectHost.addBuilderFromPackage(join(__dirname, '../../..'));
  });


  it('can run maven build', async () => {
    statSync.mockImplementation((path: string) => ({ isFile: () => path.indexOf('pom.xml') !== -1 }))

    // A "run" can have multiple outputs, and contains progress information.
    const buildJar = await architect.scheduleBuilder(
      '@nxrocks/nx-spring-boot:buildJar',
      options
    );
    // The "result" member (of type BuilderOutput) is the next output.
    const output = await buildJar.result;

    // Stop the builder from running. This stops Architect from keeping
    // the builder-associated states in memory, since builders keep waiting
    // to be scheduled.
    await buildJar.stop();

    // Expect that it succeeded.
    expect(output.success).toBe(true);
  });

  it('can run gradle build', async () => {
    statSync.mockImplementation((path: string) => ({ isFile: () => path.indexOf('build.gradle') !== -1 }))

    // A "run" can have multiple outputs, and contains progress information.
    const buildJar = await architect.scheduleBuilder(
      '@nxrocks/nx-spring-boot:buildJar',
      options
    );
    // The "result" member (of type BuilderOutput) is the next output.
    const output = await buildJar.result;

    // Stop the builder from running. This stops Architect from keeping
    // the builder-associated states in memory, since builders keep waiting
    // to be scheduled.
    await buildJar.stop();

    // Expect that it succeeded.
    expect(output.success).toBe(true);
  });
});
