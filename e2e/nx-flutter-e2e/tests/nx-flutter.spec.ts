import {
  checkFilesExist,
  readJson,
  runNxCommandAsync,
  uniq,
} from '@nrwl/nx-plugin/testing';
import { ensureNxProjectWithDeps } from '@nxrocks/common/testing';

jest.mock('inquirer'); // we mock 'inquirer' to bypass the interactive prompt
import * as inquirer from 'inquirer';

describe('nx-flutter e2e', () => {

  beforeAll(async () => {

    ensureNxProjectWithDeps('@nxrocks/nx-flutter', 'dist/packages/nx-flutter',
      [{ name: '@nxrocks/common', path: 'dist/packages/common' }]);
  }, 600000);

  afterAll(() => {
    // `nx reset` kills the daemon, and performs
    // some work which can help clean up e2e leftovers
    runNxCommandAsync('reset');
  });
  
  beforeEach(() => {
    jest.spyOn(inquirer, 'prompt').mockResolvedValue({
      platforms: ['android', 'ios', 'web', 'linux', 'windows', 'macos'],
      androidLanguage: 'kotlin',
      iosLanguage: 'swift'
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should create nx-flutter project with default options', async() => {
    const appName = uniq('nx-flutter');

    const sep = process.platform === 'win32' ? '\\' : '/';
    await runNxCommandAsync(`generate @nxrocks/nx-flutter:create ${appName} --no-interactive`);

    const executors = [
      { name: 'analyze', output: `Analyzing ${appName}` },

      //{ name: 'assemble', output: `Assembling ${appName}` },
      //{ name: 'attach', output: `Attaching ${appName}` },

      //build commands
      //{ name: 'build-aar', output: `Running Gradle task 'assembleAarDebug'...` }, // only for module or plugin projects
      { name: 'build-apk', output: `Built build${sep}app${sep}outputs${sep}flutter-apk${sep}app-release.apk` },
      //{ name: 'build-appbundle', output: `Built build/app/outputs/bundle/release/app-release.aab` },
      //{ name: 'build-bundle', output: `Done in` },

      //required an iOS certificate
      //{name: 'build-ios', output: `No valid code signing certificates were found`},
      //{name: 'build-ios-framework', output: `Building frameworks for iOS is only supported from a module`},
      //{name: 'build-ipa', output: `No valid code signing certificates were found`},

      //{ name: 'clean', output: `Deleting flutter_export_environment.sh...` },

      //required a test file under 'test_driver/main_test.dart' (default)
      //{ name: 'drive', output: `xxx` },

      //{ name: 'format', output: `Formatted no files ` },

      //required arb files under 'lib/l10n'
      //{ name: 'gen-l10n', output: `The 'arb-dir' directory, 'LocalDirectory: 'lib/l10n'', does not exist` },

      //required a running device
      //{ name: 'install', output: `No target device found` },
      //{ name: 'run', output: `No target device found` },

      { name: 'test', output: `All tests passed!` },
    ];

    let totalExecutorsTime = 0;
    for (const executor of executors) {
      const start = new Date().getTime();
      const result = await runNxCommandAsync(`run ${appName}:${executor.name}`);
      const end = new Date().getTime();
      console.log(`${executor.name} took ${end - start}ms`);
      totalExecutorsTime += end - start;
      expect(result.stdout).toContain(executor.output);
    }
    console.log(`Total executors time: ${totalExecutorsTime}ms`);

    expect(() =>
      checkFilesExist(`apps/${appName}/pubspec.yaml`)
    ).not.toThrow();
  }, 400000);

  it('should create nx-flutter project with given options', async() => {
    const appName = uniq('nx-flutter');
    const org = 'com.tinesoft';
    const description = 'My flutter application';
    const androidLanguage = 'java';
    const iosLanguage = 'swift';
    const template = 'app';
    const platforms = 'android,ios,linux,macos,windows,web';
    const pub = true;
    const offline = true;

    await runNxCommandAsync(`generate @nxrocks/nx-flutter:create ${appName} --no-interactive --org=${org} --description="${description}" --androidLanguage=${androidLanguage} --iosLanguage=${iosLanguage} --template=${template} --platforms="${platforms}" --pub=${pub} --offline=${offline} `);

    const executors = [

      { name: 'clean', output: `Deleting flutter_export_environment.sh...` },
      { name: 'format', output: `Formatted no files ` },
      { name: 'test', output: `All tests passed!` },
    ];

    for (const executor of executors) {
      const result = await runNxCommandAsync(`run ${appName}:${executor.name}`);
      expect(result.stdout).toContain(executor.output);
    }

    expect(() =>
      checkFilesExist(`apps/${appName}/pubspec.yaml`,
        `apps/${appName}/android/build.gradle`,
        `apps/${appName}/ios/Runner.xcodeproj`,
        `apps/${appName}/android/app/src/main/java/com/tinesoft/${appName.replace('-', '_')}/MainActivity.java`
      )
    ).not.toThrow();
  }, 200000);

  describe('--directory', () => {
    it('should create src in the specified directory', async() => {
      const appName = uniq('nx-flutter');

      await runNxCommandAsync(
        `generate @nxrocks/nx-flutter:create ${appName} --no-interactive --directory subdir`
      );
      expect(() =>
        checkFilesExist(`apps/subdir/${appName}/pubspec.yaml`)
      ).not.toThrow();
      }, 200000);
  });

  describe('--tags', () => {
    it('should add tags to nx.json', async() => {
      const appName = uniq('nx-flutter');

      await runNxCommandAsync(
        `generate @nxrocks/nx-flutter:create ${appName}  --no-interactive --tags e2etag,e2ePackage`
      );
      const project = readJson(`apps/${appName}/project.json`);
      expect(project.tags).toEqual(['e2etag', 'e2ePackage']);
      }, 200000);
  });
});
