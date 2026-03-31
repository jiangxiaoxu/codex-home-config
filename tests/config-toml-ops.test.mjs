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
  buildPublishedSyncConfig,
  orderTopLevelKeys
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

test('merge-install always removes the local agents table from the installed result', () => {
  const sourceConfig = {
    features: {
      runtime_metrics: true
    }
  };

  const targetConfig = {
    agents: {
      reviewer: {
        model: 'gpt-5.4'
      }
    },
    windows: {
      sandbox: 'elevated'
    }
  };

  assert.deepStrictEqual(
    buildMergeInstallConfig(sourceConfig, targetConfig),
    {
      features: {
        runtime_metrics: true
      },
      windows: {
        sandbox: 'elevated'
      }
    }
  );
});

test('merge-install preserves local service_tier and plan_mode_reasoning_effort when the managed snapshot defines them', () => {
  const sourceConfig = {
    model: 'gpt-5.4',
    model_reasoning_effort: 'high',
    service_tier: 'default',
    plan_mode_reasoning_effort: 'xhigh',
    features: {
      runtime_metrics: true
    }
  };

  const targetConfig = {
    model: 'gpt-5.3-codex',
    model_reasoning_effort: 'medium',
    service_tier: 'fast',
    plan_mode_reasoning_effort: 'low',
    windows: {
      sandbox: 'elevated'
    }
  };

  assert.deepStrictEqual(
    buildMergeInstallConfig(sourceConfig, targetConfig),
    {
      model: 'gpt-5.4',
      model_reasoning_effort: 'high',
      features: {
        runtime_metrics: true
      },
      service_tier: 'fast',
      plan_mode_reasoning_effort: 'low',
      windows: {
        sandbox: 'elevated'
      }
    }
  );
});

test('merge-install syncs managed mcp servers by server name and preserves unmanaged local servers', () => {
  const sourceConfig = {
    mcp_servers: {
      lm_tools_bridge: {
        command: 'powershell.exe',
        args: [
          '-NoProfile',
          '-Command',
          'node "managed.js"'
        ],
        tool_timeout_sec: 120
      },
      openaiDeveloperDocs: {
        url: 'https://developers.openai.com/mcp'
      }
    }
  };

  const targetConfig = {
    mcp_servers: {
      lm_tools_bridge: {
        command: 'pwsh.exe',
        args: [
          '-NoProfile',
          '-Command',
          'node "local.js"'
        ],
        tool_timeout_sec: 30
      },
      custom_local: {
        url: 'https://localhost:4000/mcp'
      }
    }
  };

  assert.deepStrictEqual(
    buildMergeInstallConfig(sourceConfig, targetConfig),
    {
      mcp_servers: {
        lm_tools_bridge: {
          command: 'powershell.exe',
          args: [
            '-NoProfile',
            '-Command',
            'node "managed.js"'
          ],
          tool_timeout_sec: 120
        },
        openaiDeveloperDocs: {
          url: 'https://developers.openai.com/mcp'
        },
        custom_local: {
          url: 'https://localhost:4000/mcp'
        }
      }
    }
  );
});

test('publish-sync only emits managed allowlist keys and skips projects plus notice.model_migrations', () => {
  const localConfig = {
    model: 'gpt-5.4',
    model_reasoning_effort: 'medium',
    service_tier: 'fast',
    plan_mode_reasoning_effort: 'low',
    agents: {
      reviewer: {
        model: 'gpt-5.4'
      }
    },
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
    service_tier: 'default',
    plan_mode_reasoning_effort: 'xhigh',
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

test('orderTopLevelKeys always places model keys before other top-level entries', () => {
  assert.deepStrictEqual(
    Object.keys(orderTopLevelKeys({
      features: {
        runtime_metrics: true
      },
      model_reasoning_effort: 'medium',
      notice: {
        hide_full_access_warning: true
      },
      model: 'gpt-5.4'
    })),
    [
      'model',
      'model_reasoning_effort',
      'features',
      'notice'
    ]
  );
});

test('publish-sync only emits managed mcp servers by server name', () => {
  const localConfig = {
    mcp_servers: {
      lm_tools_bridge: {
        command: 'powershell.exe',
        args: [
          '-NoProfile',
          '-Command',
          'node "local.js"'
        ]
      },
      custom_local: {
        url: 'https://localhost:4000/mcp'
      }
    }
  };

  const managedConfig = {
    mcp_servers: {
      lm_tools_bridge: {
        command: 'powershell.exe',
        args: [
          '-NoProfile',
          '-Command',
          'node "managed.js"'
        ]
      },
      openaiDeveloperDocs: {
        url: 'https://developers.openai.com/mcp'
      }
    }
  };

  assert.deepStrictEqual(
    buildPublishedSyncConfig(localConfig, managedConfig),
    {
      mcp_servers: {
        lm_tools_bridge: {
          command: 'powershell.exe',
          args: [
            '-NoProfile',
            '-Command',
            'node "local.js"'
          ]
        }
      }
    }
  );
});

test('merge-install CLI writes model keys at the top of the output file', () => {
  withTempDir((tempDir) => {
    const sourcePath = join(tempDir, 'source.toml');
    const targetPath = join(tempDir, 'target.toml');
    const outputPath = join(tempDir, 'output.toml');

    writeFileSync(
      sourcePath,
      [
        'approval_policy = "never"',
        '',
        '[features]',
        'runtime_metrics = true',
        ''
      ].join('\n'),
      'utf8'
    );

    writeFileSync(
      targetPath,
      [
        'model = "gpt-5.4"',
        'model_reasoning_effort = "medium"',
        'service_tier = "fast"',
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
    assert.match(
      readFileSync(outputPath, 'utf8'),
      /^model = "gpt-5\.4"\nmodel_reasoning_effort = "medium"\napproval_policy = "never"/
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
    plan_mode_reasoning_effort: 'low',
    agents: {
      reviewer: {
        model: 'gpt-5.4'
      }
    },
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
    agents: {
      reviewer: {
        model: 'gpt-5.3-codex'
      }
    },
    model: 'gpt-5.3-codex',
    model_reasoning_effort: 'high',
    service_tier: 'default',
    plan_mode_reasoning_effort: 'xhigh',
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
