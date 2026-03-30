import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  buildMergeInstallConfig,
  buildPublishedSyncConfig
} = require('../tools/config-toml-ops.cjs');
const TOML = require('@iarna/toml');

function withTempDir(callback) {
  const tempDir = mkdtempSync(join(tmpdir(), 'codex-home-config-test-'));
  try {
    callback(tempDir);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

test('merge-install replaces managed tables, preserves unmanaged keys, and keeps local projects', () => {
  const sourceConfig = {
    model: 'gpt-5.4',
    features: {
      runtime_metrics: true
    },
    notice: {
      hide_full_access_warning: true
    }
  };

  const targetConfig = {
    model: 'gpt-5.3-codex',
    features: {
      runtime_metrics: false,
      guardian_approval: true
    },
    windows: {
      sandbox: 'elevated'
    },
    projects: {
      'C:\\Users\\jxx73\\repo': {
        trust_level: 'trusted'
      }
    }
  };

  assert.deepStrictEqual(
    buildMergeInstallConfig(sourceConfig, targetConfig),
    {
      model: 'gpt-5.4',
      features: {
        runtime_metrics: true
      },
      notice: {
        hide_full_access_warning: true
      },
      windows: {
        sandbox: 'elevated'
      },
      projects: {
        'C:\\Users\\jxx73\\repo': {
          trust_level: 'trusted'
        }
      }
    }
  );
});

test('merge-install always removes notice.model_migrations from the installed result', () => {
  const sourceConfig = {
    features: {
      runtime_metrics: true
    }
  };

  const targetConfig = {
    notice: {
      hide_full_access_warning: true,
      model_migrations: {
        'gpt-5.1-codex-max': 'gpt-5.3-codex'
      }
    }
  };

  assert.deepStrictEqual(
    buildMergeInstallConfig(sourceConfig, targetConfig),
    {
      features: {
        runtime_metrics: true
      },
      notice: {
        hide_full_access_warning: true
      }
    }
  );
});

test('publish-sync only emits managed allowlist keys and skips projects plus notice.model_migrations', () => {
  const localConfig = {
    model: 'gpt-5.4',
    model_reasoning_effort: 'medium',
    features: {
      runtime_metrics: true,
      guardian_approval: false
    },
    notice: {
      hide_full_access_warning: true,
      model_migrations: {
        'gpt-5.1-codex-max': 'gpt-5.3-codex'
      }
    },
    windows: {
      sandbox: 'elevated'
    },
    projects: {
      sample: {
        trust_level: 'trusted'
      }
    }
  };

  const managedConfig = {
    model: 'gpt-5.3-codex',
    model_reasoning_effort: 'high',
    features: {
      runtime_metrics: false
    },
    notice: {
      hide_full_access_warning: false,
      model_migrations: {
        'gpt-5.1-codex-max': 'gpt-5.3-codex'
      }
    },
    sandbox_workspace_write: {
      network_access: true
    }
  };

  assert.deepStrictEqual(
    buildPublishedSyncConfig(localConfig, managedConfig),
    {
      features: {
        runtime_metrics: true,
        guardian_approval: false
      },
      notice: {
        hide_full_access_warning: true
      }
    }
  );
});

test('merge-install CLI allows a missing target file and writes UTF-8 TOML output', () => {
  withTempDir((tempDir) => {
    const sourcePath = join(tempDir, 'source.toml');
    const targetPath = join(tempDir, 'missing-target.toml');
    const outputPath = join(tempDir, 'output.toml');

    writeFileSync(
      sourcePath,
      [
        'model = "gpt-5.4"',
        '',
        '[features]',
        'runtime_metrics = true',
        ''
      ].join('\n'),
      'utf8'
    );

    const result = spawnSync(
      process.execPath,
      [
        'tools/config-toml-ops.cjs',
        'merge-install',
        '--source',
        sourcePath,
        '--target',
        targetPath,
        '--output',
        outputPath
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8'
      }
    );

    assert.equal(result.status, 0, result.stderr);
    assert.deepStrictEqual(
      TOML.parse(readFileSync(outputPath, 'utf8')),
      {
        model: 'gpt-5.4',
        features: {
          runtime_metrics: true
        }
      }
    );
  });
});

test('publish-sync CLI drops managed keys that are missing locally', () => {
  withTempDir((tempDir) => {
    const localPath = join(tempDir, 'local.toml');
    const managedPath = join(tempDir, 'managed.toml');
    const outputPath = join(tempDir, 'output.toml');

    writeFileSync(
      localPath,
      [
        'model = "gpt-5.4"',
        'model_reasoning_effort = "medium"',
        '',
        '[features]',
        'runtime_metrics = true',
        '',
        '[notice]',
        'hide_full_access_warning = true',
        '',
        '[notice.model_migrations]',
        '"gpt-5.1-codex-max" = "gpt-5.3-codex"',
        '',
        '[windows]',
        'sandbox = "elevated"',
        ''
      ].join('\n'),
      'utf8'
    );

    writeFileSync(
      managedPath,
      [
        'model = "gpt-5.3-codex"',
        'model_reasoning_effort = "high"',
        '',
        '[features]',
        'runtime_metrics = false',
        '',
        '[notice]',
        'hide_full_access_warning = false',
        '',
        '[notice.model_migrations]',
        '"gpt-5.1-codex-max" = "gpt-5.3-codex"',
        '',
        '[sandbox_workspace_write]',
        'network_access = true',
        ''
      ].join('\n'),
      'utf8'
    );

    const result = spawnSync(
      process.execPath,
      [
        'tools/config-toml-ops.cjs',
        'publish-sync',
        '--local',
        localPath,
        '--managed',
        managedPath,
        '--output',
        outputPath
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8'
      }
    );

    assert.equal(result.status, 0, result.stderr);
    assert.deepStrictEqual(
      TOML.parse(readFileSync(outputPath, 'utf8')),
      {
        features: {
          runtime_metrics: true
        },
        notice: {
          hide_full_access_warning: true
        }
      }
    );
  });
});

test('publish-sync always excludes model keys and notice.model_migrations when they are in the managed allowlist', () => {
  const localConfig = {
    model: 'gpt-5.4',
    model_reasoning_effort: 'medium',
    service_tier: 'fast',
    notice: {
      hide_full_access_warning: true,
      model_migrations: {
        'gpt-5.1-codex-max': 'gpt-5.3-codex'
      }
    },
    windows: {
      sandbox: 'elevated'
    }
  };

  const managedConfig = {
    model: 'gpt-5.3-codex',
    model_reasoning_effort: 'high',
    service_tier: 'default',
    notice: {
      hide_full_access_warning: false,
      model_migrations: {
        'gpt-5.1-codex-max': 'gpt-5.3-codex'
      }
    },
    windows: {
      sandbox: 'workspace-write'
    }
  };

  assert.deepStrictEqual(
    buildPublishedSyncConfig(localConfig, managedConfig),
    {
      service_tier: 'fast',
      notice: {
        hide_full_access_warning: true
      },
      windows: {
        sandbox: 'elevated'
      }
    }
  );
});

test('CLI returns a non-zero exit code for invalid TOML input', () => {
  withTempDir((tempDir) => {
    const sourcePath = join(tempDir, 'source.toml');
    const targetPath = join(tempDir, 'target.toml');
    const outputPath = join(tempDir, 'output.toml');

    writeFileSync(sourcePath, 'model = \n', 'utf8');
    writeFileSync(targetPath, 'model = "gpt-5.4"\n', 'utf8');

    const result = spawnSync(
      process.execPath,
      [
        'tools/config-toml-ops.cjs',
        'merge-install',
        '--source',
        sourcePath,
        '--target',
        targetPath,
        '--output',
        outputPath
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8'
      }
    );

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Failed to parse TOML/);
  });
});
